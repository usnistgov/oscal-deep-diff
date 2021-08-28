import { TrackedElement, countSubElements } from '.';
import { ArraySubElement, ComparisonResult, LeftArrayItem, RightArrayItem } from './comparisons';
// import { compare } from './refactor';

type ComparatorFunc = (left: TrackedElement, right: TrackedElement) => ComparisonResult;
export type MatcherResults = [LeftArrayItem[], RightArrayItem[], ArraySubElement[], number];
export type Matcher = (left: TrackedElement[], right: TrackedElement[], compareFunc: ComparatorFunc) => MatcherResults;
export type MatcherGenerator = (left: TrackedElement[], right: TrackedElement[]) => Matcher[];

export function scoringMatcherFactory(
    scorers: ((left: TrackedElement, right: TrackedElement) => number)[],
    minConfidence = 1,
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
                            return score > prev[1] && score > minConfidence ? [rightIndex, score] : prev;
                        },
                        [-1, 0],
                    );
                    if (topScoreIndex === -1) {
                        unmatchedLeftIndices.push(leftIndex);
                    } else {
                        rightArrayIndices.splice(rightArrayIndices.indexOf(topScoreIndex));
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
