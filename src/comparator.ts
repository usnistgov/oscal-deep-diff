import {
    getPropertyUnion,
    getType,
    getPropertyIntersection,
    countSubElements,
    Condition,
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
} from './comparisons';
import {
    ObjectPropertyMatchConstraint,
    MatchType,
    PrimitiveMatchConstraint,
    MatchReport,
    MatchConstraintsContainer,
} from './matching';
import { MemoizationCache } from './cache';

/**
 * The Comparator class is designed to handle comparing two arbritrary JSON
 * documents, with support for customizable constraints to fit particular
 * schemas.
 */
export class Comparator {
    private _verbose: boolean = false;

    public set verbose(verbose: boolean) {
        this._verbose = verbose;
    }

    private _memoizationEnabled: boolean = true;

    public set memoizationEnabled(memoizationEnabled: boolean) {
        this._memoizationEnabled = memoizationEnabled;
    }

    private cache = new MemoizationCache();

    private _constraints: MatchConstraintsContainer;

    public set constraints(constraints: MatchConstraintsContainer) {
        this._constraints = constraints;
    }

    private _ignoreConditions: Condition[] = [];

    public set ignoreConditions(ignoreConditions: Condition[]) {
        this._ignoreConditions = ignoreConditions;
    }

    private _comparison: Comparison | undefined;

    public get comparison(): Comparison {
        if (this._comparison === undefined) {
            throw new Error('Attempted to get comparison before comparing two documents');
        }
        return this._comparison;
    }

    constructor(
        constraints: MatchConstraintsContainer = new MatchConstraintsContainer([]),
        ignoreConditions: Condition[] = [],
    ) {
        this._constraints = constraints;
        this._ignoreConditions = ignoreConditions;
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
        leftDocument: object,
        leftDocumentSource: string,
        rightDocument: object,
        rightDocumentSource: string,
    ) {
        const changes: Change[] = [];
        if (this._verbose) {
            console.log(`Starting comparison between ${leftDocumentSource} and ${rightDocumentSource}`);
            console.time('compareDocuments');
        }
        this.compareElements(leftDocument, '', rightDocument, '', changes);
        if (this._verbose) {
            console.log('Document comparison completed');
            console.timeEnd('compareDocuments');
        }
        this._comparison = {
            leftDocument: leftDocumentSource,
            rightDocument: rightDocumentSource,
            changes,
        };
    }

    /**
     * Builds ArrayChange object and calculates total number of changes
     * @todo add memoization here to drastically speed up comparison
     * @param leftArray
     * @param leftPointer
     * @param rightArray
     * @param rightPointer
     * @param report
     */
    private tryMatch(
        leftArray: any[],
        leftPointer: string,
        rightArray: any[],
        rightPointer: string,
        report: MatchReport,
    ): [ArrayChanged, number] {
        let changeCount = 0;
        const change = new ArrayChanged(leftPointer, rightPointer, [], [], []);

        // then, iterate through all elements that have been matched and compare the sub-elements
        for (const match of report.matchedIndices) {
            const oldSubElement = `${leftPointer}/${match.leftElementIndex}`;
            const newSubElement = `${rightPointer}/${match.rightElementIndex}`;
            const subChanges: ArraySubElement = {
                leftPointer: oldSubElement,
                rightPointer: newSubElement,
                changes: [],
            };
            changeCount += this.compareElements(
                leftArray[match.leftElementIndex],
                oldSubElement,
                rightArray[match.rightElementIndex],
                newSubElement,
                subChanges.changes,
            );
            if (subChanges.changes.length > 0) {
                change.subChanges.push(subChanges);
            }
        }

        for (const unmatchedOldIndex of report.unmatchedLeftIndices) {
            change.removedItems.push({
                leftPointer: `${leftPointer}/${unmatchedOldIndex}`,
                leftElement: leftArray[unmatchedOldIndex],
            });
            changeCount += countSubElements(leftArray[unmatchedOldIndex]);
        }

        for (const unmatchedNewIndex of report.unmatchedRightIndices) {
            change.addedItems.push({
                rightPointer: `${rightPointer}/${unmatchedNewIndex}`,
                rightElement: rightArray[unmatchedNewIndex],
            });
            changeCount += countSubElements(rightArray[unmatchedNewIndex]);
        }

        return [change, changeCount];
    }

