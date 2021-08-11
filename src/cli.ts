import * as fs from 'fs';
import YAML from 'yaml';
import { parseOptions } from './cli-utils';
import { Comparator } from './comparator';
import { ArrayChanged } from './comparisons';
import { Config, defaultConfig } from './config';
import { performBaseLevelComparison } from './base-comparisons/intermediate-output';
import { generateBlcSpreadsheet } from './base-comparisons/excel-output';
import { trackRawObject } from './tracked';

const options = parseOptions();

let config = defaultConfig;
if (options.config !== '') {
    const configDict = YAML.parse(fs.readFileSync(options.config).toString());
    config = Config.fromDict(configDict);
}

const comparator = new Comparator(config);

const leftDoc = JSON.parse(fs.readFileSync(options.leftDoc).toString());
const rightDoc = JSON.parse(fs.readFileSync(options.rightDoc).toString());

comparator.newComparison(leftDoc, options.leftDoc, rightDoc, options.rightDoc);

console.log(`Saving compared document to ${options.write}`);
fs.writeFileSync(options.write, comparator.comparisonToJson());

if (options.controlLevelComparison) {
    if (!(comparator.comparison.changes.length === 1 && comparator.comparison.changes[0] instanceof ArrayChanged)) {
        throw new Error('ControlLevelComparison can only be used with a baseLevelComparison');
    }

    const data = performBaseLevelComparison(
        comparator.comparison.changes[0],
        trackRawObject('', leftDoc),
        trackRawObject('', rightDoc),
    );

    fs.writeFileSync(options.write + '.clc.json', JSON.stringify(data, null, 2));

    generateBlcSpreadsheet(data, options.write + '.clc.xlsx');
}
