import { MatchConstraintsContainer } from "./matching";

export class Config {
    // matching pointer conditions will not be considered during comparison (non-array) operations
    public ignoreFieldsForComparison: string[];
    // matching pointer conditions will not be considered during matching (array) operations
    public ignoreFieldsForMatchComparison: string[];
    public ignoreCase: boolean;
    public constraints: MatchConstraintsContainer;
    public outOfTreeMatching: boolean;
    public excludeContent: boolean;
    public disableMemoization: boolean;
    public minimumConfidenceThreshold: number;

    constructor(ignoreFieldsForComparison: string[], ignoreFieldsForMatchComparison: string[], ignoreCase: boolean, constraints: MatchConstraintsContainer, outOfTreeMatching=false, minimumConfidenceThreshold=.8, excludeContent=false, disableMemoization=false) {
        this.ignoreFieldsForComparison = ignoreFieldsForComparison;
        this.ignoreFieldsForMatchComparison = ignoreFieldsForMatchComparison;
        this.ignoreCase = ignoreCase;
        this.constraints = constraints;

        this.outOfTreeMatching = outOfTreeMatching;
        this.minimumConfidenceThreshold = minimumConfidenceThreshold;
        this.disableMemoization = disableMemoization;
        this.excludeContent = excludeContent;
    }

    public static fromDict(obj: any): Config {
        const {
            ignoreFieldsForComparison,
            ignoreFieldsForMatchComparison,
            ignoreCase,
            constraints: constraintsSubObj,
            outOfTreeMatching,
            minimumConfidenceThreshold,
            disableMemoization,
            excludeContent,
            ...unknownOptions
        } = obj;

        const constraints = MatchConstraintsContainer.fromDict(constraintsSubObj);
        
        console.log('WARNING: Unknown options in YAML config:', unknownOptions);

        return new Config(ignoreFieldsForComparison,
            ignoreFieldsForMatchComparison,
            ignoreCase,
            constraints,
            outOfTreeMatching,
            minimumConfidenceThreshold,
            disableMemoization,
            excludeContent);
    }
}

export const defaultConfig = new Config([], [], true, new MatchConstraintsContainer([]));
