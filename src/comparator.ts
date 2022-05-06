import Cache from './utils/cache';
import {
    ArrayChanged,
    Change,
    DocumentComparison,
    ComparisonResult,
    PropertyChanged,
    PropertyLeftOnly,
    PropertyRightOnly,
    ArraySubElement,
} from './results';
import { MatcherResults } from './matching';
import { TrackedArray, TrackedElement, TrackedObject, TrackedPrimitive, trackRawObject } from './utils/tracked';
import {
    convertPointerToCondition,
    countSubElements,
    getPropertyUnion,
    JSONValue,
    testPointerCondition,
    testPointerConditions,
} from './utils/json';
import {
    BASE_SETTINGS,
    mergePartialComparatorStepConfigs,
    ComparatorStepConfig,
    ComparatorConfig,
} from './configuration';
import stringSimilarity from './utils/string-similarity';

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

        const [changes, score] = this.compareElements(leftRoot, rightRoot);

        return {
            leftDocument: leftSource,
            rightDocument: rightSource,
            changes,
            score,
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
    private compareElements(left: TrackedElement, right: TrackedElement, shallow = false): ComparisonResult {
        const settings = this.settingsForPointer(right.pointer);

        // check if elements have been marked as ignored
        if (testPointerConditions(left.pointer, ...settings.ignore)) {
            return NO_CHANGES;
        }

        if (left instanceof TrackedArray && right instanceof TrackedArray) {
            if (!shallow) {
                return this.compareArrays(left, right, settings);
            }
            return NO_CHANGES;
        } else if (left instanceof TrackedObject && right instanceof TrackedObject) {
            return this.compareObjects(left, right, settings, shallow);
        } else if (left instanceof TrackedPrimitive && right instanceof TrackedPrimitive) {
            return this.comparePrimitives(left, right, settings);
        }

        throw new Error('Left and right (sub)document are not of the same "type"');
    }

    private compareObjects(
        left: TrackedObject,
        right: TrackedObject,
        settings: ComparatorStepConfig,
        shallow = false,
    ): ComparisonResult {
        const changes: Change[] = [];
        let cost = 0;

        const propertyUnion = getPropertyUnion(left.raw, right.raw);

        for (const property of propertyUnion) {
            if (testPointerConditions(`${left.pointer}/${property}`, ...settings.ignore)) {
                continue;
            }

            // for each property in both sub-documents, recurse and compare results
            if (!(property in left.raw)) {
                // property only in right document
                changes.push(new PropertyRightOnly(left.pointer, `${right.pointer}/${property}`, right.raw[property]));
                cost += countSubElements(right.raw[property], shallow);
            } else if (!(property in right.raw)) {
                // property only in left document
                changes.push(new PropertyLeftOnly(`${left.pointer}/${property}`, left.raw[property], right.pointer));
                cost += countSubElements(left.raw[property], shallow);
            } else {
                // property exists in both, recurse on sub-document
                const [subChanges, subChangeCount] = this.compareElements(
                    left.resolve(property),
                    right.resolve(property),
                    shallow,
                );

                cost += subChangeCount;
                changes.push(...subChanges);
            }
        }

        return [changes, cost];
    }

    private comparePrimitives(
        left: TrackedPrimitive,
        right: TrackedPrimitive,
        settings: ComparatorStepConfig,
    ): ComparisonResult {
        if (typeof left.raw === 'string' && typeof right.raw === 'string') {
            const cost = stringSimilarity(left.raw, right.raw, settings.stringComparisonMethod, settings.ignoreCase);

            if (cost < 0.7) {
                return [[new PropertyChanged(left.raw, left.pointer, right.raw, right.pointer)], 2 * (1 - cost)];
            } else {
                return [[], 2 * (1 - cost)];
            }
        } else if (left.raw !== right.raw) {
            return [[new PropertyChanged(left.raw, left.pointer, right.raw, right.pointer)], 2];
        }
        return NO_CHANGES;
    }

    private compareArrays(left: TrackedArray, right: TrackedArray, settings: ComparatorStepConfig): ComparisonResult {
        // const cached = this.cache.get(left.pointer, right.pointer);
        // if (cached) {
        //     return cached;
        // }

        const [leftOnly, rightOnly, subElements, changeCount] = this.compareElementArray(
            left.getAll(),
            right.getAll(),
            settings,
        );

        let outOfTreeMatches: ArraySubElement[] = [];
        let outOfTreeScoreDelta = 0;

        // out of tree
        if (settings.outOfTreeEnabled) {
            [outOfTreeMatches, outOfTreeScoreDelta] = this.compareOutOfTree(subElements);
        }

        const result: ComparisonResult = [
            [new ArrayChanged(left.pointer, right.pointer, rightOnly, leftOnly, subElements, outOfTreeMatches)],
            changeCount + outOfTreeScoreDelta,
        ];

        // this.cache.set(left.pointer, right.pointer, result);
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
                    // Surround method passed as fp in clojure to prevent orphaned `this`
                    // https://github.com/Microsoft/TypeScript/wiki/FAQ#why-does-this-get-orphaned-in-my-instance-methods
                    const results = matcher(left, right, (l, r, s) => this.compareElements(l, r, s));
                    return prev[3] < results[3] ? prev : results;
                },
                [[], [], [], Infinity],
            );
    }

    /**
     * NOTE: this function has a SIDE EFFECT of removing matched items from subChanges
     * @returns The out of tree matches, and the delta of newly matched items
     */
    private compareOutOfTree(subChanges: ArraySubElement[]): [ArraySubElement[], number] {
        const leftPotentialMatches = new Map<string, TrackedElement[]>();
        const rightPotentialMatches = new Map<string, TrackedElement[]>();

        // find all potential matches
        for (const subChange of subChanges) {
            for (const subChangeChange of subChange.changes) {
                if (subChangeChange instanceof ArrayChanged) {
                    for (const potentialLeftMatches of subChangeChange.leftOnly) {
                        const condition = convertPointerToCondition(potentialLeftMatches.leftPointer);
                        const potentialMatches = leftPotentialMatches.get(condition);

                        const trackedPotentialMatches = trackRawObject(
                            potentialLeftMatches.leftPointer,
                            potentialLeftMatches.leftElement,
                        );

                        if (potentialMatches) {
                            potentialMatches.push(trackedPotentialMatches);
                        } else {
                            leftPotentialMatches.set(condition, [trackedPotentialMatches]);
                        }
                    }

                    for (const potentialRightMatches of subChangeChange.rightOnly) {
                        const condition = convertPointerToCondition(potentialRightMatches.rightPointer);
                        const potentialMatches = rightPotentialMatches.get(condition);

                        const trackedPotentialMatches = trackRawObject(
                            potentialRightMatches.rightPointer,
                            potentialRightMatches.rightElement,
                        );

                        if (potentialMatches) {
                            potentialMatches.push(trackedPotentialMatches);
                        } else {
                            rightPotentialMatches.set(condition, [trackedPotentialMatches]);
                        }
                    }
                }
            }
        }

        const matches: ArraySubElement[] = [];
        let scoreDelta = 0;

        const leftToAblate = [];
        const rightToAblate = [];

        // compare all potential matches
        for (const [condition, leftArrayItems] of leftPotentialMatches) {
            const rightArrayItems = rightPotentialMatches.get(condition);
            if (rightArrayItems) {
                const [, , conditionMatches] = this.compareElementArray(
                    leftArrayItems,
                    rightArrayItems,
                    this.settingsForPointer(condition),
                );

                for (const conditionMatch of conditionMatches) {
                    scoreDelta += conditionMatch.score;
                    leftToAblate.push(conditionMatch.leftPointer);
                    rightToAblate.push(conditionMatch.rightPointer);
                }

                matches.push(...conditionMatches);
            }
        }

        // ablate matched items from change history
        for (const subChange of subChanges) {
            for (const subChangeChange of subChange.changes) {
                if (subChangeChange instanceof ArrayChanged) {
                    for (let i = 0; i < subChangeChange.leftOnly.length; i++) {
                        for (const leftAblation of leftToAblate) {
                            if (subChangeChange.leftOnly[i].leftPointer == leftAblation) {
                                const score = countSubElements(subChangeChange.leftOnly[i].leftElement);
                                scoreDelta -= score;
                                subChange.score -= score;
                                subChangeChange.leftOnly.splice(i, 1);
                                break;
                            }
                        }
                    }

                    for (let i = 0; i < subChangeChange.rightOnly.length; i++) {
                        for (const rightAblation of leftToAblate) {
                            if (subChangeChange.rightOnly[i].rightPointer == rightAblation) {
                                const score = countSubElements(subChangeChange.rightOnly[i].rightElement);
                                scoreDelta -= score;
                                subChange.score -= score;
                                subChangeChange.rightOnly.splice(i, 1);
                                break;
                            }
                        }
                    }
                }
            }
        }

        return [matches, scoreDelta];
    }
}
