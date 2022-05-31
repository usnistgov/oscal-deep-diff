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
import * as fs from 'fs';
import { Command } from 'commander';
import YAML from 'yaml';
import { parseConfig, Config } from '../configuration';
import { JSONObject } from '../utils/json';

// object that rawOptions is marshalled into
interface CLIOptions {
    config?: string;
    leftPath?: string;
    rightPath?: string;
    outputPath?: string;
}

const YAML_DISCLAIMER = '(this can also be defined via the YAML config)';

export function parseCliOptions(): Config {
    const command = new Command()
        .version('v1.0.0-1')
        .description('Deep Differencing of OSCAL JSON artifacts')
        .usage('[options]')
        .option('-c --config <filename>', 'YAML config file to read from')
        .option('-l --leftPath <filename>', 'The path of the left document ' + YAML_DISCLAIMER)
        .option('-r --rightPath <filename>', 'The path of the right document ' + YAML_DISCLAIMER)
        .option('-o --outputPath <filename>', 'The output path to write to ' + YAML_DISCLAIMER)
        .parse(process.argv);
    // specially cast rawOptions object to CLIOptions interface (force typing)
    const options = command.opts() as unknown as CLIOptions;

    let rawConfig: JSONObject = {};

    if (command.args.length > 0) {
        if (command.args.length > 1) {
            console.error(
                `Only first argument will be used. The additional ${
                    command.args.length - 1
                } arguments will be discarded`,
            );
        }

        rawConfig = YAML.parse(command.args[0]);
    }

    if (options.config) {
        if (Object.keys(rawConfig).length !== 0) {
            throw new Error('Base configuration cannot be defined both as an argument and as a file');
        }

        rawConfig = YAML.parse(fs.readFileSync(options.config).toString());
    }

    if (options.leftPath) {
        if (rawConfig['leftPath']) {
            console.error('leftPath defined both in configuration and as command line argument');
        }

        rawConfig['leftPath'] = options.leftPath;
    }

    if (options.rightPath) {
        if (rawConfig['rightPath']) {
            console.error('rightPath defined both in configuration and as command line argument');
        }

        rawConfig['rightPath'] = options.rightPath;
    }

    if (options.outputPath) {
        if (rawConfig['outputPath']) {
            console.error('outputPath defined both in configuration and as command line argument');
        }

        rawConfig['outputPath'] = options.outputPath;
    }

    return parseConfig(rawConfig);
}
