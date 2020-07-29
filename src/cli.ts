import { Command } from 'commander';
import { Comparator } from './comparator';
import { Condition } from './utils';
import { MatchConstraintsContainer } from './matching';
import * as fs from 'fs';

interface CLIOptions {
    leftCatalog: string;
    rightCatalog: string;
    constraints: string;
    ignore: string;
    write: string;
    disableMemoization: boolean;
    verbose: boolean;
}

export function loadJSON(documentPath: string): object {
    // TODO: support URL paths?
    const rawDocument = fs.readFileSync(documentPath);
    return JSON.parse(rawDocument.toString());
}

export function saveJSON(obj: any, outputPath: string) {
    // save pretty printed json
    fs.writeFileSync(outputPath, JSON.stringify(obj, null, 2));
}

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
    .option('-v, --verbose', 'Print more output', false)
    .parse(process.argv);
// specially cast rawOptions object to CLIOptions interface (force typing)
const options: CLIOptions = (rawOptions as unknown) as CLIOptions;


const comparator = new Comparator();

comparator.verbose = options.verbose;
comparator.memoizationEnabled = !options.disableMemoization;

if (options.ignore !== '') {
    // parse ignore constraints (commander veriadic options leads to unstable results)
    const ignoreConditions: Condition[] = options.ignore.split(',');
    comparator.ignoreConditions = ignoreConditions;
}

if (options.constraints !== '') {
    // load constraints file and parse
    const constraintsJSON = loadJSON(options.constraints);
    const constraints = MatchConstraintsContainer.fromJson(constraintsJSON);
    comparator.constraints = constraints;
}

const leftDoc = loadJSON(options.leftCatalog);
const rightDoc = loadJSON(options.rightCatalog);

comparator.newComparison(leftDoc, options.leftCatalog, rightDoc, options.rightCatalog);

if (options.write !== '') {
    if (options.verbose) {
        console.log(`Saving compared document to ${options.write}`);
    }
    saveJSON(comparator.comparison, options.write);
} else {
    // print full output to stdout
    console.log(JSON.stringify(comparator.comparison, null, 4));
}
