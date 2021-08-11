import {
    getPropertyUnion,
    countSubElements,
    convertPointerToCondition,
    getPropertyIntersection,
    getType,
    testPointerCondition,
    JSONValue,
    JSONArray,
    JSONObject,
} from './utils';
import {
    PropertyRightOnly,
    PropertyLeftOnly,
    PropertyChanged,
    ArrayChanged,
    Comparison,
    Change,
    ArraySubElement,
    excludeContentReplacer,
    ComparisonResult,
    RightArrayItem,
    LeftArrayItem,
} from './comparisons';
import { MatchInstructions, MatchType, ObjectPropertyMatchConstraint, PrimitiveMatchConstraint } from './matching';
import { MemoizationCache } from './cache';
import { Config } from './config';
import { TrackedArray, TrackedElement, TrackedObject, TrackedPrimitive, trackRawObject } from './tracked';
import { assembleBaseComparison } from './base-comparisons/assembler';

// Tuple of array changes and number of subchanges
const NO_CHANGES: ComparisonResult = [[], 0];

/**
 * The Comparator class is designed to handle comparing two arbitrary JSON
 * documents, with support for customizable constraints to fit particular
 * schemas.
 */
export class Comparator {
    private cache = new MemoizationCache();

    private _comparison: Comparison | undefined;

    public get comparison(): Comparison {
        if (this._comparison === undefined) {
            throw new Error('Attempted to get comparison before comparing two documents');
        }
        return this._comparison;
    }

    public comparisonToJson(): string {
        const comparison = this.comparison;
        if (this.config.excludeContent) {
            return JSON.stringify(comparison, excludeContentReplacer, 2);
        } else {
            return JSON.stringify(comparison, null, 2);
        }
    }

    private config: Config;

    constructor(config: Config) {
        this.config = config;
    }

    /**
     * Bootstrap for comparison recursive functions, compares two documents
     *
     * Note that the documents must already be loaded into memory
     * @param leftDocument left document object
     * @param leftDocumentSource source of right document (URL, filepath)
     * @param rightDocument right document object
     * @param rightDocumentSource source of right document (URL, filepath)
     */
    public newComparison(
        leftDocument: JSONValue,
        leftDocumentSource: string,
        rightDocument: JSONValue,
        rightDocumentSource: string,
    ): void {
        console.log(`Starting comparison between ${leftDocumentSource} and ${rightDocumentSource}`);
        console.time('compareDocuments');

        const leftRootElement = trackRawObject('', leftDocument);
        const rightRootElement = trackRawObject('', rightDocument);

        let changes: Change[];
        let changeCount = 0;

        if (this.config.baseComparisonPaths?.length > 0) {
            const [leftElements, rightElements] = assembleBaseComparison(
                leftRootElement,
                rightRootElement,
                this.config.baseComparisonPaths,
            );
            const [leftOnly, rightOnly, inTree, outOfTree, score] = this.compareArrays(leftElements, rightElements);
            changeCount += score;

            changes = [new ArrayChanged('', '', rightOnly, leftOnly, inTree, outOfTree)];
        } else {
            [changes, changeCount] = this.compareElements(leftRootElement, rightRootElement);
        }

        console.log(`Document comparison completed, ${changeCount} changes`);
        console.timeEnd('compareDocuments');

        this._comparison = {
            leftDocument: leftDocumentSource,
            rightDocument: rightDocumentSource,
            changes,
        };
    }

