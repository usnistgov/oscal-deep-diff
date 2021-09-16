import * as fs from 'fs';
import { parseCliOptions } from './cli-utils';
import Comparator from '../comparator';
import { parseConfig } from '../configuration';
import { performBaseLevelComparison } from '../base-comparisons/intermediate-output';
import { SelectionResults } from '../results';
import { trackRawObject } from '../utils/tracked';
import { generateBlcSpreadsheet } from '../base-comparisons/excel-output';
import YAML from 'yaml';

const cliOptions = parseCliOptions();
const config = parseConfig(YAML.parse(fs.readFileSync(cliOptions.config).toString()));

const comparator = new Comparator(config.comparatorConfig);

const leftDoc = JSON.parse(fs.readFileSync(config.leftPath).toString());
const rightDoc = JSON.parse(fs.readFileSync(config.rightPath).toString());

const comparison = comparator.compare(leftDoc, config.leftPath, rightDoc, config.rightPath);

console.log(`Saving compared document to ${config.outputPath}`);
fs.writeFileSync(config.outputPath, JSON.stringify(comparison));

if (config.baseComparison) {
    if (!(comparison.changes.length === 1 && comparison.changes[0] instanceof SelectionResults)) {
        throw new Error('ControlLevelComparison can only be used with a baseLevelComparison');
    }

    const blc = performBaseLevelComparison(
        comparison.changes[0],
        trackRawObject('', leftDoc),
        trackRawObject('', rightDoc),
    );

    if (config.baseComparison.outputType === 'raw') {
        fs.writeFileSync(config.baseComparison.outputPath, JSON.stringify(blc, null, 2));
    } else if (config.baseComparison.outputType === 'excel') {
        generateBlcSpreadsheet(blc, config.baseComparison.outputPath);
    }
}
