import computeMunkres from 'munkres-js';
import { Matcher, MatcherContainer } from './matching';
import { countSubElements, JSONObject } from './utils/json';
import { ArraySubElement } from './results';
import { TrackedElement } from './utils/tracked';
import { writeFileSync } from 'fs';

export default class HungarianMatcherContainer implements MatcherContainer {
    scorer?: (l: TrackedElement, r: TrackedElement) => number;

    constructor(scorer?: (l: TrackedElement, r: TrackedElement) => number) {
        if (scorer) {
            this.scorer = scorer;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    generate(_: TrackedElement[], __: TrackedElement[]): Matcher[] {
        return [
            (left, right, compareFunc) => {
                console.time('compute_cost');

                // the most expensive part, score each possible element pair and throw it into a matrix
                let cost: number[][];
                if (this.scorer !== undefined) {
                    cost = left.map((l) => right.map((r) => this.scorer?.(l, r) ?? 0));
                } else {
                    cost = left.map((l) => right.map((r) => compareFunc(l, r)[1]));
                }
                console.timeEnd('compute_cost');

                writeFileSync('vault/cost_output.json', JSON.stringify(cost, null, 2));

                console.time('compute_assignment');
                const rawPairs = computeMunkres(cost);
                console.timeEnd('compute_assignment');
                let unmatchedLeftIndices = [...left.keys()];
                let unmatchedRightIndices = [...right.keys()];

                let totalCost = 0;

                const matches: ArraySubElement[] = [];
                rawPairs.forEach(([lIndex, rIndex]) => {
                    const leftElement = left[lIndex];
                    const rightElement = right[rIndex];

                    const [changes, cost] = compareFunc(leftElement, rightElement);
                    const costPotentialRatio =
                        cost / (countSubElements(leftElement.raw) + countSubElements(rightElement.raw));

                    // todo refine this definition of "costPotentialRatio"
                    if (costPotentialRatio < 0.95) {
                        matches.push({
                            leftPointer: leftElement.pointer,
                            rightPointer: rightElement.pointer,
                            changes: changes,
                        });

                        totalCost += cost;

                        // todo any way to do this more efficiently?
                        unmatchedLeftIndices = unmatchedLeftIndices.filter((index) => index !== lIndex);
                        unmatchedRightIndices = unmatchedRightIndices.filter((index) => index !== rIndex);
                    }
                });

                return [
                    unmatchedLeftIndices.map((lIndex) => {
                        const element = left[lIndex];
                        totalCost += countSubElements(element.raw);
                        return {
                            leftPointer: element.pointer,
                            leftElement: element.raw,
                        };
                    }),
                    unmatchedRightIndices.map((rIndex) => {
                        const element = right[rIndex];
                        totalCost += countSubElements(element.raw);
                        return {
                            rightPointer: element.pointer,
                            rightElement: element.raw,
                        };
                    }),
                    matches,
                    totalCost,
                ];
            },
        ];
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static fromDict(_: JSONObject): MatcherContainer {
        return new HungarianMatcherContainer();
    }
}
