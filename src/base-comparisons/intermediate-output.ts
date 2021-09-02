import { ArrayChanged } from '../comparisons';
import { TrackedElement } from '../utils/tracked';
import { JSONValue } from '../utils/utils';
import { extractIdentifiers, flattenControlChanges, sortBaseLevelComparison } from './util';

export interface ChangeDetails {
    field: string;
    resolvedField: string;
    leftValue?: JSONValue;
    rightValue?: JSONValue;
}

export interface MoveDetails {
    leftParentIdentifiers?: { [key: string]: string };
    rightParentIdentifiers?: { [key: string]: string };
}

export interface BaseLevelComparison {
    leftIdentifiers?: { [key: string]: string };
    rightIdentifiers?: { [key: string]: string };

    status: 'ok' | 'added' | 'removed' | 'changed';

    changes?: ChangeDetails[];

    moveDetails?: MoveDetails;
}

export function performBaseLevelComparison(
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
                status: 'removed',
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
            subElems.changes.forEach((change) => flattenControlChanges(change, changes, leftControl, rightControl));

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
                // include moveDetails if one of the identifiers has changed
                moveDetails: identfiers.reduce(
                    (flag, identifier) =>
                        flag ||
                        moveDetails.leftParentIdentifiers?.[identifier] !==
                            moveDetails.rightParentIdentifiers?.[identifier],
                    false,
                )
                    ? moveDetails
                    : undefined,
            } as BaseLevelComparison;
        }),
    ];

    sortBaseLevelComparison(blc);

    return blc;
}
