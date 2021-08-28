import Cache from './cache';
import {
    ArrayChanged,
    Change,
    DocumentComparison,
    ComparisonResult,
    PropertyChanged,
    PropertyLeftOnly,
    PropertyRightOnly,
    SelectionResults,
} from './comparisons';
import { MatcherGenerator, MatcherResults, scoringMatcherFactory } from './refactor_matching';
import { TrackedArray, TrackedElement, TrackedObject, TrackedPrimitive, trackRawObject } from './tracked';
import { countSubElements, getPropertyIntersection, getPropertyUnion, JSONValue, select } from './utils';

const INF_CHANGES: MatcherResults = [[], [], [], Infinity];

// Tuple of array changes and number of subchanges
const NO_CHANGES: ComparisonResult = [[], 0];

export default class Comparator {
    private cache = new Cache<ComparisonResult>();

    public compare(left: JSONValue, leftSource: string, right: JSONValue, rightSource: string): DocumentComparison {
        const leftRoot = trackRawObject('', left);
        const rightRoot = trackRawObject('', right);

        const [changes] = this.compareElements(leftRoot, rightRoot);

        return {
            leftDocument: leftSource,
            rightDocument: rightSource,
            changes,
        };
    }

    private compareElements(left: TrackedElement, right: TrackedElement): ComparisonResult {
        // get settings
        const settings = BASE_SETTINGS;

        // check if elements have been marked as ignored
        for (const ignoreCondition of settings.ignore) {
            if (left.testPointerCondition(ignoreCondition)) {
                return NO_CHANGES;
            }
        }

        // check selection paths
        if (settings.selectionPaths.length !== 0) {
            const [leftOnly, rightOnly, subElements, changeCount] = this.compareElementArray(
                ...select(left, right, settings.selectionPaths),
                settings,
            );
            return [[new SelectionResults(left.pointer, right.pointer, leftOnly, rightOnly, subElements)], changeCount];
        } else if (left instanceof TrackedArray && right instanceof TrackedArray) {
            return this.compareArrays(left, right, settings);
        } else if (left instanceof TrackedObject && right instanceof TrackedObject) {
            return this.compareObjects(left, right);
        } else if (left instanceof TrackedPrimitive && right instanceof TrackedPrimitive) {
            return this.comparePrimitives(left, right, settings);
        }

        throw new Error('Left and right (sub)document are not of the same "type"');
    }

    private compareObjects(left: TrackedObject, right: TrackedObject): ComparisonResult {
        const changes: Change[] = [];
        let changeCount = 0;

        const propertyUnion = getPropertyUnion(left.raw, right.raw);

        for (const property of propertyUnion) {
            // for each property in both sub-documents, recurse and compare results
            if (!(property in left.raw)) {
                // property only in right document
                changes.push(new PropertyRightOnly(left.pointer, `${right.pointer}/${property}`, right.raw[property]));
                changeCount += countSubElements(right.raw[property]);
            } else if (!(property in right.raw)) {
                // property only in left document
                changes.push(new PropertyLeftOnly(`${left.pointer}/${property}`, left.raw[property], right.pointer));
                changeCount += countSubElements(left.raw[property]);
            } else {
                // property exists in both, recurse on sub-document
                const [subChanges, subChangeCount] = this.compareElements(
                    left.resolve(property),
                    right.resolve(property),
                );

                changeCount += subChangeCount;
                changes.push(...subChanges);
            }
        }

        return [changes, changeCount];
    }

    private comparePrimitives(left: TrackedPrimitive, right: TrackedPrimitive, settings: Settings): ComparisonResult {
        if (typeof left.raw === 'string' && typeof right.raw === 'string' && settings.ignoreCase) {
            if (left.raw.toLowerCase() != right.raw.toLowerCase()) {
                return [[new PropertyChanged(left.raw, left.pointer, right.raw, right.pointer)], 1];
            }
        } else if (left.raw !== right.raw) {
            return [[new PropertyChanged(left.raw, left.pointer, right.raw, right.pointer)], 1];
        }
        return NO_CHANGES;
    }

    private compareArrays(left: TrackedArray, right: TrackedArray, settings: Settings): ComparisonResult {
        const cached = this.cache.get(left.pointer, right.pointer);
        if (cached) {
            return cached;
        }

        const [leftOnly, rightOnly, subElements, changeCount] = this.compareElementArray(
            left.getAll(),
            right.getAll(),
            settings,
        );

        const result: ComparisonResult = [
            [new ArrayChanged(left.pointer, right.pointer, rightOnly, leftOnly, subElements, [])],
            changeCount,
        ];

        this.cache.set(left.pointer, right.pointer, result);
        return result;
    }

    private compareElementArray(left: TrackedElement[], right: TrackedElement[], settings: Settings): MatcherResults {
        return settings.matcherGenerators
            .map((generator) => generator(left, right))
            .flat()
            .reduce((prev, matcher): MatcherResults => {
                const results = matcher(left, right, this.compareElements);
                return prev[3] < results[3] ? prev : results;
            }, INF_CHANGES);
    }
}

type Settings = {
    ignore: string[];
    ignoreCase: boolean;
    ignoreMatchProperty: string[];
    matcherGenerators: MatcherGenerator[];
    selectionPaths: string[];
    priority: number;
};

const BASE_SETTINGS: Settings = {
    ignore: [],
    ignoreCase: false,
    ignoreMatchProperty: [],
    matcherGenerators: [
        (left, right) => {
            if (left.length === 0 || right.length === 0) {
                return [];
            }
            const lSample = left[0];
            const rSample = right[0];
            if (lSample instanceof TrackedArray && rSample instanceof TrackedArray) {
                throw new Error('Array of array comparison is not supported');
            } else if (lSample instanceof TrackedObject && rSample instanceof TrackedObject) {
                return scoringMatcherFactory(
                    getPropertyIntersection(lSample.raw, rSample.raw).map((prop) => (left, right) => {
                        if (!(left instanceof TrackedObject && right instanceof TrackedObject)) {
                            throw new Error('Non-homogenous array of items cannot be compared');
                        }
                        return left.raw[prop] === right.raw[prop] ? 1 : 0;
                    }),
                );
            } else if (lSample instanceof TrackedPrimitive && rSample instanceof TrackedPrimitive) {
                return scoringMatcherFactory([(left, right) => (left.raw === right.raw ? 1 : 0)]);
            } else {
                throw new Error('Mismatched types are not supported');
            }
        },
    ],
    selectionPaths: [],
    priority: 0,
};

// Like Partial<T>, but requires that some key K of T is defined
// type AtLeast<T, K extends keyof T> = Partial<T> & Pick<T, K>;
//
// function mergeSettings(
//     base: ComparisonSettings,
//     // each override requires at least 'priority' is defined
//     ...overrides: AtLeast<ComparisonSettings, 'priority'>[]
// ): ComparisonSettings {
//     overrides
//         .sort((a, b) => (a.priority > b.priority ? 1 : a.priority < b.priority ? -1 : 0))
//         .forEach((override) => {
//             base = {
//                 ...base,
//                 ...override,
//             };
//         });
//     return base;
// }
