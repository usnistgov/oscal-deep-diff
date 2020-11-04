import * as fs from 'fs';
import YAML from 'yaml';
import { parseOptions, printComparison } from './cli-utils';
import { Comparator } from './comparator';
import { Config, defaultConfig } from './config';

const options = parseOptions();

let config = defaultConfig;
if (options.config !== '') {
    const configDict = YAML.parse(fs.readFileSync(options.config).toString())
    config = Config.fromDict(configDict);
    console.log(config);
}

const comparator = new Comparator(config);

const leftDoc = JSON.parse(fs.readFileSync(options.leftDoc).toString());
const rightDoc = JSON.parse(fs.readFileSync(options.rightDoc).toString());

comparator.newComparison(leftDoc, options.leftDoc, rightDoc, options.rightDoc);

if (options.write !== '') {
    console.log(`Saving compared document to ${options.write}`);
    fs.writeFileSync(options.write, comparator.comparisonToJson());
} else {
    printComparison(comparator.comparison);
}
