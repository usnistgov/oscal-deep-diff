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
import * as ExcelJS from 'exceljs';
import { IntermediateOutput } from './intermediate-output';

const COLOR_GREEN = { argb: 'FF63BE7B' };
const COLOR_YELLOW = { argb: 'FFFFEB84' };
const COLOR_RED = { argb: 'FFF8696B' };
const COLOR_WHITE = { argb: 'FFFFFFFF' };
const COLOR_BLACK = { argb: 'FF000000' };

const CFR_PERCENTILE_COLORRAMP: ExcelJS.ConditionalFormattingRule[] = [
    {
        type: 'colorScale',
        priority: 1,
        cfvo: [{ type: 'min' }, { type: 'percentile', value: 50 }, { type: 'max' }],
        color: [COLOR_GREEN, COLOR_YELLOW, COLOR_RED],
    },
    {
        type: 'containsText',
        priority: 2,
        operator: 'containsBlanks',
        style: {
            fill: { type: 'pattern', pattern: 'solid', bgColor: COLOR_BLACK },
        },
    },
];

const CFR_CHANGE_STATUS: ExcelJS.ConditionalFormattingRule[] = [
    {
        type: 'containsText',
        priority: 3,
        operator: 'containsText',
        text: 'ok',
        style: {
            fill: { type: 'pattern', pattern: 'solid', bgColor: COLOR_WHITE },
        },
    },
    {
        type: 'containsText',
        priority: 4,
        operator: 'containsText',
        text: 'changed',
        style: {
            fill: { type: 'pattern', pattern: 'solid', bgColor: COLOR_YELLOW },
        },
    },
    {
        type: 'containsText',
        priority: 5,
        operator: 'containsText',
        text: 'added',
        style: {
            fill: { type: 'pattern', pattern: 'solid', bgColor: COLOR_GREEN },
        },
    },
    {
        type: 'containsText',
        priority: 6,
        operator: 'containsText',
        text: 'removed',
        style: {
            fill: { type: 'pattern', pattern: 'solid', bgColor: COLOR_RED },
        },
    },
];

const CFR_EMPTY_FIELD: ExcelJS.ConditionalFormattingRule[] = [
    {
        type: 'containsText',
        priority: 7,
        operator: 'containsBlanks',
        style: {
            fill: { type: 'pattern', pattern: 'solid', bgColor: COLOR_RED },
        },
    },
];

const CFR_NONEMPTY_FIELD: ExcelJS.ConditionalFormattingRule[] = [
    {
        type: 'containsText',
        priority: 7,
        operator: 'notContainsBlanks',
        style: {
            fill: { type: 'pattern', pattern: 'solid', bgColor: COLOR_YELLOW },
        },
    },
];

function excelCol(index: number) {
    let column = '';
    while (index > 26) {
        column += 'Z';
        index -= 26;
    }
    return column + String.fromCharCode(65 + index);
}

function autosizeColumns(worksheet: ExcelJS.Worksheet, maxLength = 100, minLength = 10) {
    worksheet.columns.forEach((column) => {
        let largestLength = 0;
        column.eachCell?.({ includeEmpty: true }, (cell) => {
            const length = cell.value?.toString().length ?? minLength;
            if (length > largestLength) {
                largestLength = length;
            }
        });
        column.width = largestLength > minLength ? (largestLength < maxLength ? largestLength : maxLength) : minLength;
    });
}

function defineIdentifierColumns(identifiers: string[]): ExcelJS.TableColumnProperties[] {
    return identifiers.flatMap((identifier) => [
        { name: `Left ${identifier}`, filterButton: true },
        { name: `Right ${identifier}`, filterButton: true },
    ]);
}

function identifierColumnsForComparison(change: IntermediateOutput, identifiers: string[]) {
    return identifiers.flatMap((identifier) => [
        change.leftIdentifiers?.[identifier] ?? '',
        change.rightIdentifiers?.[identifier] ?? '',
    ]);
}