    /**
     * Determine if the given elements are objects, arrays, or primitives, and
     * perform a comparison on the elements based on which 'type' they are
     */
    private compareElements(left: TrackedElement, right: TrackedElement): ComparisonResult {
        // check if elements have been marked as ignored
        for (const ignoreCondition of this.config.ignoreFieldsForComparison) {
            if (left.testPointerCondition(ignoreCondition)) {
                return NO_CHANGES;
            }
        }

        if (left instanceof TrackedArray && right instanceof TrackedArray) {
            if (!this.config.disableMemoization) {
                const cached = this.cache.get(left.pointer, right.pointer);
                if (cached) {
                    const [cachedChanges, cachedScore] = cached;
                    return [[cachedChanges], cachedScore];
                }
            }

            const [leftOnly, rightOnly, changes, outOfTree, score] = this.compareArrays(left.getAll(), right.getAll());
            const arrayChanged = new ArrayChanged(left.pointer, right.pointer, rightOnly, leftOnly, changes, outOfTree);

            if (!this.config.disableMemoization && changes !== undefined) {
                this.cache.set(left.pointer, right.pointer, [arrayChanged, score]);
            }

            return [[arrayChanged], score];
        } else if (left instanceof TrackedObject && right instanceof TrackedObject) {
            // elements are both objects, compare each sub-element in the object
            return this.compareObjects(left, right);
        } else if (left instanceof TrackedPrimitive && right instanceof TrackedPrimitive) {
            if (typeof left.raw === 'string' && typeof right.raw === 'string' && this.config.ignoreCase) {
                if ((left.raw as string).toLowerCase() !== (right.raw as string).toLowerCase()) {
                    return [[new PropertyChanged(left.raw, left.pointer, right.raw, right.pointer)], 1];
                }
            } else if (left.raw !== right.raw) {
                // directly compare primitives
                return [[new PropertyChanged(left.raw, left.pointer, right.raw, right.pointer)], 1];
            }
        } else {
            throw new Error('Left and right (sub)document do not have the same type');
        }

        return NO_CHANGES;
    }

