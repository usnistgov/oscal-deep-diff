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
import MatcherContainer, { OptimalMatcherContainer } from './matching';
import { JSONObject, JSONValue } from './utils/json';

export type ComparatorStepConfig = {
    ignore: string[];
    ignoreCase: boolean;
    matcherGenerators: MatcherContainer[];
    stringComparisonMethod: 'jaro-winkler' | 'cosine' | 'absolute';
    outOfTreeEnabled: boolean;
    priority: number;
};

export const BASE_SETTINGS: ComparatorStepConfig = {
    ignore: [],
    ignoreCase: false,
    matcherGenerators: [new OptimalMatcherContainer()],
    stringComparisonMethod: 'absolute',
    outOfTreeEnabled: false,
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

    if ('outOfTreeEnabled' in dict && typeof dict.outOfTreeEnabled === 'boolean') {
        partial.outOfTreeEnabled = dict.outOfTreeEnabled;
    }

    if ('matcherGenerators' in dict && Array.isArray(dict.matcherGenerators)) {
        partial.matcherGenerators = dict.matcherGenerators.map((raw) => MatcherContainer.fromDict(raw as JSONObject));
    }

    if ('stringComparisonMethod' in dict && typeof dict.stringComparisonMethod === 'string') {
        if (
            dict.stringComparisonMethod === 'absolute' ||
            dict.stringComparisonMethod === 'cosine' ||
            dict.stringComparisonMethod === 'jaro-winkler'
        ) {
            partial.stringComparisonMethod = dict.stringComparisonMethod;
        } else {
            throw new Error(`Unknown string-similarity method ${dict.stringComparisonMethod}`);
        }
    }

    return partial;
}

export interface OutputConfig {
    identifiers: string[];
    outputType: 'raw' | 'excel';
    outputPath: string;
    selection: string;
}

export function parseOutputConfig(dict: JSONValue): OutputConfig {
    if (!dict || typeof dict !== 'object' || Array.isArray(dict)) {
        throw new Error('Base Comparison Config item must be an object type');
    }
    return dict as unknown as OutputConfig;
}

export interface Config {
    leftPath: string;
    rightPath: string;
    outputPath: string;
    comparatorConfig: ComparatorConfig;
    outputConfigs: OutputConfig[];
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
        outputConfigs:
            'outputConfigs' in dict &&
            dict.outputConfigs &&
            typeof dict.outputConfigs === 'object' &&
            Array.isArray(dict.outputConfigs)
                ? dict.outputConfigs.map((v) => parseOutputConfig(v))
                : [],
    };
}
