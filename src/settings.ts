import { MatcherContainer, MatcherGenerator, OptimalMatchContainer } from './matching';
import { JSONObject, JSONValue } from './utils/json';

export abstract class PipelineStep {
    abstract type: string;

    abstract run(input: JSONValue): JSONValue;
}

export class ComparatorPipelineStep implements PipelineStep {
    type = 'comparator';

    run(input: JSONValue): JSONValue {
        return input;
    }
}

export class BaseComparison implements PipelineStep {
    type = 'baseComparison';

    run(input: JSONValue): JSONValue {
        return input;
    }
}

export class ExcelOutput implements PipelineStep {
    type = 'excelOutput';

    run(input: JSONValue): JSONValue {
        return input;
    }
}

export type Settings = {
    ignore: string[];
    ignoreCase: boolean;
    matcherGenerators: MatcherGenerator[];
    selectionPaths: string[];
    priority: number;
};

export const BASE_SETTINGS: Settings = {
    ignore: [],
    ignoreCase: false,
    matcherGenerators: [new OptimalMatchContainer().generate],
    selectionPaths: [],
    priority: 0,
};

export function parseSettings(dict: JSONObject): PartialSettings {
    return {
        ignore: 'ignore' in dict && Array.isArray(dict.ignore) ? (dict.ignore as string[]) : undefined,
        ignoreCase: 'ignoreCase' in dict && typeof dict.ignoreCase === 'boolean' ? dict.ignoreCase : undefined,
        matcherGenerators:
            'matcherGenerators' in dict && Array.isArray(dict.matcherGenerators)
                ? dict.matcherGenerators.map((raw) => MatcherContainer.fromDict(raw as JSONObject).generate)
                : undefined,
        selectionPaths:
            'selectionPaths' in dict && Array.isArray(dict.selectionPaths)
                ? (dict.selectionPaths as string[])
                : undefined,
        priority: 'priority' in dict && typeof dict.priority === 'number' ? dict.priority : Infinity,
    };
}

// Like Partial<T>, but requires that some key K of T is defined
type AtLeast<T, K extends keyof T> = Partial<T> & Pick<T, K>;

export type PartialSettings = AtLeast<Settings, 'priority'>;

export function mergeSettings(
    base: Settings,
    // each override requires at least 'priority' is defined
    ...overrides: PartialSettings[]
): Settings {
    overrides
        .sort((a, b) => (a.priority > b.priority ? 1 : a.priority < b.priority ? -1 : 0))
        .forEach((override) => {
            base = {
                ...base,
                ...override,
            };
        });
    return base;
}
