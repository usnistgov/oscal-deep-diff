import { MatchConstraintsContainer } from "./matching";
import { JSONObject } from "./utils";

export class Config {
    // matching pointer conditions will not be considered during comparison (non-array) operations
    public ignoreFieldsForComparison: string[];
    // matching pointer conditions will not be considered during matching (array) operations
    public ignoreFieldsForMatchComparison: string[];
    public baseComparisonPaths: string[];
    public ignoreCase: boolean;
    public constraints: MatchConstraintsContainer;
    public outOfTreeMatching: boolean;
    public excludeContent: boolean;
    public disableMemoization: boolean;
    public minimumConfidenceThreshold: number;

    constructor(ignoreFieldsForComparison: string[], ignoreFieldsForMatchComparison: string[], baseComparisonPaths: string[], ignoreCase: boolean, constraints: MatchConstraintsContainer, outOfTreeMatching=false, minimumConfidenceThreshold=.8, excludeContent=false, disableMemoization=false) {
        this.ignoreFieldsForComparison = ignoreFieldsForComparison;
        this.ignoreFieldsForMatchComparison = ignoreFieldsForMatchComparison;
        this.baseComparisonPaths = baseComparisonPaths;
        this.ignoreCase = ignoreCase;
        this.constraints = constraints;

        this.outOfTreeMatching = outOfTreeMatching;
        this.minimumConfidenceThreshold = minimumConfidenceThreshold;
        this.disableMemoization = disableMemoization;
        this.excludeContent = excludeContent;
    }

    public static fromDict(obj: JSONObject): Config {
        const {
            ignoreFieldsForComparison,
            ignoreFieldsForMatchComparison,
            baseComparisonPaths,
            ignoreCase,
            constraints: constraintsSubObj,
            outOfTreeMatching,
            minimumConfidenceThreshold,
            disableMemoization,
            excludeContent,
            ...unknownOptions
        } = obj;

        const constraints = MatchConstraintsContainer.fromDict(constraintsSubObj as JSONObject);
        
        console.log('WARNING: Unknown options in YAML config:', unknownOptions);

        return new Config(ignoreFieldsForComparison as string[],
            ignoreFieldsForMatchComparison as string[],
            baseComparisonPaths as string [],
            ignoreCase as boolean,
            constraints,
            outOfTreeMatching as boolean | undefined,
            minimumConfidenceThreshold as number | undefined,
            disableMemoization as boolean | undefined,
            excludeContent as boolean | undefined);
    }
}

export const defaultConfig = new Config([], [], [], true, new MatchConstraintsContainer([]));
