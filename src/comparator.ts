import Cache from './utils/cache';
import {
    ArrayChanged,
    Change,
    DocumentComparison,
    ComparisonResult,
    PropertyChanged,
    PropertyLeftOnly,
    PropertyRightOnly,
    SelectionResults,
} from './results';
import { MatcherResults } from './matching';
import { TrackedArray, TrackedElement, TrackedObject, TrackedPrimitive, trackRawObject, select } from './utils/tracked';
import { countSubElements, getPropertyUnion, JSONValue, testPointerCondition } from './utils/json';
import {
    BASE_SETTINGS,
    mergePartialComparatorStepConfigs,
    ComparatorStepConfig,
    ComparatorConfig,
} from './configuration';

/**
 * Helper result representing an empty set of changes
 */
const NO_CHANGES: ComparisonResult = [[], 0];

export default class Comparator {
    /**
     * The cache stores the results of a comparison on array types
     */
    private cache = new Cache<ComparisonResult>();

    private settingsCandidates: ComparatorConfig;

    constructor(settingsCandidates?: ComparatorConfig) {
        this.settingsCandidates = settingsCandidates ?? {};
    }

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

    private settingsForPointer(pointer: string, base: ComparatorStepConfig = BASE_SETTINGS) {
        return mergePartialComparatorStepConfigs(
            base,
            ...Object.entries(this.settingsCandidates)
                .filter(([condition]) => testPointerCondition(pointer, condition))
                .map(([, settings]) => settings),
        );
    }

    /**
     * This recursive function is called for each element pair being compared.
     *
     * This method gets the settings appropriate for the element pair, and then calls the correct comparison operation.
     */
    private compareElements(left: TrackedElement, right: TrackedElement): ComparisonResult {
        const settings = this.settingsForPointer(right.pointer);

        // check if elements have been marked as ignored
        for (const ignoreCondition of settings.ignore) {
            if (left.testPointerCondition(ignoreCondition)) {
                return NO_CHANGES;
            }
        }

        // check selection paths
        if (settings.selectionPaths.length !== 0) {
            const [leftSubElems, rightSubElems] = select(left, right, settings.selectionPaths);
            const [leftOnly, rightOnly, subElements, changeCount] = this.compareElementArray(
                leftSubElems,
                rightSubElems,
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

    private comparePrimitives(
        left: TrackedPrimitive,
        right: TrackedPrimitive,
        settings: ComparatorStepConfig,
    ): ComparisonResult {
        if (typeof left.raw === 'string' && typeof right.raw === 'string' && settings.ignoreCase) {
            if (left.raw.toLowerCase() != right.raw.toLowerCase()) {
                return [[new PropertyChanged(left.raw, left.pointer, right.raw, right.pointer)], 1];
            }
        } else if (left.raw !== right.raw) {
            return [[new PropertyChanged(left.raw, left.pointer, right.raw, right.pointer)], 1];
        }
        return NO_CHANGES;
    }

    private compareArrays(left: TrackedArray, right: TrackedArray, settings: ComparatorStepConfig): ComparisonResult {
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

    private compareElementArray(
        left: TrackedElement[],
        right: TrackedElement[],
        settings: ComparatorStepConfig,
    ): MatcherResults {
        return settings.matcherGenerators
            .map((container) => container.generate(left, right))
            .flat()
            .reduce<MatcherResults>(
                (prev, matcher): MatcherResults => {
                    const results = matcher(left, right, this.compareElements);
                    return prev[3] < results[3] ? prev : results;
                },
                [[], [], [], Infinity],
            );
    }
}
