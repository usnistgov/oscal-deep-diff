import {
    ArrayChanged,
    Change,
    PropertyChanged,
    PropertyLeftOnly,
    PropertyRightOnly,
    SelectionResults,
} from '../comparisons';
import { TrackedElement } from '../tracked';
import { BaseLevelComparison, ChangeDetails } from './intermediate-output';

function padNumericIdentifier(identifier: string, digits = 3) {
    return identifier
        .split(/\W+/)
        .map((piece) => (isNaN(+piece) ? piece : piece.padStart(digits, '0')))
        .join('-');
}

export function sortBaseLevelComparison(comparison: BaseLevelComparison[], primaryIdentifier = 'id'): void {
    comparison.sort((a, b) => {
        // extract id from control comparisons. First right identifiers, then left identifiers
        // (in the case of a withdrawn control)
        const aId = padNumericIdentifier(
            a.rightIdentifiers?.[primaryIdentifier] ?? a.leftIdentifiers?.[primaryIdentifier] ?? '',
        );
        const bId = padNumericIdentifier(
            b.rightIdentifiers?.[primaryIdentifier] ?? b.leftIdentifiers?.[primaryIdentifier] ?? '',
        );

        return aId > bId ? 1 : aId < bId ? -1 : 0;
    });
}

export function extractIdentifiers(element: TrackedElement, identfiers: string[]): { [key: string]: string } {
    return identfiers.reduce((obj, identifier) => {
        obj[identifier] = element.resolve(identifier).raw?.toString() ?? '';
        return obj;
    }, {} as { [key: string]: string });
}

export function flattenControlChanges(
    change: Change,
    detailsList: ChangeDetails[],
    leftParent: TrackedElement,
    rightParent: TrackedElement,
): void {
    if (change instanceof ArrayChanged || change instanceof SelectionResults) {
        change.leftOnly.forEach((leftOnly) => {
            const field = leftOnly.leftPointer.slice(leftParent.pointer.length + 1);
            detailsList.push({
                field,
                resolvedField: resolvePointerIndices(field, leftParent),
                leftValue: leftOnly.leftElement,
            });
        });

        change.rightOnly.forEach((rightOnly) => {
            const field = rightOnly.rightPointer.slice(rightParent.pointer.length + 1);
            detailsList.push({
                field,
                resolvedField: resolvePointerIndices(field, rightParent),
                rightValue: rightOnly.rightElement,
            });
        });

        change.subChanges.forEach((subChange) =>
            subChange.changes.forEach((subChangeChanges) =>
                flattenControlChanges(subChangeChanges, detailsList, leftParent, rightParent),
            ),
        );
    } else {
        const field =
            change instanceof PropertyLeftOnly
                ? change.leftPointer.slice(leftParent.pointer.length + 1)
                : change.rightPointer.slice(rightParent.pointer.length + 1);
        const changeOutput: ChangeDetails = {
            field,
            resolvedField: resolvePointerIndices(field, change instanceof PropertyLeftOnly ? leftParent : rightParent),
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

export function resolvePointerIndices(pointer: string, cursor: TrackedElement, identifier = 'id'): string {
    return pointer
        .split('/')
        .map((piece) => {
            cursor = cursor.resolve(piece);
            if (isNaN(+piece)) {
                return piece;
            } else {
                try {
                    return cursor.resolve(identifier).raw;
                } catch {
                    return piece;
                }
            }
        })
        .join('/');
}
