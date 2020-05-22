import { MatchConstraint } from "./configuration";
import { jaroWrinkerSimilarity } from "./string-similarity";

export interface PotentialMatch {
    oldElementIndex: number;
    newElementIndex: number;
    confidence?: number; // only used in similarity functions
}

export interface MatchReport {
    matchedIndices: PotentialMatch[];
    unmatchedOldIndices: number[];
    unmatchedNewIndices: number[];
}

export function scoreMatchPair(oldElement: any, newElement: any, constraint: MatchConstraint): number {
    if (constraint.secondaryMatch) {
        for (const secondaryProperty of constraint.secondaryMatch) {
            if (oldElement[secondaryProperty] !== newElement[secondaryProperty]) {
                return 0;
            }
        }
    }

    if (constraint.matchType == 'literal') {
        return oldElement[constraint.matchByProperty] == newElement[constraint.matchByProperty] ? 1 : 0;
    } else if (constraint.matchType == 'ranked-string-similarity') {
        // TODO: support multiple types of string similarity
        return jaroWrinkerSimilarity(oldElement[constraint.matchByProperty], newElement[constraint.matchByProperty]);
    } else {
        throw new Error('unknown comparisonType');
    }
}

export function matchWithConstraint(oldArray: Array<any>, newArray: Array<any>, constraint: MatchConstraint): MatchReport {
    let report: MatchReport = {
        matchedIndices: [],
        unmatchedOldIndices: [],
        unmatchedNewIndices: [],
    };
    let totalItems = oldArray.length + newArray.length; // used to calculate score

    let newArrayIndices = [...newArray.keys()]; // create array of remaining keys, indices are removed on match
    for (let oldElementIndex = 0; oldElementIndex < oldArray.length; oldElementIndex++) {
        const oldElement = oldArray[oldElementIndex];
        let topScore = 0, topScoreIndex = -1;        
        for (const newElementIndex of newArrayIndices) {
            const newElement = newArray[newElementIndex];
            const score = scoreMatchPair(oldElement, newElement, constraint);
            if (score > topScore) {
                topScore = score;
                topScoreIndex = newElementIndex;
                if (score == 1) { // assured positive match   
                    break;
                }    
            }
        }
        if (topScoreIndex == -1) { // no match found
            report.unmatchedOldIndices.push(oldElementIndex);
        } else {
            const deleteIndex = newArrayIndices.indexOf(topScoreIndex)
            newArrayIndices.splice(deleteIndex, 1);
            report.matchedIndices.push({
                oldElementIndex: oldElementIndex,
                newElementIndex: topScoreIndex,
            });
        }
    }

    report.unmatchedNewIndices = newArrayIndices; // remaining are unmatched

    return report;
}
