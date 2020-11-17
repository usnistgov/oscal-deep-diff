import {
    getPropertyUnion,
    getType,
    countSubElements,
    testPointerCondition,
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
} from './comparisons';
import {
    MatchInstructions,
    generatePotentialMatches,
} from './matching';
import { MemoizationCache } from './cache';
import { Config } from './config';

// Tuple of array changes and number of subchanges
type ComparisonResults = [Change[], number];
const NO_CHANGES: ComparisonResults = [[], 0]

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
    
        const [changes, changeCount] = this.compareElements(leftDocument, '', rightDocument, '');

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
    private compareElements(leftElement: any, leftPointer: string, rightElement: any, rightPointer: string): ComparisonResults {
        // verify that elements are of the same 'type' (no arrays compared to objects)
        const type = getType(leftElement);
        if (type !== getType(rightElement)) {
            throw new Error('Left and right (sub)document do not have the same type');
        }

        // check if elements have been marked as ignored
        for (const ignoreCondition of this.config.ignore) {
            if (testPointerCondition(leftPointer, ignoreCondition)) {
                return NO_CHANGES;
            }
        }

        if (type === 'array') {
            // elements are arrays, array objects need to be matched before comparing their children
            return this.compareArrays(leftElement, leftPointer, rightElement, rightPointer);
        } else if (type === 'object') {
            // elements are both objects, compare each sub-element in the object
            return this.compareObjects(leftElement, leftPointer, rightElement, rightPointer);
        } else if (type === 'string' && this.config.ignoreCase) {
            if ((leftElement as string).toLowerCase() !== (rightElement as string).toLowerCase()) {
                return [[new PropertyChanged(leftElement, leftPointer, rightElement, rightPointer)], 1];
            }
            return NO_CHANGES;
        }
        // elements can be considered a primitive type
        if (leftElement !== rightElement) { // directly compare primitives
            return [[new PropertyChanged(leftElement, leftPointer, rightElement, rightPointer)], 1];
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
    private compareObjects(leftElement: any, leftPointer: string, rightElement: any, rightPointer: string): ComparisonResults {
        // elements are both objects, compare each sub-element in the object
        let changeCount = 0;
        const changes: Change[] = [];

        const propertyUnion = getPropertyUnion(leftElement, rightElement);

        for (const property of propertyUnion) {
            // for each property in both subdocuments, recurse and compare results
            if (!(property in leftElement)) {
                // property added in right document
                changes.push(
                    new PropertyAdded(leftPointer, `${rightPointer}/${property}`, rightElement[property]),
                );
                changeCount += countSubElements(rightElement[property]);
            } else if (!(property in rightElement)) {
                // property deleted from left document
                changes.push(
                    new PropertyDeleted(`${leftPointer}/${property}`, leftElement[property], rightPointer),
                );
                changeCount += countSubElements(leftElement[property]);
            } else {
                // property exists in both, recurse on sub-document
                const [subChanges, subChangeCount] = this.compareElements(leftElement[property], `${leftPointer}/${property}`, rightElement[property], `${rightPointer}/${property}`);

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
    private compareArrays(leftArray: any[], leftPointer: string, rightArray: any[], rightPointer: string): ComparisonResults {
        if (!this.config.disableMemoization) {
            const cached = this.cache.get(leftPointer, rightPointer);
            if (cached) {
                const [cachedChanges, cachedScore] = cached
                if (cachedChanges.hasChanges()) {
                    return [[cachedChanges], cachedScore]
                }
                return NO_CHANGES;
            }
        }

        let potentialMatches: MatchInstructions[];

        const constraint = this.config.constraints.tryGetConstraint(rightPointer);
        if (constraint) {
            potentialMatches = [constraint.matchArrayElements(leftArray, rightArray)];
        } else {
            potentialMatches = generatePotentialMatches(leftArray, rightArray);
        }

        let optimalMatchScore = Infinity;
        let optimalMatchChanges: ArrayChanged | undefined;

        for (const potentialMatch of potentialMatches) {
            const [potentialMatchChanges, potentialMatchScore] = this.matchArrays(leftArray, leftPointer, rightArray, rightPointer, potentialMatch);

            if (potentialMatchScore < optimalMatchScore) {
                optimalMatchScore = potentialMatchScore;
                optimalMatchChanges = potentialMatchChanges;
            }
        }

        if (optimalMatchChanges) {
            if (!this.config.disableMemoization) {
                this.cache.set(leftPointer, rightPointer, [optimalMatchChanges, optimalMatchScore]);
            }
            if(optimalMatchChanges.hasChanges()) {
                return [[optimalMatchChanges], optimalMatchScore];
            }
        }
        return NO_CHANGES; // no changes
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
    private matchArrays(leftArray: any[], leftPointer: string, rightArray: any[], rightPointer: string, instructions: MatchInstructions): [ArrayChanged, number] {
        let changeCount = 0;
        const change = new ArrayChanged(leftPointer, rightPointer, [], [], []);

        // iterate through all elements that have been matched and compare their sub-elements
        for (const match of instructions.matchedIndices) {
            if (match.confidence && match.confidence >= this.config.minimumConfidenceThreshold) {
                // discard matches with a confidence under the threshold
                instructions.unmatchedLeftIndices.push(match.leftElementIndex);
                instructions.unmatchedRightIndices.push(match.rightElementIndex);
                continue;
            }

            const leftSubElement = `${leftPointer}/${match.leftElementIndex}`;
            const rightSubElement = `${rightPointer}/${match.rightElementIndex}`;
            const subChanges: ArraySubElement = {
                leftPointer: leftSubElement,
                rightPointer: rightSubElement,
                changes: [],
            };
            let subChangeCount;

            [subChanges.changes, subChangeCount] = this.compareElements(leftArray[match.leftElementIndex], leftSubElement, rightArray[match.rightElementIndex], rightSubElement);

            if (subChanges.changes.length > 0) {
                change.subChanges.push(subChanges);
                changeCount += subChangeCount;
            }
        }

        for (const unmatchedLeftIndex of instructions.unmatchedLeftIndices) {
            change.removedItems.push({
                leftPointer: `${leftPointer}/${unmatchedLeftIndex}`,
                leftElement: leftArray[unmatchedLeftIndex],
            });
            changeCount += countSubElements(leftArray[unmatchedLeftIndex]);
        }

        for (const unmatchedRightIndex of instructions.unmatchedRightIndices) {
            change.addedItems.push({
                rightPointer: `${rightPointer}/${unmatchedRightIndex}`,
                rightElement: rightArray[unmatchedRightIndex],
            });
            changeCount += countSubElements(rightArray[unmatchedRightIndex]);
        }

        return [change, changeCount];
    }
}
