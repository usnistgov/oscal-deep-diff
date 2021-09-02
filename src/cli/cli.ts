import * as fs from 'fs';
import { parseOptions } from './cli-utils';
import Comparator from '../comparator';
import { toJSON } from 'yaml/util';

const options = parseOptions();

const comparator = new Comparator();

const leftDoc = JSON.parse(fs.readFileSync(options.leftDoc).toString());
const rightDoc = JSON.parse(fs.readFileSync(options.rightDoc).toString());

const comparison = comparator.compare(leftDoc, options.leftDoc, rightDoc, options.rightDoc);

console.log(`Saving compared document to ${options.write}`);
fs.writeFileSync(options.write, toJSON(comparison));

// if (options.controlLevelComparison) {
//     if (!(comparator.comparison.changes.length === 1 && comparator.comparison.changes[0] instanceof ArrayChanged)) {
//         throw new Error('ControlLevelComparison can only be used with a baseLevelComparison');
//     }

//     const data = performBaseLevelComparison(
//         comparator.comparison.changes[0],
//         trackRawObject('', leftDoc),
//         trackRawObject('', rightDoc),
//     );

//     fs.writeFileSync(options.write + '.clc.json', JSON.stringify(data, null, 2));

//     generateBlcSpreadsheet(data, options.write + '.clc.xlsx');
// }
