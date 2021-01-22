import {
    getPropertyUnion,
    countSubElements,
    convertPointerToCondition,
} from './utils';
import {
    PropertyAdded,
    PropertyDeleted,
    PropertyChanged,
    ArrayChanged,
    Comparison,
    Change,
    ArraySubElement,
    excludeContentReplacer,
    RightArrayItem,
    LeftArrayItem,
    ComparisonResult,
} from './comparisons';
import {
    MatchInstructions,
    generatePotentialMatches,
} from './matching';
import { MemoizationCache } from './cache';
import { Config } from './config';
import { TrackedArray, TrackedElement, TrackedObject, TrackedPrimitive, trackRawObject } from './tracked';

// Tuple of array changes and number of subchanges
const NO_CHANGES: ComparisonResult = [[], 0]

/**
 * The Comparator class is designed to handle comparing two arbritrary JSON
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
    public newComparison(leftDocument: object, leftDocumentSource: string, rightDocument: object, rightDocumentSource: string) {
        console.log(`Starting comparison between ${leftDocumentSource} and ${rightDocumentSource}`);
        console.time('compareDocuments');
    
        const [changes, changeCount] = this.compareElements(trackRawObject('', leftDocument), trackRawObject('', rightDocument));

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
     * @param leftElement
     * @param leftPointer
     * @param rightElement
     * @param rightPointer
     * @returns a number representing the number of changes
     */
    private compareElements(left: TrackedElement, right: TrackedElement): ComparisonResult {
        // check if elements have been marked as ignored
        for (const ignoreCondition of this.config.ignore) {
            if (left.testPointerCondition(ignoreCondition)) {
                return NO_CHANGES;
            }
        }

        if (left instanceof TrackedArray && right instanceof TrackedArray) {
            return this.compareArrays(left, right);
        } else if (left instanceof TrackedObject && right instanceof TrackedObject) {
            // elements are both objects, compare each sub-element in the object
            return this.compareObjects(left, right);
        } else if (left instanceof TrackedPrimitive && right instanceof TrackedPrimitive) {
            if (left.raw instanceof String && right.raw instanceof String && this.config.ignoreCase) {
                if ((left.raw as string).toLowerCase() !== (right.raw as string).toLowerCase()) {
                    return [[new PropertyChanged(left.raw, left.pointer, right.raw, right.pointer)], 1];
                }
            } else if (left.raw !== right.raw) { // directly compare primitives
                return [[new PropertyChanged(left.raw, left.pointer, right.raw, right.pointer)], 1];
            }
        } else {
            throw new Error('Left and right (sub)document do not have the same type');
        }

        return NO_CHANGES;
    }

    /**
     * Compare object pairs property by property, recursing on each matched property pair
     * @param leftElement 
     * @param leftPointer 
     * @param rightElement 
     * @param rightPointer 
     */
    private compareObjects(left: TrackedObject, right: TrackedObject): ComparisonResult {
        // elements are both objects, compare each sub-element in the object
        let changeCount = 0;
        const changes: Change[] = [];

        const propertyUnion = getPropertyUnion(left.raw, right.raw);

        for (const property of propertyUnion) {
            // for each property in both subdocuments, recurse and compare results
            if (!(property in left.raw)) {
                // property added in right document
                changes.push(
                    new PropertyAdded(left.pointer, `${right.pointer}/${property}`, right.raw[property]),
                );
                changeCount += countSubElements(right.raw[property]);
            } else if (!(property in right.raw)) {
                // property deleted from left document
                changes.push(
                    new PropertyDeleted(`${left.pointer}/${property}`, left.raw[property], right.pointer),
                );
                changeCount += countSubElements(left.raw[property]);
            } else {
                // property exists in both, recurse on sub-document
                const [subChanges, subChangeCount] = this.compareElements(left.resolve(property), right.resolve(property));

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
     * @param leftArray 
     * @param leftPointer 
     * @param rightArray 
     * @param rightPointer 
     */
    private compareArrays(left: TrackedArray, right: TrackedArray): ComparisonResult {
        if (!this.config.disableMemoization) {
            const cached = this.cache.get(left.pointer, right.pointer);
            if (cached) {
                const [cachedChanges, cachedScore] = cached
                if (cachedChanges.hasChanges()) {
                    return [[cachedChanges], cachedScore]
                }
                return NO_CHANGES;
            }
        }

        let potentialMatches: MatchInstructions[];

        const constraint = this.config.constraints.tryGetConstraint(left.pointer);
        if (constraint) {
            potentialMatches = [constraint.matchArrayElements(left.raw, right.raw)];
        } else {
            potentialMatches = generatePotentialMatches(left.raw, right.raw);
        }

        // todo: add the ability to cache chosen constraints for consistent comparison of arrays with the same pointer location

        let optimalMatchScore = Infinity;
        let optimalMatchChanges: ArrayChanged | undefined;

        for (const potentialMatch of potentialMatches) {
            const [potentialMatchChanges, potentialMatchScore] = this.matchArrays(left, right, potentialMatch);

            if (potentialMatchScore < optimalMatchScore) {
                optimalMatchScore = potentialMatchScore;
                optimalMatchChanges = potentialMatchChanges;
            }
        }

        if (optimalMatchChanges) {
            if (!this.config.disableMemoization) {
                this.cache.set(left.pointer, right.pointer, [optimalMatchChanges, optimalMatchScore]);
            }
            if(optimalMatchChanges.hasChanges()) {
                return [[optimalMatchChanges], optimalMatchScore];
            }
        }
        return NO_CHANGES;
    }

    /**
     * Within an array's list of sub-changes (matched up properties changes), find array changes and match their unmatched properties.
     * @param leftPointer 
     * @param rightPointer 
     * @param subChanges 
     */
    private matchOutOfTree(subChanges: ArraySubElement[]): ArraySubElement[] {
        const rightPotentialMatches = new Map<string, RightArrayItem[]>();
        const leftPotentialMatches = new Map<string, LeftArrayItem[]>();

        const matches: ArraySubElement[] = [];

        for (const subChange of subChanges) {
            for (const subChangeChanges of subChange.changes) {
                if (subChangeChanges instanceof ArrayChanged) {
                    for (const potentialLeftMatches of subChangeChanges.removedItems) {
                        const condition = convertPointerToCondition(potentialLeftMatches.leftPointer);
                        const potentialMatches = leftPotentialMatches.get(condition);
                        if (potentialMatches) {
                            potentialMatches.push(potentialLeftMatches);
                        } else {
                            leftPotentialMatches.set(condition, [potentialLeftMatches]);
                        }
                    }

                    for (const potentialRightMatches of subChangeChanges.addedItems) {
                        const condition = convertPointerToCondition(potentialRightMatches.rightPointer);
                        const potentialMatches = rightPotentialMatches.get(condition);
                        if (potentialMatches) {
                            potentialMatches.push(potentialRightMatches);
                        } else {
                            rightPotentialMatches.set(condition, [potentialRightMatches]);
                        }
                    }
                }
            }
        }

        for (const [condition, leftArrayItems] of leftPotentialMatches) {
            const rightArrayItems = rightPotentialMatches.get(condition);
            if (leftArrayItems && rightArrayItems) {
                // TODO: compare arrays needs to be changed to use tracked items instead of assuming common parent
                // THIS IS INCORRECT! AND PRODUCES THE broken json outputs everywhere
                const leftArray = new TrackedArray(condition, leftArrayItems.map(item => item.leftElement));
                const rightArray = new TrackedArray(condition, rightArrayItems.map(item => item.rightElement));
                const [changes] = this.compareArrays(leftArray, rightArray);
                if (changes[0] && changes[0] instanceof ArrayChanged) {
                    const arraySubChange: ArrayChanged = changes[0];
                    matches.push(...arraySubChange.subChanges);
                }
            }
        }

        return matches;
    }

    /**
     * Match array pairs together based on instructions, building an ArrayChanged
     * object by recursing on each matched pair and returning the total number of
     * changed sub-elements.
     * @param leftArray
     * @param leftPointer
     * @param rightArray
     * @param rightPointer
     * @param instructions Object defining which element pairs should be matched
     */
    private matchArrays(left: TrackedArray, right: TrackedArray, instructions: MatchInstructions): [ArrayChanged, number] {
        let changeCount = 0;
        const change = new ArrayChanged(left.pointer, right.pointer, [], [], []);

        // iterate through all elements that have been matched and compare their sub-elements
        for (const match of instructions.matchedIndices) {
            if (match.confidence && match.confidence >= this.config.minimumConfidenceThreshold) {
                // discard matches with a confidence under the threshold
                instructions.unmatchedLeftIndices.push(match.leftElementIndex);
                instructions.unmatchedRightIndices.push(match.rightElementIndex);
                continue;
            }

            const leftSubElement = left.getIndex(match.leftElementIndex);
            const rightSubElement = right.getIndex(match.rightElementIndex);
            const subChanges: ArraySubElement = {
                leftPointer: leftSubElement.pointer,
                rightPointer: rightSubElement.pointer,
                changes: [],
            };
            let subChangeCount;

            [subChanges.changes, subChangeCount] = this.compareElements(left, right);

            if (subChanges.changes.length > 0) {
                change.subChanges.push(subChanges);
                changeCount += subChangeCount;
            }
        }

        for (const unmatchedLeftIndex of instructions.unmatchedLeftIndices) {
            change.removedItems.push({
                leftPointer: `${left.pointer}/${unmatchedLeftIndex}`,
                leftElement: left.raw[unmatchedLeftIndex],
            });
            changeCount += countSubElements(left.raw[unmatchedLeftIndex]);
        }

        for (const unmatchedRightIndex of instructions.unmatchedRightIndices) {
            change.addedItems.push({
                rightPointer: `${right.pointer}/${unmatchedRightIndex}`,
                rightElement: right.raw[unmatchedRightIndex],
            });
            changeCount += countSubElements(right.raw[unmatchedRightIndex]);
        }

        // match indices that could be out of tree
        if (this.config.outOfTreeMatching) {
            const outOfTreeMatches = this.matchOutOfTree(change.subChanges);
            if (outOfTreeMatches) {
                change.outOfTreeChanges = outOfTreeMatches;
            }
        }

        return [change, changeCount];
    }
}