function generateOverviewSheet(changes: IntermediateOutput[], workbook: ExcelJS.Workbook, identifiers: string[]) {
    const worksheet = workbook.addWorksheet('Overview');

    worksheet.addTable({
        name: 'Overview',
        ref: 'A1',
        headerRow: true,
        totalsRow: false,
        style: {
            theme: 'TableStyleLight1',
            showRowStripes: true,
        },
        columns: [
            ...defineIdentifierColumns(identifiers),
            { name: 'Status', filterButton: true },
            { name: 'Changes', filterButton: true },
            ...identifiers.flatMap((identifier) => [
                { name: `Left Parent ${identifier}`, filterButton: true },
                { name: `Right Parent ${identifier}`, filterButton: false },
            ]),
        ],
        rows: changes.map((change) => [
            ...identifierColumnsForComparison(change, identifiers),
            change.status,
            change.changes?.length,
            ...identifiers.flatMap((identifier) => [
                change.moveDetails?.leftParentIdentifiers?.[identifier],
                change.moveDetails?.rightParentIdentifiers?.[identifier],
            ]),
        ]),
    });

    let columnCursor = identifiers.length * 2 - 1;
    let columnLetter = excelCol(columnCursor);

    // colors for empty identifiers
    worksheet.addConditionalFormatting({
        ref: `A2:${columnLetter}${worksheet.rowCount}`,
        rules: CFR_EMPTY_FIELD,
    });

    columnLetter = excelCol(++columnCursor);

    // colors for status category
    worksheet.addConditionalFormatting({
        ref: `${columnLetter}2:${columnLetter}${worksheet.rowCount}`,
        rules: CFR_CHANGE_STATUS,
    });

    columnLetter = excelCol(++columnCursor);

    // color scale for change size
    worksheet.addConditionalFormatting({
        ref: `${columnLetter}2:${columnLetter}${worksheet.rowCount}`,
        rules: CFR_PERCENTILE_COLORRAMP,
    });

    columnLetter = excelCol(++columnCursor);

    // highlight controls with changed parents (listing all identifiers)
    worksheet.addConditionalFormatting({
        ref: `${columnLetter}2:${excelCol(columnCursor + identifiers.length * 2 - 1)}${worksheet.rowCount}`,
        rules: CFR_NONEMPTY_FIELD,
    });

    autosizeColumns(worksheet);
}

/**
 * Excel gets upset when individual cells exceed ~32,000 characters (I would be too)
 * @param input String to clip
 * @param maxLength Maximum string length
 * @returns Clipped string
 */
function clipText(input: string, maxLength = 32000): string {
    return input.length > maxLength ? input.substring(0, maxLength - 3) + '...' : input;
}

function generateDetailsSheet(changes: IntermediateOutput[], workbook: ExcelJS.Workbook, identifiers: string[]) {
    const worksheet = workbook.addWorksheet('Change Details');

    worksheet.addTable({
        name: 'Change_Details',
        ref: 'A1',
        headerRow: true,
        totalsRow: false,
        style: {
            theme: 'TableStyleLight1',
            showRowStripes: true,
        },
        columns: [
            ...defineIdentifierColumns(identifiers),
            { name: 'Field', filterButton: true },
            { name: 'Resolved Field', filterButton: true },
            { name: 'Status', filterButton: true },
            { name: 'Left Value', filterButton: true },
            { name: 'Right Value', filterButton: true },
        ],
        rows: changes
            .filter((change) => change.changes && change.changes.length > 0)
            .reduce(
                (acc, change) =>
                    acc.concat(
                        change.changes?.map((subChange) => [
                            ...identifierColumnsForComparison(change, identifiers),
                            subChange.field ?? '',
                            subChange.resolvedField ?? '',
                            // status can be added | removed | changed
                            subChange.leftValue ? (subChange.rightValue ? 'changed' : 'removed') : 'added',
                            subChange.leftValue ? clipText(JSON.stringify(subChange.leftValue)) : undefined,
                            subChange.rightValue ? clipText(JSON.stringify(subChange.rightValue)) : undefined,
                        ]) ?? [],
                    ),
                Array<Array<string | undefined>>(),
            ),
    });

    // skip identifier columns, as well as field and parametrized field columns
    let columnCursor = identifiers.length * 2 + 2;
    let columnLetter = excelCol(columnCursor);

    // colors for status category
    worksheet.addConditionalFormatting({
        ref: `${columnLetter}2:${columnLetter}${worksheet.rowCount}`,
        rules: CFR_CHANGE_STATUS,
    });

    columnLetter = excelCol(++columnCursor);

    // colors for empty values
    worksheet.addConditionalFormatting({
        ref: `${columnLetter}2:${excelCol(columnCursor + 1)}${worksheet.rowCount}`,
        rules: CFR_EMPTY_FIELD,
    });

    autosizeColumns(worksheet);
}

export function generateOutputSpreadsheet(
    changes: IntermediateOutput[],
    outputPath: string,
    identifiers: string[] = ['id', 'title'],
): void {
    const workbook = new ExcelJS.Workbook();

    generateOverviewSheet(changes, workbook, identifiers);
    generateDetailsSheet(changes, workbook, identifiers);

    workbook.xlsx.writeFile(outputPath);
}
