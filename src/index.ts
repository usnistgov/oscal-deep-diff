#!/usr/bin/env node
import { Command } from 'commander';
import { Comparator } from './comparator';
import { saveJSON } from './utils';

interface CLIOptions {
    oldCatalog: string;
    newCatalog: string;
    constraints: string;
    write: string;
    verbose: boolean;
}

const rawOptions = new Command();
rawOptions
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

let comparator = new Comparator();

if (options.verbose) {
    console.log('Starting document comparison...');
    console.time('compareDocuments');
}

let changes = comparator.compareDocumentsOnDisk(options.oldCatalog, options.newCatalog);

if (options.verbose) {
    console.timeEnd('compareDocuments');
    console.log('Document comparison finished!');
    console.log(changes);
}

if (options.write !== '') {
    saveJSON(changes, options.write)
}