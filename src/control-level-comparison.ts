import { ArrayChanged, Change, PropertyChanged, PropertyLeftOnly, PropertyRightOnly } from './comparisons';
import { TrackedElement } from './tracked';
import { JSONValue } from './utils';

interface ChangeDetails {
    field: string;
    leftValue?: JSONValue;
    rightValue?: JSONValue;
}

interface MoveDetails {
    leftParentIdentifiers?: { [key: string]: string };
    rightParentIdentifiers?: { [key: string]: string };
}

interface ControlLevelComparison {
    leftIdentifiers?: { [key: string]: string };
    rightIdentifiers?: { [key: string]: string };

    status: 'ok' | 'added' | 'withdrawn' | 'changed';

    changes?: ChangeDetails[];

    moveDetails?: MoveDetails;
}

function sortControlLevelComparison(comparison: ControlLevelComparison[], primaryIdentifier = 'id') {
    comparison.sort((a, b) => {
        // extract id from control comparisons. First right identifiers, then left identifiers
        // (in the case of a withdrawn control)
        const aId = a.rightIdentifiers?.[primaryIdentifier] ?? a.leftIdentifiers?.[primaryIdentifier] ?? '';
        const bId = b.rightIdentifiers?.[primaryIdentifier] ?? b.leftIdentifiers?.[primaryIdentifier] ?? '';

        return aId > bId ? 1 : aId < bId ? -1 : 0;
    });
}

function FlattenControlChanges(
    change: Change,
    detailsList: ChangeDetails[],
    leftParentPointer: string,
    rightParentPointer: string,
): void {
    if (change instanceof ArrayChanged) {
        change.leftOnly.forEach((leftOnly) =>
            detailsList.push({
                field: leftOnly.leftPointer.slice(leftParentPointer.length + 1),
                leftValue: leftOnly.leftElement,
            }),
        );

        change.rightOnly.forEach((rightOnly) =>
            detailsList.push({
                field: rightOnly.rightPointer.slice(rightParentPointer.length + 1),
                rightValue: rightOnly.rightElement,
            }),
        );

        change.subChanges.forEach((subChange) =>
            subChange.changes.forEach((subChangeChanges) =>
                FlattenControlChanges(subChangeChanges, detailsList, leftParentPointer, rightParentPointer),
            ),
        );
    } else {
        const changeOutput: ChangeDetails = {
            field:
                change instanceof PropertyLeftOnly
                    ? change.leftPointer.slice(leftParentPointer.length + 1)
                    : change.rightPointer.slice(rightParentPointer.length + 1),
        };

        if (change instanceof PropertyLeftOnly) {
            changeOutput.leftValue = change.element;
        } else if (change instanceof PropertyRightOnly) {
            changeOutput.rightValue = change.element;
        } else if (change instanceof PropertyChanged) {
            changeOutput.leftValue = change.leftElement;
            changeOutput.rightValue = change.rightElement;
        }
        detailsList.push(changeOutput);
    }
}

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

            const changes: ChangeDetails[] = [];
            subElems.changes.forEach((change) =>
                FlattenControlChanges(change, changes, leftControl.pointer, rightControl.pointer),
            );

            const leftParentSlices = subElems.leftPointer.split('/');
            const leftParent = leftDocument.resolve(leftParentSlices.slice(0, leftParentSlices.length - 2).join('/'));

            const rightParentSlices = subElems.rightPointer.split('/');
            const rightParent = rightDocument.resolve(
                rightParentSlices.slice(0, rightParentSlices.length - 2).join('/'),
            );

            const moveDetails: MoveDetails = {
                leftParentIdentifiers: {
                    id: (leftParent.resolve('id')?.raw as string) ?? undefined,
                    title: (leftParent.resolve('title')?.raw as string) ?? undefined,
                },
                rightParentIdentifiers: {
                    id: (rightParent.resolve('id')?.raw as string) ?? undefined,
                    title: (rightParent.resolve('title')?.raw as string) ?? undefined,
                },
            };

            return {
                leftIdentifiers: {
                    id: leftControl.resolve('id').raw,
                    title: leftControl.resolve('title').raw,
                },
                rightIdentifiers: {
                    id: rightControl.resolve('id').raw,
                    title: rightControl.resolve('title').raw,
                },
                status: changes.length > 0 ? 'changed' : 'ok',
                changes,
                moveDetails:
                    moveDetails.leftParentIdentifiers?.['id'] !== moveDetails.rightParentIdentifiers?.['id'] ||
                    moveDetails.leftParentIdentifiers?.['title'] !== moveDetails.rightParentIdentifiers?.['title']
                        ? moveDetails
                        : undefined,
            } as ControlLevelComparison;
        }),
    );

    sortControlLevelComparison(controlLevelComparisons);

    return controlLevelComparisons;
}
