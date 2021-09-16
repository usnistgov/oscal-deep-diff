import { MatcherContainer, OptimalMatcherContainer } from './matching';
import { JSONObject } from './utils/json';

export type ComparatorStepConfig = {
    ignore: string[];
    ignoreCase: boolean;
    matcherGenerators: MatcherContainer[];
    selectionPaths: string[];
    priority: number;
};

export const BASE_SETTINGS: ComparatorStepConfig = {
    ignore: [],
    ignoreCase: false,
    matcherGenerators: [new OptimalMatcherContainer()],
    selectionPaths: [],
    priority: 0,
};

// Like Partial<T>, but requires that some key K of T is defined
type AtLeast<T, K extends keyof T> = Partial<T> & Pick<T, K>;

export type PartialComparatorStepConfig = AtLeast<ComparatorStepConfig, 'priority'>;

export function mergePartialComparatorStepConfigs(
    base: ComparatorStepConfig,
    // each override requires at least 'priority' is defined
    ...overrides: PartialComparatorStepConfig[]
): ComparatorStepConfig {
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

export type ComparatorConfig = { [key: string]: PartialComparatorStepConfig };

export function parseComparatorConfig(dict: JSONObject): ComparatorConfig {
    return Object.keys(dict).reduce<ComparatorConfig>((settings, pointer) => {
        settings[pointer] = parsePartialComparatorStepConfig(dict[pointer] as JSONObject);
        return settings;
    }, {});
}

export function parsePartialComparatorStepConfig(dict: JSONObject): PartialComparatorStepConfig {
    const partial: PartialComparatorStepConfig = {
        priority: 'priority' in dict && typeof dict.priority === 'number' ? dict.priority : Infinity,
    };

    if ('ignore' in dict && Array.isArray(dict.ignore)) {
        partial.ignore = dict.ignore as string[];
    }

    if ('ignoreCase' in dict && typeof dict.ignoreCase === 'boolean') {
        partial.ignoreCase = dict.ignoreCase;
    }

    if ('matcherGenerators' in dict && Array.isArray(dict.matcherGenerators)) {
        partial.matcherGenerators = dict.matcherGenerators.map((raw) => MatcherContainer.fromDict(raw as JSONObject));
    }

    if ('selectionPaths' in dict && Array.isArray(dict.selectionPaths)) {
        partial.selectionPaths = dict.selectionPaths as string[];
    }

    return partial;
}

export interface BaseComparisonConfig {
    identifiers: string[];
    outputType: 'raw' | 'excel';
    outputPath: string;
}

export function parseBaseComparisonConfig(dict: JSONObject): BaseComparisonConfig {
    return dict as unknown as BaseComparisonConfig;
}

export interface Config {
    leftPath: string;
    rightPath: string;
    outputPath: string;
    comparatorConfig: ComparatorConfig;
    baseComparison?: BaseComparisonConfig;
}

export function parseConfig(dict: JSONObject): Config {
    if (!('leftPath' in dict && typeof dict.leftPath === 'string')) {
        throw new Error("'leftPath' must be defined");
    } else if (!('rightPath' in dict && typeof dict.rightPath === 'string')) {
        throw new Error("'rightPath' must be defined");
    } else if (!('outputPath' in dict && typeof dict.outputPath === 'string')) {
        throw new Error("'outputPath' must be defined");
    } else if (
        !(
            'comparatorConfig' in dict &&
            dict.comparatorConfig &&
            typeof dict.comparatorConfig === 'object' &&
            !Array.isArray(dict.comparatorConfig)
        )
    ) {
        throw new Error("'comparatorConfig' must be defined");
    }

    return {
        leftPath: dict.leftPath,
        rightPath: dict.rightPath,
        outputPath: dict.outputPath,
        comparatorConfig: parseComparatorConfig(dict.comparatorConfig),
        baseComparison:
            'baseComparison' in dict &&
            dict.baseComparison &&
            typeof dict.baseComparison === 'object' &&
            !Array.isArray(dict.baseComparison)
                ? parseBaseComparisonConfig(dict.baseComparison)
                : undefined,
    };
}
