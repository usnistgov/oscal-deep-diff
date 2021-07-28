import * as ExcelJS from 'exceljs';
import { ControlLevelComparison } from './control-level-comparison';

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

function identifierColumnsForComparison(change: ControlLevelComparison, identifiers: string[]) {
    return identifiers.flatMap((identifier) => [
        change.leftIdentifiers?.[identifier] ?? '',
        change.rightIdentifiers?.[identifier] ?? '',
    ]);
}

function generateClcOverview(changes: ControlLevelComparison[], workbook: ExcelJS.Workbook, identifiers: string[]) {
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
        columns: [...defineIdentifierColumns(identifiers), { name: 'Status', filterButton: true }],
        rows: changes.map((change) => [...identifierColumnsForComparison(change, identifiers), change.status]),
    });

    autosizeColumns(worksheet);
}

function clipText(input: string, maxLength = 32000): string {
    return input.length > maxLength ? input.substring(0, maxLength - 3) + '...' : input;
}

function generateClcDetails(changes: ControlLevelComparison[], workbook: ExcelJS.Workbook, identifiers: string[]) {
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
                            subChange.leftValue ? clipText(JSON.stringify(subChange.leftValue)) : '',
                            subChange.rightValue ? clipText(JSON.stringify(subChange.rightValue)) : '',
                        ]) ?? [],
                    ),
                Array<Array<string>>(),
            ),
    });

    autosizeColumns(worksheet);
}

export function generateClcSpreadsheet(
    changes: ControlLevelComparison[],
    outputPath: string,
    identifiers: string[] = ['id', 'title'],
): void {
    const workbook = new ExcelJS.Workbook();

    generateClcOverview(changes, workbook, identifiers);
    generateClcDetails(changes, workbook, identifiers);

    workbook.xlsx.writeFile(outputPath);
}
