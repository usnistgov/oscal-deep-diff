import * as fs from 'fs';
import { parseCliOptions } from './cli-utils';
import Comparator from '../comparator';
import { parseConfig } from '../configuration';
import { performBaseLevelComparison } from '../base-comparisons/intermediate-output';
// import { SelectionResults } from '../results';
import { trackRawObject } from '../utils/tracked';
import { generateBlcSpreadsheet } from '../base-comparisons/excel-output';
import YAML from 'yaml';
import { buildSelection } from '../base-comparisons/util';

const cliOptions = parseCliOptions();
const config = parseConfig(YAML.parse(fs.readFileSync(cliOptions.config).toString()));

const comparator = new Comparator(config.comparatorConfig);

const leftDoc = JSON.parse(fs.readFileSync(config.leftPath).toString());
const rightDoc = JSON.parse(fs.readFileSync(config.rightPath).toString());

console.time('comparison');
const comparison = comparator.compare(leftDoc, config.leftPath, rightDoc, config.rightPath);
console.timeEnd('comparison');

fs.writeFileSync(config.outputPath, JSON.stringify(comparison));
console.log(`Saved comparison output to ${config.outputPath}`);

config.outputConfigs.forEach((outputConfig) => {
    const selectionResults = buildSelection(comparison, 'controls');
    const blc = performBaseLevelComparison(selectionResults, trackRawObject('', leftDoc), trackRawObject('', rightDoc));

    if (outputConfig.outputType === 'raw') {
        fs.writeFileSync(outputConfig.outputPath, JSON.stringify(blc, null, 2));
        console.log(`Saved base level comparison output to ${outputConfig.outputPath}`);
    } else if (outputConfig.outputType === 'excel') {
        generateBlcSpreadsheet(blc, outputConfig.outputPath, outputConfig.identifiers);
        console.log(`Saved base level comparison spreadsheet to ${outputConfig.outputPath}`);
    }
});
