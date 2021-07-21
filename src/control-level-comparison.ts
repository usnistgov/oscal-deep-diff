import { ArrayChanged, PropertyChanged, PropertyLeftOnly, PropertyRightOnly } from './comparisons';
import { TrackedElement } from './tracked';

interface ControlLevelComparison {
    leftIdentifiers?: { [key: string]: unknown };
    rightIdentifiers?: { [key: string]: unknown };

    status: 'ok' | 'added' | 'withdrawn' | 'changed';

    changes?: {
        field: string;
        leftValue?: string;
        rightValue?: string;
    }[];

    moveDetails?: {
        leftParentIdentifiers: { [key: string]: unknown };
        rightParentIdentifiers: { [key: string]: unknown };
    };
}

// const exampleControlLevelComparison: ControlLevelComparison = {
//     leftIdentifiers: {
//         id: 'AC-1',
//         title: 'Policy and Procedures',
//     },
//     status: 'changed',
//     changes: [
//         {
//             field: 'title',
//             leftValue: 'Access Control Policy and Procedures',
//             rightValue: 'Policy and Procedures',
//         },
//     ],
// };

export function PerformControlLevelComparison(
    comparison: ArrayChanged,
    leftDocument: TrackedElement,
    rightDocument: TrackedElement,
): ControlLevelComparison[] {
    if (!(comparison instanceof ArrayChanged)) {
        throw new Error('Malformed base-level comparison');
    }

    const controlLevelComparisons: ControlLevelComparison[] = [];

    controlLevelComparisons.push(
        ...comparison.leftOnly.map((leftOnly) => {
            const control = leftDocument.resolve(leftOnly.leftPointer);

            return {
                leftIdentifiers: {
                    id: control.resolve('id').raw,
                    title: control.resolve('title').raw,
                },
                status: 'withdrawn',
            } as ControlLevelComparison;
        }),
    );

    controlLevelComparisons.push(
        ...comparison.rightOnly.map((rightOnly) => {
            const control = rightDocument.resolve(rightOnly.rightPointer);

            return {
                rightIdentifiers: {
                    id: control.resolve('id').raw,
                    title: control.resolve('title').raw,
                },
                status: 'added',
            } as ControlLevelComparison;
        }),
    );

    controlLevelComparisons.push(
        ...comparison.subChanges.map((subElems) => {
            const leftControl = leftDocument.resolve(subElems.leftPointer);
            const rightControl = rightDocument.resolve(subElems.rightPointer);

            return {
                leftIdentifiers: {
                    id: leftControl.resolve('id').raw,
                    title: leftControl.resolve('title').raw,
                },
                rightIdentifiers: {
                    id: rightControl.resolve('id').raw,
                    title: rightControl.resolve('title').raw,
                },
                status: subElems.changes.length > 0 ? 'changed' : 'ok',
                changes: subElems.changes.map((change) => {
                    if (change instanceof PropertyLeftOnly) {
                        return {
                            field: change.leftPointer,
                            leftValue: change.element,
                        };
                    } else if (change instanceof PropertyRightOnly) {
                        return {
                            field: change.rightPointer,
                            rightValue: change.element,
                        };
                    } else if (change instanceof PropertyChanged) {
                        return {
                            field: change.rightPointer,
                            leftValue: change.leftElement,
                            rightValue: change.rightElement,
                        };
                    } else {
                        return {
                            field: change.leftPointer,
                        };
                    }
                }),
            } as ControlLevelComparison;
        }),
    );

    return controlLevelComparisons;
}
