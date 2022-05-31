/*
 * Portions of this software was developed by employees of the National Institute
 * of Standards and Technology (NIST), an agency of the Federal Government and is
 * being made available as a public service. Pursuant to title 17 United States
 * Code Section 105, works of NIST employees are not subject to copyright
 * protection in the United States. This software may be subject to foreign
 * copyright. Permission in the United States and in foreign countries, to the
 * extent that NIST may hold copyright, to use, copy, modify, create derivative
 * works, and distribute this software and its documentation without fee is hereby
 * granted on a non-exclusive basis, provided that this notice and disclaimer
 * of warranty appears in all copies.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS' WITHOUT ANY WARRANTY OF ANY KIND, EITHER
 * EXPRESSED, IMPLIED, OR STATUTORY, INCLUDING, BUT NOT LIMITED TO, ANY WARRANTY
 * THAT THE SOFTWARE WILL CONFORM TO SPECIFICATIONS, ANY IMPLIED WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND FREEDOM FROM
 * INFRINGEMENT, AND ANY WARRANTY THAT THE DOCUMENTATION WILL CONFORM TO THE
 * SOFTWARE, OR ANY WARRANTY THAT THE SOFTWARE WILL BE ERROR FREE.  IN NO EVENT
 * SHALL NIST BE LIABLE FOR ANY DAMAGES, INCLUDING, BUT NOT LIMITED TO, DIRECT,
 * INDIRECT, SPECIAL OR CONSEQUENTIAL DAMAGES, ARISING OUT OF, RESULTING FROM,
 * OR IN ANY WAY CONNECTED WITH THIS SOFTWARE, WHETHER OR NOT BASED UPON WARRANTY,
 * CONTRACT, TORT, OR OTHERWISE, WHETHER OR NOT INJURY WAS SUSTAINED BY PERSONS OR
 * PROPERTY OR OTHERWISE, AND WHETHER OR NOT LOSS WAS SUSTAINED FROM, OR AROSE OUT
 * OF THE RESULTS OF, OR USE OF, THE SOFTWARE OR SERVICES PROVIDED HEREUNDER.
 */
import { TrackedArray, TrackedElement, TrackedObject, TrackedPrimitive } from './utils/tracked';
import { JSONObject, countSubElements, getPropertyIntersection } from './utils/json';
import { ArraySubElement, ComparisonResult, LeftArrayItem, RightArrayItem } from './results';
import stringSimilarity from './utils/string-similarity';
import { computeWithUnmatchedElements } from './utils/hungarian';

type ComparatorFunc = (left: TrackedElement, right: TrackedElement, shallow?: boolean) => ComparisonResult;
export type MatcherResults = [LeftArrayItem[], RightArrayItem[], ArraySubElement[], number];
export type Matcher = (left: TrackedElement[], right: TrackedElement[], compareFunc: ComparatorFunc) => MatcherResults;
export type MatcherGenerator = (left: TrackedElement[], right: TrackedElement[]) => Matcher[];

export function scoringMatcherFactory(
    scorers: ((left: TrackedElement, right: TrackedElement) => number)[],
    minConfidence = 0.7,
): Matcher[] {
    return scorers.map(
        (scorer) =>
            (left: TrackedElement[], right: TrackedElement[], compareFunc: ComparatorFunc): MatcherResults => {
                const matchedIndices: [number, number][] = [];
                const unmatchedLeftIndices: number[] = [];
                const rightArrayIndices = [...right.keys()];
                left.forEach((leftElement, leftIndex) => {
                    const [topScoreIndex] = rightArrayIndices.reduce(
                        (prev, rightIndex) => {
                            const score = scorer(leftElement, right[rightIndex]);
                            return score > prev[1] && score >= minConfidence ? [rightIndex, score] : prev;
                        },
                        [-1, 0],
                    );
                    if (topScoreIndex === -1) {
                        unmatchedLeftIndices.push(leftIndex);
                    } else {
                        rightArrayIndices.splice(rightArrayIndices.indexOf(topScoreIndex), 1);
                        matchedIndices.push([leftIndex, topScoreIndex]);
                    }
                });

                let totalScore = 0;

                return [
                    unmatchedLeftIndices.map((leftIndex) => {
                        const item = left[leftIndex];
                        totalScore += countSubElements(item.raw);
                        return {
                            leftPointer: item.pointer,
                            leftElement: item.raw,
                        };
                    }),
                    rightArrayIndices.map((rightIndex) => {
                        const item = right[rightIndex];
                        totalScore += countSubElements(item.raw);
                        return {
                            rightPointer: item.pointer,
                            rightElement: item.raw,
                        };
                    }),
                    matchedIndices.flatMap(([leftIndex, rightIndex]) => {
                        const leftElement = left[leftIndex];
                        const rightElement = right[rightIndex];

                        const [changes, score] = compareFunc(leftElement, rightElement);
                        totalScore += score;

                        return {
                            leftPointer: leftElement.pointer,
                            rightPointer: rightElement.pointer,
                            changes,
                            score,
                        };
                    }),
                    totalScore,
                ];
            },
    );
}

export default abstract class MatcherContainer {
    abstract generate(left: TrackedElement[], right: TrackedElement[]): Matcher[];

