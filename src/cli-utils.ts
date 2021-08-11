import { Command } from 'commander';

// object that rawOptions is marshalled into
interface CLIOptions {
    leftDoc: string;
    rightDoc: string;
    write: string;
    config: string;
    controlLevelComparison: boolean;
}

export function parseOptions(): CLIOptions {
    const rawOptions = new Command()
        .version('0.0.1')
        .description('Deep Differencing of OSCAL catalogs')
        .usage('[options]')
        .requiredOption('-l, --leftDoc <filename>', 'Left (old) document to compare (in JSON representation)')
        .requiredOption('-r, --rightDoc <filename>', 'Right (new) document to compare (in JSON representation)')
        .option('-w, --write <filename>', 'File to output difference document to')
        .option('-c --config <filename>', 'YAML config file to read from', '')
        .option('--controlLevelComparison', 'Perform a control level comparison', false)
        .parse(process.argv);
    // specially cast rawOptions object to CLIOptions interface (force typing)
    return rawOptions as unknown as CLIOptions;
}
