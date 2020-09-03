import { Comparator } from './comparator';
import { Condition } from './utils';
import { MatchConstraintsContainer } from './matching';
import { loadJSON, parseOptions, printComparison } from './cli-utils';
import * as fs from 'fs';
import { excludeContentReplacer } from './comparisons';

const options = parseOptions();

const comparator = new Comparator();

comparator.verbose = options.verbose;
comparator.memoizationEnabled = !options.disableMemoization;
comparator.ignoreCase = options.ignoreCase;

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

let outputStringified;
if (options.excludeContent) {
    outputStringified = JSON.stringify(comparator.comparison, excludeContentReplacer, 2);
} else {
    outputStringified = JSON.stringify(comparator.comparison, null, 2);
}

if (options.write !== '') {
    if (options.verbose) {
        console.log(`Saving compared document to ${options.write}`);
    }
    fs.writeFileSync(options.write, outputStringified);
} else {
    printComparison(comparator.comparison);
}