    private compareArrays(
        leftArray: any[],
        leftPointer: string,
        rightArray: any[],
        rightPointer: string,
        currentChanges: Change[],
    ): number {
        if (this._memoizationEnabled) {
            const cached = this.cache.get(leftPointer, rightPointer);
            if (cached) {
                if (cached[0].hasChanges()) {
                    currentChanges.push(cached[0]);
                }
                return cached[1];
            }
        }

        let match;
        let report: MatchReport;
        let constraint = this._constraints.tryGetConstraint(rightPointer);
        if (constraint) {
            report = constraint.matchArrayElements(leftArray, rightArray);
            match = this.tryMatch(leftArray, leftPointer, rightArray, rightPointer, report);
            if (match[0].hasChanges()) {
                currentChanges.push(match[0]);
            }
            return match[1];
        }

        // console.log(`Warning: matching arrays  (old: ${oldPointer}, new: ${newPointer}) without specifying a constraint`);
        if (leftArray.length > 0 && rightArray.length > 0) {
            // assumes that all the relevant matching info can be gathered from the first object
            const oldSample = leftArray[0];
            const newSample = rightArray[0];

            const type = getType(oldSample);
            if (type !== getType(newSample)) throw new Error('Old and new arrays cannot mix and match type');

            if (type === 'array') {
                // TODO: array of arrays comparison
            } else if (type === 'object') {
                let optimalMatch: ArrayChanged | undefined;
                let optimalMatchChanges = Infinity;

                // try all combinations & minimize projected changes
                for (const property of getPropertyIntersection(oldSample, newSample)) {
                    for (const matchType of ['literal', 'string-similarity']) {
                        constraint = new ObjectPropertyMatchConstraint(matchType as MatchType, property);
                        report = constraint.matchArrayElements(leftArray, rightArray);

                        const potentialMatch = this.tryMatch(leftArray, leftPointer, rightArray, rightPointer, report);
                        potentialMatch[0].matchProperty = property;
                        potentialMatch[0].matchMethod = matchType;
                        if (potentialMatch[1] < optimalMatchChanges) {
                            optimalMatch = potentialMatch[0];
                            optimalMatchChanges = potentialMatch[1];
                        }
                    }
                }

                if (optimalMatch) {
                    if (this._memoizationEnabled) {
                        this.cache.set(leftPointer, rightPointer, [optimalMatch, optimalMatchChanges]);
                    }

                    if (optimalMatch.hasChanges()) {
                        currentChanges.push(optimalMatch);
                    }
                    return optimalMatchChanges;
                }
            } else {
                // array of primitives
                constraint = new PrimitiveMatchConstraint('literal');
                report = constraint.matchArrayElements(leftArray, rightArray);

                match = this.tryMatch(leftArray, leftPointer, rightArray, rightPointer, report);
                if (match[0].hasChanges()) {
                    match[0].matchMethod = 'literal';
                    currentChanges.push(match[0]);
                }

                return match[1];
            }
        }

        report = {
            matchedIndices: [],
            unmatchedLeftIndices: [...leftArray.keys()],
            unmatchedRightIndices: [...rightArray.keys()],
        };
        match = this.tryMatch(leftArray, leftPointer, rightArray, rightPointer, report);

        if (match[0].hasChanges()) {
            currentChanges.push(match[0]);
        }
        return match[1];
    }

    private compareObjects(
        leftElement: any,
        leftPointer: string,
        rightElement: any,
        rightPointer: string,
        currentChanges: Change[],
    ): number {
        // elements are both objects, compare each sub-element in the object
        let changeCount = 0;
        const propertyUnion = getPropertyUnion(leftElement, rightElement);
        for (const property of propertyUnion) {
            // for each property in both subdocuments, recurse and compare results
            if (!(property in leftElement)) {
                // property added in new document
                currentChanges.push(
                    new PropertyAdded(leftPointer, `${rightPointer}/${property}`, rightElement[property]),
                );
                changeCount += countSubElements(rightElement[property]);
            } else if (!(property in rightElement)) {
                // property deleted from old document
                currentChanges.push(
                    new PropertyDeleted(`${leftPointer}/${property}`, leftElement[property], rightPointer),
                );
                changeCount += countSubElements(leftElement[property]);
            } else {
                // property exists in both, recurse on sub-document
                changeCount += this.compareElements(
                    leftElement[property],
                    `${leftPointer}/${property}`,
                    rightElement[property],
                    `${rightPointer}/${property}`,
                    currentChanges,
                );
            }
        }
        return changeCount;
    }

    /**
     * Determine if the given elements are objects, arrays, or primitives, and
     * perform a comparison on the elements based on which 'type' they are
     * @param oldElement
     * @param oldPointer
     * @param newElement
     * @param newPointer
     * @param currentChanges
     * @returns a number representing the number of changes
     */
    private compareElements(
        oldElement: any,
        oldPointer: string,
        newElement: any,
        newPointer: string,
        currentChanges: Change[],
    ): number {
        // verify that elements are of the same 'type' (no arrays compared to objects)
        const type = getType(oldElement);
        if (type !== getType(newElement)) throw new Error('Old and new (sub)document do not have the same type');

        // check if elements have been marked as ignored
        for (const ignoreCondition of this._ignoreConditions) {
            if (testPointerCondition(oldPointer, ignoreCondition)) {
                return 0;
            }
        }

        if (type === 'array') {
            // elements are arrays, array objects need to be matched before comparing their children
            return this.compareArrays(oldElement, oldPointer, newElement, newPointer, currentChanges);
        } else if (type === 'object') {
            // elements are both objects, compare each sub-element in the object
            return this.compareObjects(oldElement, oldPointer, newElement, newPointer, currentChanges);
        } else {
            // elements can be considered a primitive type
            if (oldElement !== newElement) {
                // directly compare primitives
                currentChanges.push(new PropertyChanged(oldElement, oldPointer, newElement, newPointer));
                return 1;
            }
            return 0;
        }
    }
}
