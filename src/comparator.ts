import {
    getPropertyUnion,
    getType,
    getPropertyIntersection,
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
    ObjectPropertyMatchConstraint,
    MatchType,
    PrimitiveMatchConstraint,
    MatchReport,
} from './matching';
import { MemoizationCache } from './cache';
import { Config } from './config';

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
    public newComparison(
        leftDocument: object,
        leftDocumentSource: string,
        rightDocument: object,
        rightDocumentSource: string,
    ) {
        const changes: Change[] = [];
        
        console.log(`Starting comparison between ${leftDocumentSource} and ${rightDocumentSource}`);
        console.time('compareDocuments');
    
        this.compareElements(leftDocument, '', rightDocument, '', changes);

        console.log('Document comparison completed');
        console.timeEnd('compareDocuments');

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
        minConfidenceThreshold: number = .8
    ): [ArrayChanged, number] {
        let changeCount = 0;
        const change = new ArrayChanged(leftPointer, rightPointer, [], [], []);

        // then, iterate through all elements that have been matched and compare the sub-elements
        for (const match of report.matchedIndices) {
            if (match.confidence && match.confidence >= minConfidenceThreshold) {
                report.unmatchedLeftIndices.push(match.leftElementIndex);
                report.unmatchedRightIndices.push(match.rightElementIndex);
                continue;
            }

            const leftSubElement = `${leftPointer}/${match.leftElementIndex}`;
            const rightSubElement = `${rightPointer}/${match.rightElementIndex}`;
            const subChanges: ArraySubElement = {
                leftPointer: leftSubElement,
                rightPointer: rightSubElement,
                changes: [],
            };
            changeCount += this.compareElements(
                leftArray[match.leftElementIndex],
                leftSubElement,
                rightArray[match.rightElementIndex],
                rightSubElement,
                subChanges.changes,
            );
            if (subChanges.changes.length > 0) {
                change.subChanges.push(subChanges);
            }
        }

        for (const unmatchedLeftIndex of report.unmatchedLeftIndices) {
            change.removedItems.push({
                leftPointer: `${leftPointer}/${unmatchedLeftIndex}`,
                leftElement: leftArray[unmatchedLeftIndex],
            });
            changeCount += countSubElements(leftArray[unmatchedLeftIndex]);
        }

        for (const unmatchedRightIndex of report.unmatchedRightIndices) {
            change.addedItems.push({
                rightPointer: `${rightPointer}/${unmatchedRightIndex}`,
                rightElement: rightArray[unmatchedRightIndex],
            });
            changeCount += countSubElements(rightArray[unmatchedRightIndex]);
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
        if (!this.config.disableMemoization) {
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
        let constraint = this.config.constraints.tryGetConstraint(rightPointer);
        if (constraint) {
            report = constraint.matchArrayElements(leftArray, rightArray);
            match = this.tryMatch(leftArray, leftPointer, rightArray, rightPointer, report);
            if (match[0].hasChanges()) {
                currentChanges.push(match[0]);
            }
            return match[1];
        }

        // console.log(`Warning: matching arrays  (left: ${leftPointer}, right: ${rightPointer}) without specifying a constraint`);
        if (leftArray.length > 0 && rightArray.length > 0) {
            // assumes that all the relevant matching info can be gathered from the first object
            const leftSample = leftArray[0];
            const rightSample = rightArray[0];

            const type = getType(leftSample);
            if (type !== getType(rightSample)) throw new Error('Left and right arrays cannot mix and match type');

            if (type === 'array') {
                // TODO: array of arrays comparison
            } else if (type === 'object') {
                let optimalMatch: ArrayChanged | undefined;
                let optimalMatchChanges = Infinity;

                // try all combinations & minimize projected changes
                for (const property of getPropertyIntersection(leftSample, rightSample)) {
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
                    if (!this.config.disableMemoization) {
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
                // property added in right document
                currentChanges.push(
                    new PropertyAdded(leftPointer, `${rightPointer}/${property}`, rightElement[property]),
                );
                changeCount += countSubElements(rightElement[property]);
            } else if (!(property in rightElement)) {
                // property deleted from left document
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
     * @param leftElement
     * @param leftPointer
     * @param rightElement
     * @param rightPointer
     * @param currentChanges
     * @returns a number representing the number of changes
     */
    private compareElements(
        leftElement: any,
        leftPointer: string,
        rightElement: any,
        rightPointer: string,
        currentChanges: Change[],
    ): number {
        // verify that elements are of the same 'type' (no arrays compared to objects)
        const type = getType(leftElement);
        if (type !== getType(rightElement)) throw new Error('Left and right (sub)document do not have the same type');

        // check if elements have been marked as ignored
        for (const ignoreCondition of this.config.ignore) {
            if (testPointerCondition(leftPointer, ignoreCondition)) {
                return 0;
            }
        }

        if (type === 'array') {
            // elements are arrays, array objects need to be matched before comparing their children
            return this.compareArrays(leftElement, leftPointer, rightElement, rightPointer, currentChanges);
        } else if (type === 'object') {
            // elements are both objects, compare each sub-element in the object
            return this.compareObjects(leftElement, leftPointer, rightElement, rightPointer, currentChanges);
        } else if (type === 'string' && this.config.ignoreCase) {
            if ((leftElement as string).toLowerCase() !== (rightElement as string).toLowerCase()) {
                currentChanges.push(new PropertyChanged(leftElement, leftPointer, rightElement, rightPointer));
            }
            return 0;
        } else {
            // elements can be considered a primitive type
            if (leftElement !== rightElement) {
                // directly compare primitives
                currentChanges.push(new PropertyChanged(leftElement, leftPointer, rightElement, rightPointer));
                return 1;
            }
            return 0;
        }
    }
}
