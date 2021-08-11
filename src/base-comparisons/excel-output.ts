import * as ExcelJS from 'exceljs';
import { BaseLevelComparison } from './intermediate-output';

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
        text: 'withdrawn',
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

function identifierColumnsForComparison(change: BaseLevelComparison, identifiers: string[]) {
    return identifiers.flatMap((identifier) => [
        change.leftIdentifiers?.[identifier] ?? '',
        change.rightIdentifiers?.[identifier] ?? '',
    ]);
}

function generateBlcOverview(changes: BaseLevelComparison[], workbook: ExcelJS.Workbook, identifiers: string[]) {
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

    // colors for empty identifiers
    worksheet.addConditionalFormatting({
        ref: `A2:D${worksheet.rowCount}`,
        rules: CFR_EMPTY_FIELD,
    });

    // colors for status category
    worksheet.addConditionalFormatting({
        ref: `E2:E${worksheet.rowCount}`,
        rules: CFR_CHANGE_STATUS,
    });

    // color scale for change size
    worksheet.addConditionalFormatting({
        ref: `F2:F${worksheet.rowCount}`,
        rules: CFR_PERCENTILE_COLORRAMP,
    });

    worksheet.addConditionalFormatting({
        ref: `G2:J${worksheet.rowCount}`,
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

function generateBlcDetails(changes: BaseLevelComparison[], workbook: ExcelJS.Workbook, identifiers: string[]) {
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
                            // status can be added | withdrawn | changed
                            subChange.leftValue ? (subChange.rightValue ? 'changed' : 'withdrawn') : 'added',
                            subChange.leftValue ? clipText(JSON.stringify(subChange.leftValue)) : undefined,
                            subChange.rightValue ? clipText(JSON.stringify(subChange.rightValue)) : undefined,
                        ]) ?? [],
                    ),
                Array<Array<string | undefined>>(),
            ),
    });

    // colors for status category
    worksheet.addConditionalFormatting({
        ref: `F2:F${worksheet.rowCount}`,
        rules: CFR_CHANGE_STATUS,
    });

    // colors for empty values
    worksheet.addConditionalFormatting({
        ref: `G2:H${worksheet.rowCount}`,
        rules: CFR_EMPTY_FIELD,
    });

    autosizeColumns(worksheet);
}

export function generateBlcSpreadsheet(
    changes: BaseLevelComparison[],
    outputPath: string,
    identifiers: string[] = ['id', 'title'],
): void {
    const workbook = new ExcelJS.Workbook();

    generateBlcOverview(changes, workbook, identifiers);
    generateBlcDetails(changes, workbook, identifiers);

    workbook.xlsx.writeFile(outputPath);
}
