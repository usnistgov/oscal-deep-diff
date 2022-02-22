import * as fs from 'fs';
import { parseCliOptions } from './cli-utils';
import Comparator from '../comparator';
import { parseConfig } from '../configuration';
import { performIntermediateComparison } from '../base-comparisons/intermediate-output';
import { trackRawObject } from '../utils/tracked';
import { generateOutputSpreadsheet } from '../base-comparisons/excel-output';
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

fs.writeFileSync(config.outputPath, JSON.stringify(comparison, null, 2));
console.log(`Saved comparison output to ${config.outputPath}`);

config.outputConfigs.forEach((outputConfig) => {
    console.log(
        `Processing output config (selecting ${outputConfig.identifiers} and saving ${outputConfig.outputType} output)`,
    );

    const selectionResults = buildSelection(comparison, outputConfig.selection);
    const intermediateOutput = performIntermediateComparison(
        selectionResults,
        trackRawObject('', leftDoc),
        trackRawObject('', rightDoc),
    );

    if (outputConfig.outputType === 'raw') {
        fs.writeFileSync(outputConfig.outputPath, JSON.stringify(intermediateOutput, null, 2));
    } else if (outputConfig.outputType === 'excel') {
        generateOutputSpreadsheet(intermediateOutput, outputConfig.outputPath, outputConfig.identifiers);
    }
    console.log(`Saved ${outputConfig.outputType} output to ${outputConfig.outputPath}`);
});
