import { testPointerCondition } from '..';
import {
    ArrayChanged,
    ArraySubElement,
    Change,
    DocumentComparison,
    PropertyChanged,
    PropertyLeftOnly,
    PropertyRightOnly,
    SelectionResults,
} from '../results';
import { TrackedElement, trackRawObject, traverseMatchSelectionPaths } from '../utils/tracked';
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

export interface Selection {
    leftOnly: { leftPointer: string }[];
    rightOnly: { rightPointer: string }[];
    matched: ArraySubElement[];
}

export function buildSelection(comparison: DocumentComparison, condition: string): Selection {
    const selection: Selection = {
        leftOnly: [],
        rightOnly: [],
        matched: [],
    };
    searchComparisonForSelection(comparison.changes, condition, selection);
    return selection;
}

function searchComparisonForSelection(changes: Change[], condition: string, selection: Selection) {
    changes.forEach((change) => {
        if (change instanceof ArrayChanged) {
            change.subChanges.forEach((subChange) => {
                searchComparisonForSelection(subChange.changes, condition, selection);
            });

            const leftMatches: TrackedElement[] = [];
            change.leftOnly.forEach((leftOnly) => {
                const elem = trackRawObject(leftOnly.leftPointer, leftOnly.leftElement);
                traverseMatchSelectionPaths(elem, [condition], leftMatches);
            });
            selection.leftOnly.push(...leftMatches.map((l) => ({ leftPointer: l.pointer })));

            const rightMatches: TrackedElement[] = [];
            change.rightOnly.forEach((rightOnly) => {
                const elem = trackRawObject(rightOnly.rightPointer, rightOnly.rightElement);
                traverseMatchSelectionPaths(elem, [condition], rightMatches);
            });
            selection.rightOnly.push(...rightMatches.map((r) => ({ rightPointer: r.pointer })));

            if (
                testPointerCondition(change.leftPointer, condition) &&
                testPointerCondition(change.rightPointer, condition)
            ) {
                selection.leftOnly.push(...change.leftOnly);
                selection.rightOnly.push(...change.rightOnly);
                selection.matched.push(...change.subChanges);
            }
        }
    });
}
