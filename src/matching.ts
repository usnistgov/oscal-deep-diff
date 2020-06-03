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

export abstract class MatchConstraint {
    constraint_name: string;

    abstract scoreElementPair(oldElement: any, newElement: any): number;

    public matchArrayElements(oldArray: any[], newArray: any[]): MatchReport {
        let report: MatchReport = {
            matchedIndices: [],
            unmatchedOldIndices: [],
            unmatchedNewIndices: []
        }

        let newArrayIndices = [...newArray.keys()];
        for (let oldElementIndex = 0; oldElementIndex < oldArray.length; oldElementIndex++) {
            const oldElement = oldArray[oldElementIndex];
            let topScore = 0, topScoreIndex = -1;
            for (const newElementIndex of newArrayIndices) {
                const newElement = newArray[newElementIndex];
                const score = this.scoreElementPair(oldElement, newElement);
                if (score > topScore) {
                    topScore = score;
                    topScoreIndex = newElementIndex;
                    if (score == 1) break;
                }
            }
            if (topScoreIndex == -1) {
                report.unmatchedOldIndices.push(oldElementIndex)
            } else {
                const deleteIndex = newArrayIndices.indexOf(topScoreIndex)
                newArrayIndices.splice(deleteIndex, 1);
                report.matchedIndices.push({
                    oldElementIndex: oldElementIndex,
                    newElementIndex: topScoreIndex
                });
            }
        }

        report.unmatchedNewIndices = newArrayIndices;

        return report;
    }

    public constructor(constraint_name: string) {
        this.constraint_name = constraint_name;
    }
}

export class PrimitiveMatchConstraint extends MatchConstraint {
    matchType: MatchType;

    scoreElementPair(oldElement: any, newElement: any): number {
        if (this.matchType == 'literal') {
            return oldElement === newElement ? 1 : 0;
        } else if (this.matchType == 'string-similarity') {
            return jaroWrinkerSimilarity(oldElement, newElement);
        } else {
            throw new Error("unknown comparison type");
        }
    }

    public constructor(matchType: MatchType) {
        super("PrimitiveMatchConstraint");
        this.matchType = matchType;
    }
}

export class ObjectPropertyMatchConstraint extends MatchConstraint {
    matchType: MatchType;
    propertyName: string;
    secondaryProperties?: string;
    
    scoreElementPair(oldElement: any, newElement: any): number {
        if (this.secondaryProperties) {
            for (const secondaryProperty of this.secondaryProperties) {
                if (oldElement[secondaryProperty] !== newElement[secondaryProperty]) {
                    return 0;
                }
            }
        }

        if (this.matchType == 'literal') {
            return oldElement[this.propertyName] == newElement[this.propertyName] ? 1 : 0;
        } else if (this.matchType == 'string-similarity') {
            return jaroWrinkerSimilarity(oldElement[this.propertyName], newElement[this.propertyName]);
        } else {
            throw new Error("unknown comparison type");
        }
    }

    public constructor(matchType: MatchType, propertyName: string, secondaryProperties?: string) {
        super("ObjectPropertyMatchConstraint");
        this.matchType = matchType;
        this.propertyName = propertyName;
        this.secondaryProperties = secondaryProperties;
    }
}

export type MatchType = "literal" | "string-similarity"

export class PathCondition {
    condition: string;
    constraint: MatchConstraint

    public matches(docPath: string): boolean {
        return false;
    }

    public constructor(condition: string, constraint: MatchConstraint) {
        this.condition = condition;
        this.constraint = constraint;
    }
}