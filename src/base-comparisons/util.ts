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
import { testPointerCondition } from '..';
import {
    ArrayChanged,
    ArraySubElement,
    Change,
    DocumentComparison,
    PropertyChanged,
    PropertyLeftOnly,
    PropertyRightOnly,
} from '../results';
import { TrackedElement, trackRawObject, traverseMatchSelectionPaths } from '../utils/tracked';
import { IntermediateOutput, ChangeDetails } from './intermediate-output';

function padNumericIdentifier(identifier: string, digits = 3) {
    return identifier
        .split(/\W+/)
        .map((piece) => (isNaN(+piece) ? piece : piece.padStart(digits, '0')))
        .join('-');
}

export function sortBaseLevelComparison(comparison: IntermediateOutput[], primaryIdentifier = 'id'): void {
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
    if (change instanceof ArrayChanged) {
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
                traverseMatchSelectionPaths(elem, [condition + '/#'], leftMatches);
            });
            selection.leftOnly.push(...leftMatches.map((l) => ({ leftPointer: l.pointer })));

            const rightMatches: TrackedElement[] = [];
            change.rightOnly.forEach((rightOnly) => {
                const elem = trackRawObject(rightOnly.rightPointer, rightOnly.rightElement);
                traverseMatchSelectionPaths(elem, [condition + '/#'], rightMatches);
            });
            selection.rightOnly.push(...rightMatches.map((r) => ({ rightPointer: r.pointer })));

            change.outOfTreeChanges.forEach((ootChange) => {
                searchComparisonForSelection(ootChange.changes, condition, selection);
            });

            if (
                testPointerCondition(change.leftPointer, condition) &&
                testPointerCondition(change.rightPointer, condition)
            ) {
                selection.matched.push(...change.subChanges);
            }
        }
    });
}
