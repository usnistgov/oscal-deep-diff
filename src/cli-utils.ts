import { Command } from 'commander';
import { Comparison } from './comparisons';
import { RedFG, ResetConsole, GreenFG, YellowFG } from './utils';

// object that rawOptions is marshalled into
interface CLIOptions {
    leftDoc: string;
    rightDoc: string;
    write: string;
    config: string;
}

export function parseOptions(): CLIOptions {
    const rawOptions = new Command()
        .version('0.0.1')
        .description('Deep Differencing of OSCAL catalogs')
        .usage('[options]')
        .requiredOption('-l, --leftDoc <filename>', 'Left (old) document to compare (in JSON representation)')
        .requiredOption('-r, --rightDoc <filename>', 'Right (new) document to compare (in JSON representation)')
        .option('-w, --write <filename>', 'File to output difference document to', '')
        .option('-c --config <filename>', 'YAML config file to read from', '')
        .parse(process.argv);
    // specially cast rawOptions object to CLIOptions interface (force typing)
    return rawOptions as unknown as CLIOptions;
}

export function printComparison(comparison: Comparison): void {
    console.log(
        `Comparison between ${RedFG}${comparison.leftDocument}${ResetConsole} and ${GreenFG}${comparison.rightDocument}${ResetConsole}:`,
    );
    for (const change of comparison.changes) {
        console.log(`${YellowFG}---${ResetConsole}`);
        change.printChange();
    }
    console.log(`${YellowFG}---${ResetConsole}`);
    console.log(`Top level changes: ${comparison.changes.length}`);
}
