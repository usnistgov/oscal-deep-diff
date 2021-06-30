interface ControlLevelComparison {
    leftIdentifiers?: {[key: string]: unknown};
    rightIdentifiers?: {[key: string]: unknown};

    status: "ok" | "added" | "withdrawn" | "changed";

    changes?: {
        field: string;
        leftValue: string;
        rightValue: string;
    }[];

    moveDetails ?: {
        leftParentIdentifiers: {[key: string]: unknown};
        rightParentIdentifiers: {[key: string]: unknown};
    }
}

const exampleControlLevelComparison: ControlLevelComparison = {
    leftIdentifiers: {
        id: "AC-1",
        title: "Policy and Procedures"
    },
    status: 'changed',
    changes: [
        {
            field: 'title',
            leftValue: 'Access Control Policy and Procedures',
            rightValue: 'Policy and Procedures'
        }
    ]
}

// function PerformControlLevelComparison(comparison: Comparison, leftDocument: TrackedElement, rightDocument: TrackedElement): ControlLevelComparison[] {
//     if (!(comparison.changes.length !== 1 && comparison.changes[0] instanceof ArrayChanged)) {
//         throw new Error('Malformed base-level comparison');
//     }

//     return comparison.changes[0].outOfTreeChanges.map(ootChange => {

//         return {
            
//         }
//     })
// }
