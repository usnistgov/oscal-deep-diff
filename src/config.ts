import { MatchConstraintsContainer } from "./matching";

/**
 * 
 */
export class Config {
    public ignore: string[];
    public ignoreCase: boolean;
    public excludeContent: boolean;
    public disableMemoization: boolean;
    public minimumConfidenceThreshold: number;
    public constraints: MatchConstraintsContainer;

    constructor(ignore: string[], ignoreCase: boolean, constraints: MatchConstraintsContainer, minimumConfidenceThreshold=.8, excludeContent=false, disableMemoization=false) {
        this.ignore = ignore;
        this.ignoreCase = ignoreCase;
        this.constraints = constraints;

        this.minimumConfidenceThreshold = minimumConfidenceThreshold;
        this.disableMemoization = disableMemoization;
        this.excludeContent = excludeContent;
    }

    public static fromDict(obj: any): Config {
        // const version = obj['version'];
        const {ignore, ignoreCase, constraintsSubObj, extraOptions} = obj;
        const constraints = MatchConstraintsContainer.fromDict(constraintsSubObj);
        return new Config(ignore, ignoreCase, constraints, ...extraOptions);
    }
}

export const defaultConfig = new Config([], true, new MatchConstraintsContainer([]));