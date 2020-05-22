import { getPropertyUnion, getType, loadJSON, getPropertyIntersection, countSubElements } from "./utils";
import { PropertyAdded, PropertyDeleted, PropertyChanged, ArrayChanged, Comparison, Change } from './comparisons';
import { ComparatorOptions } from "./configuration";
import { matchWithConstraint, MatchReport as PotentialMatchReport } from "./matching";

export class Comparator {
    private options: ComparatorOptions;
    constructor (options?: ComparatorOptions) {
        if (options) {
            this.options = options;
        } else {
            console.warn('Comparator initialized with no options, this will be much slower');
            this.options = {
                matchConstraints: [],
                compareConstraints: [],
            };
        }
    }

    public compareDocuments(oldDocumentPath: string, newDocumentPath: string): Comparison {
        const changes: Change[] = [];
        this.compare(loadJSON(oldDocumentPath), "", loadJSON(newDocumentPath), "", changes);
        
        const comparison = {
            oldDocument: oldDocumentPath,
            newDocument: newDocumentPath,
            changes: changes
        }

        return comparison;
    }

    private tryConstrainedCompare(oldElement: any, oldPointer: string, newElement: any, newPointer: string, currentChanges: Change[]): number {
        return -1; // unimplemented
    }

    private tryConstrainedMatch(oldArray: Array<any>, oldPointer: string, newArray: Array<any>, newPointer: string, currentChanges: Change[]): number {
        return -1; // unimplemented
    }

    /**
     * Builds ArrayChange object and calculates total number of changes
     * @param oldArray 
     * @param oldPointer 
     * @param newArray 
     * @param newPointer 
     * @param report 
     */
    private simulateMatch(oldArray: Array<any>, oldPointer: string, newArray: Array<any>, newPointer: string, report: PotentialMatchReport): [ArrayChanged, number] {
        let changeCount = 0;
        const change = new ArrayChanged(oldPointer, newPointer, [], [], []);

        // then, iterate through all elements that have been matched and compare the sub-elements
        for (const match of report.matchedIndices) {
            changeCount += this.compare(oldArray[match.oldElementIndex], `${oldPointer}/${match.oldElementIndex}`, newArray[match.newElementIndex], `${newPointer}/${match.newElementIndex}`, change.subChanges);
        }

        for (const unmatchedOldIndex of report.unmatchedOldIndices) {
            change.removedItems.push({
                oldPointer: `${oldPointer}/${unmatchedOldIndex}`,
                oldElement: oldArray[unmatchedOldIndex]
            });
            changeCount += countSubElements(oldArray[unmatchedOldIndex]);
        }

        for (const unmatchedNewIndex of report.unmatchedNewIndices) {
            change.addedItems.push({
                newPointer: `${newPointer}/${unmatchedNewIndex}`,
                newElement: newArray[unmatchedNewIndex],
            });
            changeCount += countSubElements(newArray[unmatchedNewIndex]);
        }

        return [change, changeCount];
    }

    private match(oldArray: Array<any>, oldPointer: string, newArray: Array<any>, newPointer: string, currentChanges: Change[]): number {
        const constrainedMatchScore = this.tryConstrainedMatch(oldArray, oldPointer, newArray, newPointer, currentChanges);
        if (constrainedMatchScore == -1) { // constrained match failed / not defined, try manual match
            // console.log(`Warning: matching arrays  (old: ${oldPointer}, new: ${newPointer}) without specifying a constraint`);
            if (oldArray.length > 0 && newArray.length > 0) {
                let optimalMatch: ArrayChanged | undefined;
                let optimalMatchChanges = Infinity;
                // try all combinations & minimize projected changes
                for (const property of getPropertyIntersection(oldArray[0], newArray[0])) {
                    for (const matchType of ['literal', 'ranked-string-similarity']) {
                        let report = matchWithConstraint(oldArray, newArray, {
                            parentName: '',
                            matchByProperty: property,
                            matchType: matchType
                        })
                        let potentialMatch = this.simulateMatch(oldArray, oldPointer, newArray, newPointer, report)
                        potentialMatch[0].matchProperty = property;
                        potentialMatch[0].matchMethod = matchType;
                        if (potentialMatch[1] < optimalMatchChanges) {
                            optimalMatch = potentialMatch[0];
                        }
                    }
                }

                if (optimalMatch) {
                    if (optimalMatch.hasChanges()) {
                        currentChanges.push(optimalMatch);
                    }
                    return optimalMatchChanges;
                }
            }
        } else {
            return constrainedMatchScore;
        }

        const report: PotentialMatchReport = {
            matchedIndices: [],
            unmatchedOldIndices: [...oldArray.keys()],
            unmatchedNewIndices: [...newArray.keys()]
        };
        const match = this.simulateMatch(oldArray, oldPointer, newArray, newPointer, report);

        if (match[0].hasChanges()) {
            currentChanges.push(match[0]);
        }
        return match[1];
    }

    private compare(oldElement: any, oldPointer: string, newElement: any, newPointer: string, currentChanges: Change[]): number {
        // verify that elements are of the same 'type' (no arrays compared to objects)
        const type = getType(oldElement);
        if (type != getType(newElement)) throw new Error('Old and new (sub)document do not have the same type');

        // try to compare element using comparison constraint
        const constrainedCompareScore = this.tryConstrainedCompare(oldElement, oldPointer, newElement, newPointer, currentChanges);
        if (constrainedCompareScore == -1) {
            if (type === 'array') {
                return this.match(oldElement, oldPointer, newElement, newPointer, currentChanges);
            } else if (type === 'object') {
                let changeCount = 0;
                const propertyUnion = getPropertyUnion(oldElement, newElement);
                for (const property of propertyUnion) { // for each property in both subdocuments, recurse and compare results
                    if (!(property in oldElement)) { // property added in new document
                        currentChanges.push(new PropertyAdded(oldPointer, `${newPointer}/${property}`, newElement[property]));
                        changeCount += countSubElements(newElement[property]);
                    } else if (!(property in newElement)) { // property deleted from old document
                        currentChanges.push(new PropertyDeleted(`${oldPointer}/${property}`, oldElement[property], newPointer));
                        changeCount += countSubElements(oldElement[property]);
                    } else { // property exists in both, recurse on sub-document
                        changeCount += this.compare(oldElement[property], `${oldPointer}/${property}`, newElement[property], `${newPointer}/${property}`, currentChanges);
                    }
                }
                return changeCount;
            } else {
                if (oldElement != newElement) { // directly compare primitives
                    currentChanges.push(new PropertyChanged(oldElement, oldPointer, newElement, newPointer));
                    return 1;
                }
                return 0;
            }    
        } else {
            return constrainedCompareScore;
        }
    }
}
