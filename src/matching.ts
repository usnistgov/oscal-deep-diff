import { TrackedArray, TrackedElement, TrackedObject, TrackedPrimitive } from './utils/tracked';
import { JSONObject, countSubElements, getPropertyIntersection } from './utils/json';
import { ArraySubElement, ComparisonResult, LeftArrayItem, RightArrayItem } from './results';
import stringSimilarity from './utils/string-similarity';
import HungarianMatcherContainer from './hungarian';

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

                let changeCount = 0;

                return [
                    unmatchedLeftIndices.map((leftIndex) => {
                        const item = left[leftIndex];
                        changeCount += countSubElements(item.raw);
                        return {
                            leftPointer: item.pointer,
                            leftElement: item.raw,
                        };
                    }),
                    rightArrayIndices.map((rightIndex) => {
                        const item = right[rightIndex];
                        changeCount += countSubElements(item.raw);
                        return {
                            rightPointer: item.pointer,
                            rightElement: item.raw,
                        };
                    }),
                    matchedIndices.flatMap(([leftIndex, rightIndex]) => {
                        const leftElement = left[leftIndex];
                        const rightElement = right[rightIndex];

                        const [subChanges, subChangeCount] = compareFunc(leftElement, rightElement);
                        changeCount += subChangeCount;

                        return {
                            leftPointer: leftElement.pointer,
                            rightPointer: rightElement.pointer,
                            changes: subChanges,
                        };
                    }),
                    changeCount,
                ];
            },
    );
}

export abstract class MatcherContainer {
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
                    return left.raw.matchProperty === right.raw.matchProperty ? 1 : 0;
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
