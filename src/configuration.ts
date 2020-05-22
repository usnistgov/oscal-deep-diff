// Constraints that control how arrays of sub-documents are matched to each other before being compared
export interface MatchConstraint {
    parentName: string; // subdocument's property name in parent document
    matchByProperty: string; // property to use as match
    matchType: string; // method by which matches are determined 
    // minimumMatchScore: number;
    secondaryMatch?: string[]; // second property(ies) must also match (such as media-type in links)
}

// Constrants that control how sub-documents are compared
export interface CompareConstraint {
    parentName: string; // subdocument's property name in parent document
    propertyName: string; // property to be compared in a special format
    comparisonType: "string-list"; // method by which the comparison is made
}

export interface ComparatorOptions {
    matchConstraints: MatchConstraint[];
    compareConstraints: CompareConstraint[];
}