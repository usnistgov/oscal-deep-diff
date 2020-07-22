import { Command } from 'commander';
import { Comparator } from './comparator';
import { Condition } from './utils';

interface CLIOptions {
    leftCatalog: string;
    rightCatalog: string;
    constraints: string;
    ignore: string;
    write: string;
    disableMemoization: boolean;
    verbose: boolean;
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

const comparator = new Comparator(options.constraints);
comparator.verbose = options.verbose;
comparator.memoizationEnabled = !options.disableMemoization;

if (options.ignore !== '') {
    // parse ignore constraints (commander veriadic options leads to unstable results)
    const ignoreConditions: Condition[] = options.ignore.split(',');
    comparator.ignoreConditions = ignoreConditions;
}

comparator.newComparisonFromDisk(options.leftCatalog, options.rightCatalog);

if (options.write !== '') {
    comparator.saveComparison(options.write);
}
