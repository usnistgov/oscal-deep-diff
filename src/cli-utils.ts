import * as fs from 'fs';
import { Command } from 'commander';

export function loadJSON(documentPath: string): object {
    // TODO: support URL paths?
    const rawDocument = fs.readFileSync(documentPath);
    return JSON.parse(rawDocument.toString());
}

// object that rawOptions is marshalled into
interface CLIOptions {
    leftCatalog: string;
    rightCatalog: string;
    constraints: string;
    ignore: string;
    write: string;
    disableMemoization: boolean;
    excludeContent: boolean;
    verbose: boolean;
}

export function parseOptions(): CLIOptions {
    const rawOptions = new Command()
        .version('0.0.1')
        .description('Deep Differencing of OSCAL catalogs')
        .usage('[options]')
        .requiredOption('-l, --leftCatalog <filename>', 'Left (old) document to compare (in JSON representation)')
        .requiredOption('-r, --rightCatalog <filename>', 'Right (new) document to compare (in JSON representation)')
        .option('-c, --constraints <filename>', 'Specify a constraints file to read from', '')
        .option(
            '-i, --ignore [patterns]',
            "Specify patterns of pointers that should be ignored (ex. 'id' or '**/back-matter'",
            '',
        )
        .option('-w, --write <filename>', 'File to output difference document to', '')
        .option('--disableMemoization', 'Disable the caching of array object (only use in low-memory scenarios)', false)
        .option('--excludeContent', 'Exclude "leftElement" and "rightElement" objects, reducing comparison size', false)
        .option('-v, --verbose', 'Print more output', false)
        .parse(process.argv);
    // specially cast rawOptions object to CLIOptions interface (force typing)
    return (rawOptions as unknown) as CLIOptions;
}
