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
import { TrackedElement } from '../utils/tracked';
import { JSONValue } from '../utils/json';
import {
    extractIdentifiers,
    flattenControlChanges,
    Selection,
    sortBaseLevelComparison as sortIntermediateOutput,
} from './util';

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

export interface IntermediateOutput {
    leftIdentifiers?: { [key: string]: string };
    rightIdentifiers?: { [key: string]: string };

    status: 'ok' | 'added' | 'removed' | 'changed';

    changes?: ChangeDetails[];

    moveDetails?: MoveDetails;
}

export function performIntermediateComparison(
    comparison: Selection,
    leftDocument: TrackedElement,
    rightDocument: TrackedElement,
    identfiers = ['id', 'title'],
): IntermediateOutput[] {
    const res: IntermediateOutput[] = [
        ...comparison.leftOnly.map((leftOnly) => {
            return {
                leftIdentifiers: extractIdentifiers(leftDocument.resolve(leftOnly.leftPointer), identfiers),
                status: 'removed',
            } as IntermediateOutput;
        }),
        ...comparison.rightOnly.map((rightOnly) => {
            return {
                rightIdentifiers: extractIdentifiers(rightDocument.resolve(rightOnly.rightPointer), identfiers),
                status: 'added',
            } as IntermediateOutput;
        }),
        ...comparison.matched.map((subElems) => {
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
            } as IntermediateOutput;
        }),
    ];

    sortIntermediateOutput(res);

    return res;
}
