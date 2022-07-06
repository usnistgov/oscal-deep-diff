/*
 * Portions of this software was developed by employees of the National Institute
 * of Standards and Technology (NIST), an agency of the Federal Government and is
 * being made available as a public service. Pursuant to title 17 United States
 * Code Section 105, works of NIST employees are not subject to copyright
 * protection in the United States. This software may be subject to foreign
 * copyright. Permission in the United States and in foreign countries, to the
 * extent that NIST may hold copyright, to use, copy, modify, create derivative
 * works, and distribute this software and its documentation without fee is hereby
 * granted on a non-exclusive basis, provided that this notice and disclaimer
 * of warranty appears in all copies.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS' WITHOUT ANY WARRANTY OF ANY KIND, EITHER
 * EXPRESSED, IMPLIED, OR STATUTORY, INCLUDING, BUT NOT LIMITED TO, ANY WARRANTY
 * THAT THE SOFTWARE WILL CONFORM TO SPECIFICATIONS, ANY IMPLIED WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND FREEDOM FROM
 * INFRINGEMENT, AND ANY WARRANTY THAT THE DOCUMENTATION WILL CONFORM TO THE
 * SOFTWARE, OR ANY WARRANTY THAT THE SOFTWARE WILL BE ERROR FREE.  IN NO EVENT
 * SHALL NIST BE LIABLE FOR ANY DAMAGES, INCLUDING, BUT NOT LIMITED TO, DIRECT,
 * INDIRECT, SPECIAL OR CONSEQUENTIAL DAMAGES, ARISING OUT OF, RESULTING FROM,
 * OR IN ANY WAY CONNECTED WITH THIS SOFTWARE, WHETHER OR NOT BASED UPON WARRANTY,
 * CONTRACT, TORT, OR OTHERWISE, WHETHER OR NOT INJURY WAS SUSTAINED BY PERSONS OR
 * PROPERTY OR OTHERWISE, AND WHETHER OR NOT LOSS WAS SUSTAINED FROM, OR AROSE OUT
 * OF THE RESULTS OF, OR USE OF, THE SOFTWARE OR SERVICES PROVIDED HEREUNDER.
 */

// Ignore file since it cannot be tested directly
/* istanbul ignore file */

import * as fs from 'fs';
import { parseCliOptions } from './cli-utils';
import Comparator from '../comparator';
import { performIntermediateComparison } from '../base-comparisons/intermediate-output';
import { trackRawObject } from '../utils/tracked';
import { generateOutputSpreadsheet } from '../base-comparisons/excel-output';
import { buildSelection } from '../base-comparisons/util';

const config = parseCliOptions(process.argv);
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
        outputConfig.identifiers,
    );

    if (outputConfig.outputType === 'raw') {
        fs.writeFileSync(outputConfig.outputPath, JSON.stringify(intermediateOutput, null, 2));
    } else if (outputConfig.outputType === 'excel') {
        generateOutputSpreadsheet(intermediateOutput, outputConfig.outputPath, outputConfig.identifiers);
    }
    console.log(`Saved ${outputConfig.outputType} output to ${outputConfig.outputPath}`);
});
