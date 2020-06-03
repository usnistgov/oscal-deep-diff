#!/usr/bin/env node

import program from 'commander';
import { Comparator } from './comparator';
import { saveJSON } from './utils';

let oldCatalog: string = "", newCatalog: string = "";

program
    .version('0.0.1')
    .description('Deep Differencing of OSCAL catalogs')
    .arguments('<oldCat> <newCat>')
    .action((oldCat: string, newCat: string) => {
        oldCatalog = oldCat
        newCatalog = newCat
    })
    .option('-c', '--constraints <filename>', 'specify a constraints file to read from')
    .option('-w', '--write <filename>', 'file to write to')
    .option('-s', '--silent', 'do not print difference output')
    .parse(process.argv);

if (program.silent && program.write != undefined) {
    console.warn('silent flag without a write path will do nothing');
}

let comparator = new Comparator();
let changes = comparator.compareDocuments(oldCatalog, newCatalog);

if (!program.silent) {
    console.log(changes);
}

if (program.write !== undefined && program.write !== "") {
    saveJSON(changes, program.write);
}