    public static fromDict(dict: JSONObject): MatcherContainer {
        if ('type' in dict && typeof dict.type === 'string') {
            switch (dict.type) {
                case ObjectPropertyMatcherContainer.name:
                    return ObjectPropertyMatcherContainer.fromDict(dict);
                case OptimalMatcherContainer.name:
                    return OptimalMatcherContainer.fromDict(dict);
                case HungarianMatcherContainer.name:
                    return HungarianMatcherContainer.fromDict(dict);
                default:
                    throw new Error('Error deserializing matcher container: unknown type');
            }
        }
        throw new Error('Error deserializing matcher container: type must be sepecified');
    }
}

export class ObjectPropertyMatcherContainer implements MatcherContainer {
    private property: string;
    private method: string;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    generate(_: TrackedElement[], __: TrackedElement[]): Matcher[] {
        return scoringMatcherFactory([
            (left: TrackedElement, right: TrackedElement) => {
                if (
                    left instanceof TrackedObject &&
                    right instanceof TrackedObject &&
                    this.property in left.raw &&
                    this.property in right.raw
                ) {
                    return left.raw[this.property] === right.raw[this.property] ? 1 : 0;
                }
                return 0;
            },
        ]);
    }

    constructor(property: string, method = 'absolute') {
        this.property = property;
        this.method = method;
    }

    static fromDict(dict: JSONObject): MatcherContainer {
        if ('property' in dict && typeof dict.property === 'string') {
            return new ObjectPropertyMatcherContainer(dict.property);
        }
        throw new Error('Error deserializing ObjectPropertyMatchContainer');
    }
}

export class OptimalMatcherContainer implements MatcherContainer {
    // TODO: add ignore options, options for string-similarity

    generate(left: TrackedElement[], right: TrackedElement[]): Matcher[] {
        if (left.length === 0 || right.length === 0) {
            return [];
        }

        const lSample = left[0];
        const rSample = right[0];
        if (lSample instanceof TrackedArray && rSample instanceof TrackedArray) {
            throw new Error('Array of array comparison is not supported');
        } else if (lSample instanceof TrackedObject && rSample instanceof TrackedObject) {
            return scoringMatcherFactory(
                getPropertyIntersection(lSample.raw, rSample.raw)
                    .map((prop) =>
                        typeof lSample.raw === 'string'
                            ? [
                                  (left: TrackedElement, right: TrackedElement) => {
                                      if (!(left instanceof TrackedObject && right instanceof TrackedObject)) {
                                          throw new Error('Non-homogenous array of items cannot be compared');
                                      }

                                      if (typeof left.raw !== 'string' || typeof right.raw !== 'string') {
                                          throw new Error('Cannot mix string and non string types in comparison');
                                      }

                                      return stringSimilarity(left.raw[prop], right.raw[prop], 'absolute', true);
                                  },
                              ]
                            : [
                                  (left: TrackedElement, right: TrackedElement) => {
                                      if (!(left instanceof TrackedObject && right instanceof TrackedObject)) {
                                          throw new Error('Non-homogenous array of items cannot be compared');
                                      }
                                      return left.raw[prop] === right.raw[prop] ? 1 : 0;
                                  },
                              ],
                    )
                    .flat(),
            );
        } else if (lSample instanceof TrackedPrimitive && rSample instanceof TrackedPrimitive) {
            return scoringMatcherFactory([(left, right) => (left.raw === right.raw ? 1 : 0)]);
        } else {
            throw new Error('Mismatched types are not supported');
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static fromDict(_: JSONObject): MatcherContainer {
        return new OptimalMatcherContainer();
    }
}

export const hungarianMatcher: Matcher = (left, right, compareFunc) => {
    // the most expensive part, score each possible element pair and throw it into a matrix
    const cost = left.map((l) => {
        return right.map((r) => {
            // return compareFunc(l, r)[1];
            return compareFunc(l, r)[1] / (countSubElements(l.raw) + countSubElements(r.raw));
        });
    });

    const lUnmatchedCost = left.map((_) => 1);
    const rUnmatchedCost = right.map((_) => 1);

    // const lUnmatchedCost = left.map((l) => countSubElements(l.raw));
    // const rUnmatchedCost = right.map((r) => countSubElements(r.raw));

    const [matchedPairs, lUnmatched, rUnmatched] = computeWithUnmatchedElements(cost, lUnmatchedCost, rUnmatchedCost);

    let totalCost = 0;

    return [
        lUnmatched.map((lIndex) => {
            const element = left[lIndex];
            // totalCost += lUnmatchedCost[lIndex];
            totalCost += countSubElements(left[lIndex].raw);
            return {
                leftPointer: element.pointer,
                leftElement: element.raw,
            };
        }),
        rUnmatched.map((rIndex) => {
            const element = right[rIndex];
            // totalCost += rUnmatchedCost[rIndex];
            totalCost += countSubElements(right[rIndex].raw);
            return {
                rightPointer: element.pointer,
                rightElement: element.raw,
            };
        }),
        matchedPairs.map(([lIndex, rIndex]) => {
            const leftElement = left[lIndex];
            const rightElement = right[rIndex];

            const [changes, score] = compareFunc(leftElement, rightElement);
            totalCost += score;

            return {
                leftPointer: leftElement.pointer,
                rightPointer: rightElement.pointer,
                changes,
                score,
            };
        }),
        totalCost,
    ];
};

export class HungarianMatcherContainer implements MatcherContainer {
    generate(_: TrackedElement[], __: TrackedElement[]): Matcher[] {
        return [hungarianMatcher];
    }

    static fromDict(_: JSONObject): MatcherContainer {
        return new HungarianMatcherContainer();
    }
}