    /**
     * Compare object pairs property by property, recursing on each matched property pair
     */
    private compareObjects(left: TrackedObject, right: TrackedObject): ComparisonResult {
        // elements are both objects, compare each sub-element in the object
        let changeCount = 0;
        const changes: Change[] = [];

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

    /**
     * First match element pairs from both arrays by properties defined either by
     * constraints, or by sampling available elements to generate new constraints, choosing
     * the constraint that results in the least changes.
     *
     * Note that this constraint-based comparison ensures that each element pair is compared
     * the same way.
     */
    private compareArrays(
        left: TrackedElement[],
        right: TrackedElement[],
        condition?: string,
        disableOOT?: boolean,
    ): [LeftArrayItem[], RightArrayItem[], ArraySubElement[], ArraySubElement[], number] {
        let potentialMatches: MatchInstructions[];

        const constraint = condition ? this.config.constraints.tryGetConstraint(condition) : undefined;

        const leftRaw = left.map((tracked) => tracked.raw);
        const rightRaw = right.map((tracked) => tracked.raw);

        if (constraint) {
            potentialMatches = [constraint.matchArrayElements(leftRaw, rightRaw)];
        } else {
            potentialMatches = this.generatePotentialMatches(leftRaw, rightRaw, condition);
        }

        let optimal: [LeftArrayItem[], RightArrayItem[], ArraySubElement[], ArraySubElement[], number] = [
            [],
            [],
            [],
            [],
            Infinity,
        ];

        for (const potentialMatch of potentialMatches) {
            const potential: [LeftArrayItem[], RightArrayItem[], ArraySubElement[], ArraySubElement[], number] = [
                [],
                [],
                [],
                [],
                Infinity,
            ];
            [potential[0], potential[1], potential[2], potential[4]] = this.matchArrays(left, right, potentialMatch);

            if (this.config.outOfTreeMatching && !disableOOT) {
                const [outOfTreeMatches, outOfTreeChangeCount] = this.matchOutOfTree(potential[2]);
                potential[3] = outOfTreeMatches;
                potential[4] += outOfTreeChangeCount;
            }

            if (potential[4] < optimal[4]) {
                optimal = potential;
            }
        }

        return optimal;
    }

    /**
     * Match array pairs together based on instructions, building an ArrayChanged
     * object by recursing on each matched pair and returning the total number of
     * changed sub-elements.
     * @param left
     * @param right
     * @param instructions Object defining which element pairs should be matched
     */
    private matchArrays(
        left: TrackedElement[],
        right: TrackedElement[],
        instructions: MatchInstructions,
    ): [LeftArrayItem[], RightArrayItem[], ArraySubElement[], number] {
        let changeCount = 0;

        const leftOnly: LeftArrayItem[] = instructions.unmatchedLeftIndices.map((i) => {
            const item = left[i];
            changeCount += countSubElements(item.raw);

            return {
                leftPointer: item.pointer,
                leftElement: item.raw,
            };
        });

        const rightOnly: RightArrayItem[] = instructions.unmatchedRightIndices.map((i) => {
            const item = right[i];
            changeCount += countSubElements(item.raw);

            return {
                rightPointer: item.pointer,
                rightElement: item.raw,
            };
        });

        const changes: ArraySubElement[] = [];
        // iterate through all elements that have been matched and compare their sub-elements
        for (const match of instructions.matchedIndices) {
            if (match.confidence && match.confidence >= this.config.minimumConfidenceThreshold) {
                // discard matches with a confidence under the threshold
                instructions.unmatchedLeftIndices.push(match.leftElementIndex);
                instructions.unmatchedRightIndices.push(match.rightElementIndex);
                continue;
            }

            const leftSubElement = left[match.leftElementIndex];
            const rightSubElement = right[match.rightElementIndex];
            const subChanges: ArraySubElement = {
                leftPointer: leftSubElement.pointer,
                rightPointer: rightSubElement.pointer,
                changes: [],
            };
            let subChangeCount;

            [subChanges.changes, subChangeCount] = this.compareElements(leftSubElement, rightSubElement);

            if (subChanges.changes.length > 0) {
                changes.push(subChanges);
                changeCount += subChangeCount;
            }
        }

        return [leftOnly, rightOnly, changes, changeCount];
    }

    private generatePotentialMatches(
        leftArray: JSONArray,
        rightArray: JSONArray,
        testPointer?: string,
    ): MatchInstructions[] {
        const potentialMatches: MatchInstructions[] = [
            {
                // include match instructions with no matched indices
                matchedIndices: [],
                unmatchedLeftIndices: [...leftArray.keys()],
                unmatchedRightIndices: [...rightArray.keys()],
            },
        ];

        if (leftArray.length > 0 && rightArray.length > 0) {
            // only try matching if an array item can be sampled from both
            let leftSample = leftArray[0];
            let rightSample = rightArray[0];
            // sample left and right arrays
            const type = getType(leftSample);
            if (type !== getType(rightSample)) {
                throw new Error('Left and right arrays cannot mix and match type');
            }

            if (type === 'array') {
                throw new Error('Array of array comparison between two objects is not supported');
            } else if (type === 'object') {
                leftSample = leftSample as JSONObject;
                rightSample = rightSample as JSONObject;

                for (const property of getPropertyIntersection(leftSample, rightSample)) {
                    if (testPointer) {
                        // decide if this property should be skipped
                        let skipProperty = false;
                        for (const ignoreCondition of this.config.ignoreFieldsForMatchComparison) {
                            if (testPointerCondition(`${testPointer}/${property}`, ignoreCondition)) {
                                skipProperty = true;
                                continue;
                            }
                        }
                        if (skipProperty) {
                            continue;
                        }
                    }

                    for (const matchType of ['literal', 'string-similarity']) {
                        const constraint = new ObjectPropertyMatchConstraint(matchType as MatchType, property);
                        potentialMatches.push(constraint.matchArrayElements(leftArray, rightArray));
                    }
                }
            } else {
                // comparing primitives
                for (const matchType of ['literal', 'string-similarity']) {
                    const constraint = new PrimitiveMatchConstraint(matchType as MatchType);
                    potentialMatches.push(constraint.matchArrayElements(leftArray, rightArray));
                }
            }
        }

        return potentialMatches;
    }

    /**
     * Within an array's list of sub-changes (matched up properties changes), find array changes and match their unmatched properties.
     */
    private matchOutOfTree(subChanges: ArraySubElement[]): [ArraySubElement[], number] {
        const rightPotentialMatches = new Map<string, TrackedElement[]>();
        const leftPotentialMatches = new Map<string, TrackedElement[]>();

        for (const subChange of subChanges) {
            for (const subChangeChanges of subChange.changes) {
                if (subChangeChanges instanceof ArrayChanged) {
                    for (const potentialLeftMatches of subChangeChanges.leftOnly) {
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

                    for (const potentialRightMatches of subChangeChanges.rightOnly) {
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
        let numChanges = 0;
        for (const [condition, leftArrayItems] of leftPotentialMatches) {
            const rightArrayItems = rightPotentialMatches.get(condition);
            if (leftArrayItems && rightArrayItems) {
                const { 2: conditionMatches, 4: conditionChanges } = this.compareArrays(
                    leftArrayItems,
                    rightArrayItems,
                    condition,
                    true,
                );
                matches.push(...conditionMatches);
                numChanges += conditionChanges;
            }
        }

        return [matches, numChanges];
    }
}
