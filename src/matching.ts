import { jaroWrinkerSimilarity } from "./string-similarity";
import { loadJSON } from "./utils";

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

export type MatchType = "literal" | "string-similarity"

export class Constraints {
    private _constraintConditions: PathCondition[];

    public get constraintConditions() {
        return this._constraintConditions;
    }

    public tryGetConstraint(path: string) {
        for (let condition of this._constraintConditions) {
            if (condition.matches(path)) {
                return condition.constraint;
            }
        }
        return null;
    }

    constructor(constraintConditions: PathCondition[]) {
        this._constraintConditions = constraintConditions;
    }

    public static fromJson(obj: any): Constraints {
        let conditions: PathCondition[] = [];
        for (const subobj of obj) {
             let condition = PathCondition.fromJson(subobj);
             conditions.push(condition);
        }
        return new Constraints(conditions);
    }

    public static fromFile(path: string): Constraints {
        const rawObj = loadJSON(path);
        return this.fromJson(rawObj);
    }
}

function MatchConstraintFromJson(obj: any): AbstractMatchConstraint {
    if (!obj.hasOwnProperty('constraint_name')) {
        throw new Error(`Error decoding object ${obj} into MatchConstraint`);
    }

    switch (obj['constraint_name'] as string) {
        case PrimitiveMatchConstraint.name:
            return PrimitiveMatchConstraint.fromJson(obj);
        case ObjectPropertyMatchConstraint.name:
            return ObjectPropertyMatchConstraint.fromJson(obj);
        default:
            throw new Error(`Unkown match constraint: ${obj['constraint_name']}`);
    }
}

export abstract class AbstractMatchConstraint {
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

    public static fromJson(_: any): AbstractMatchConstraint {
        throw new Error("Not implemented");
    }
}

export class PrimitiveMatchConstraint extends AbstractMatchConstraint {
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
        super();
        this.matchType = matchType;
    }

    public static fromJson(obj: any): AbstractMatchConstraint {
        if (!obj.hasOwnProperty('matchType')) {
            throw new Error(`Error decoding object ${obj} into ${ObjectPropertyMatchConstraint.name}`);
        }

        return new PrimitiveMatchConstraint(obj['matchType'] as MatchType);
    }
}

export class ObjectPropertyMatchConstraint extends AbstractMatchConstraint {
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
        super();
        this.matchType = matchType;
        this.propertyName = propertyName;
        this.secondaryProperties = secondaryProperties;
    }

    public static fromJson(obj: any): AbstractMatchConstraint {
        if (!obj.hasOwnProperty('matchType') || !obj.hasOwnProperty('propertyName')) {
            throw new Error(`Error decoding object ${obj} into ${ObjectPropertyMatchConstraint.name}`);
        }

        return new ObjectPropertyMatchConstraint(obj['matchType'] as MatchType, obj['propertyName'], obj['secondaryProperties']);
    }
}

export class PathCondition {
    private _condition!: RegExp;
    private _constraint: AbstractMatchConstraint

    public get constraint() {
        return this._constraint;
    }

    public get condition(): string {
        return this._condition.source;
    }

    public set condition(condition: string) {
        // TODO validate condition
        this._condition = new RegExp(condition);
    }

    /**
     * Returns true if the given json pointer matches the condition string
     * @param docPath 
     */
    public matches(docPath: string): boolean {
        const regex = new RegExp(this._condition);
        return regex.test(docPath);
    }

    public constructor(condition: string, constraint: AbstractMatchConstraint) {
        this.condition = condition;
        this._constraint = constraint;
    }

    public static fromJson(obj: any): PathCondition {
        if (!obj.hasOwnProperty('condition') || !obj.hasOwnProperty('constraint')) {
            throw new Error(`Error decoding object ${obj} into PathCondition`);
        }

        const condition: string = obj['condition'];
        const constraint: AbstractMatchConstraint = MatchConstraintFromJson(obj['constraint']);
        
        return new PathCondition(condition, constraint);
    }
}