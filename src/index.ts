import { Command } from 'commander';
import { Comparator } from './comparator';

interface CLIOptions {
    oldCatalog: string;
    newCatalog: string;
    constraints: string;
    write: string;
    verbose: boolean;
}

const rawOptions = new Command()
    .version('0.0.1')
    .description('Deep Differencing of OSCAL catalogs')
    .usage('[options]')
    .requiredOption('-o, --oldCatalog <filename>', 'Old document to compare (in JSON representation)', '')
    .requiredOption('-n, --newCatalog <filename>', 'New document to compare (in JSON representation)', '')
    .option('-c, --constraints <filename>', 'Specify a constraints file to read from', '')
    .option('-w, --write <filename>', 'File to output difference document to', '')
    .option('-v, --verbose', 'Print more output', false)
    .parse(process.argv);
// specially cast rawOptions object to CLIOptions interface (force typing)
const options: CLIOptions = rawOptions as unknown as CLIOptions;

const comparator = new Comparator();
comparator.verbose = options.verbose;
comparator.newComparisonFromDisk(options.oldCatalog, options.newCatalog);

if (options.write !== '') {
    comparator.saveComparison(options.write);
}