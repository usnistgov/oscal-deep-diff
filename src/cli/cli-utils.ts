import { Command } from 'commander';

// object that rawOptions is marshalled into
interface CLIOptions {
    config: string;
}

export function parseCliOptions(): CLIOptions {
    const rawOptions = new Command()
        .version('1.0.0')
        .description('Deep Differencing of OSCAL JSON artifacts')
        .usage('[options]')
        .requiredOption('-c --config <filename>', 'YAML config file to read from')
        .parse(process.argv);
    // specially cast rawOptions object to CLIOptions interface (force typing)
    return rawOptions as unknown as CLIOptions;
}
