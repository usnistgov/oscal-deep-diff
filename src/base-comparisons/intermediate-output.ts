import { ArrayChanged, Change, PropertyChanged, PropertyLeftOnly, PropertyRightOnly } from '../comparisons';
import { TrackedElement } from '../tracked';
import { JSONValue } from '../utils';
import { extractIdentifiers, sortBaseLevelComparison } from './util';

interface ChangeDetails {
    field: string;
    leftValue?: JSONValue;
    rightValue?: JSONValue;
}

interface MoveDetails {
    leftParentIdentifiers?: { [key: string]: string };
    rightParentIdentifiers?: { [key: string]: string };
}

export interface BaseLevelComparison {
    leftIdentifiers?: { [key: string]: string };
    rightIdentifiers?: { [key: string]: string };

    status: 'ok' | 'added' | 'withdrawn' | 'changed';

    changes?: ChangeDetails[];

    moveDetails?: MoveDetails;
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

export function PerformBaseLevelComparison(
    comparison: ArrayChanged,
    leftDocument: TrackedElement,
    rightDocument: TrackedElement,
    identfiers = ['id', 'title'],
): BaseLevelComparison[] {
    if (!(comparison instanceof ArrayChanged)) {
        throw new Error('Malformed base-level comparison');
    }

    const blc: BaseLevelComparison[] = [
        ...comparison.leftOnly.map((leftOnly) => {
            return {
                leftIdentifiers: extractIdentifiers(leftDocument.resolve(leftOnly.leftPointer), identfiers),
                status: 'withdrawn',
            } as BaseLevelComparison;
        }),
        ...comparison.rightOnly.map((rightOnly) => {
            return {
                rightIdentifiers: extractIdentifiers(rightDocument.resolve(rightOnly.rightPointer), identfiers),
                status: 'added',
            } as BaseLevelComparison;
        }),
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
                leftParentIdentifiers: extractIdentifiers(leftParent, identfiers),
                rightParentIdentifiers: extractIdentifiers(rightParent, identfiers),
            };

            return {
                leftIdentifiers: extractIdentifiers(leftControl, identfiers),
                rightIdentifiers: extractIdentifiers(rightControl, identfiers),
                status: changes.length > 0 ? 'changed' : 'ok',
                changes,
                moveDetails: identfiers.reduce(
                    (flag, identifier) =>
                        flag ||
                        moveDetails.leftParentIdentifiers?.[identifier] !==
                            moveDetails.rightParentIdentifiers?.[identifier],
                    false,
                ),
            } as BaseLevelComparison;
        }),
    ];

    sortBaseLevelComparison(blc);

    return blc;
}
