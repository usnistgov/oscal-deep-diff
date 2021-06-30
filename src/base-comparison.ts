import { TrackedElement, TrackedObject, TrackedArray } from './tracked'

/**
 * Flatten all elements in the right and left document that match some baseComparisonPaths condition
 * @param leftDocument A tracked element at the root of the document
 * @param rightDocument A tracked element at the root of the document
 * @param baseComparisonPaths The paths that should be included in the flattening operation
 * @returns An array of left and right elements at some common path
 */
export function assembleBaseComparison(leftDocument: TrackedElement, rightDocument: TrackedElement, baseComparisonPaths: string[]): [TrackedElement[], TrackedElement[]] {
    const leftBaseObjects: TrackedElement[] = [];
    const rightBaseObjects: TrackedElement[] = [];

    walkAssembleBaseObjects(leftDocument, baseComparisonPaths, leftBaseObjects);
    walkAssembleBaseObjects(rightDocument, baseComparisonPaths, rightBaseObjects);

    return [leftBaseObjects, rightBaseObjects];
}

/**
 * A recursive function that traverses the children of a tracked element and appends all children
 * that match one of the baseComparisonPaths conditions.
 * @param element The element whose children to traverse. To traverse an entire document, pass the root element.
 * @param baseComparisonPaths The paths that should be included.
 * @param matchedObjects The array of tracked elements to build. This function will MODIFY the array of tracked elements as a side-effect.
 */
function walkAssembleBaseObjects(element: TrackedElement, baseComparisonPaths: string[], matchedObjects: TrackedElement[]) {
    for (const baseComparisonPath of baseComparisonPaths) {
        if (element.testPointerCondition(baseComparisonPath)) {
            matchedObjects.push(element);
            break; // only append a given base object once
        }
    }
    
    // object and array types are compared, primitives are skipped
    if (element instanceof TrackedObject || element instanceof TrackedArray) {
        element.getAll().forEach(e => walkAssembleBaseObjects(e, baseComparisonPaths, matchedObjects));
    }
}
