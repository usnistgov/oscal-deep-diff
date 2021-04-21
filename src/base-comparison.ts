import { TrackedElement, TrackedObject, TrackedArray } from './tracked'

export function assembleBaseComparison(leftDocument: TrackedElement, rightDocument: TrackedElement, baseComparisonPaths: string[]) {
    const leftBaseObjects: TrackedElement[] = [];
    const rightBaseObjects: TrackedElement[] = [];

    walkAssembleBaseObjects(leftDocument, baseComparisonPaths, leftBaseObjects);
    walkAssembleBaseObjects(rightDocument, baseComparisonPaths, rightBaseObjects);

    return [leftBaseObjects, rightBaseObjects];
}

function walkAssembleBaseObjects(element: TrackedElement, baseComparisonPaths: string[], matchedObjects: TrackedElement[]) {
    for (const baseComparisonPath of baseComparisonPaths) {
        if (element.testPointerCondition(baseComparisonPath)) {
            matchedObjects.push(element);
            break; // only append a given base object once
        }
    }
    
    // object and array types are compared, primitives are skipped
    if (element instanceof TrackedObject) {
        element.getAll().forEach(e => walkAssembleBaseObjects(e, baseComparisonPaths, matchedObjects));
    } else if (element instanceof TrackedArray) {
        element.getAll().forEach(e => walkAssembleBaseObjects(e, baseComparisonPaths, matchedObjects));
    }
}
