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
        .version(process.env.npm_package_version ?? 'unknown')
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
        if (Object.keys(rawConfig).length === 0) {
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
