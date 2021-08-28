import { TrackedElement, TrackedObject, TrackedArray } from '.';

export type JSONPrimitive = string | number | boolean | null;
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;
export type JSONObject = { [member: string]: JSONValue };
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JSONArray extends Array<JSONValue> {}

/**
 * Returns the union of properties for both documents
 */
export function getPropertyUnion(leftDocument: JSONObject, rightDocument: JSONObject): string[] {
    return [...new Set([...Object.getOwnPropertyNames(leftDocument), ...Object.getOwnPropertyNames(rightDocument)])];
}

/**
 * Returns the intersection of properties for both documents
 */
export function getPropertyIntersection(leftDocument: JSONObject, rightDocument: JSONObject): string[] {
    const leftDocProps = Object.getOwnPropertyNames(leftDocument);
    const rightDocProps = Object.getOwnPropertyNames(rightDocument);

    return leftDocProps.filter((value) => rightDocProps.includes(value));
}

/**
 * Will return if element is an object, array, null, or default to typeof
 * @param element
 */
export function getType(element: JSONValue): string {
    return typeof element === 'object'
        ? Array.isArray(element)
            ? 'array'
            : element === null
            ? 'null'
            : 'object'
        : typeof element;
}

export function convertPointerToCondition(pointer: string): string {
    return pointer
        .split('/')
        .map((property) => {
            if (Number.isInteger(Number(property)) && property !== '') {
                return '#';
            }
            return property;
        })
        .join('/');
}

/**
 * Returns the resolved object if it exists, or throws an error otherwise
 *
 * Examples:
 * * calling resolvePointer({a: "Hello"}, "a") returns "Hello"
 * * calling resolvePointer({a: "Hello"}, "a/sub") throws an error
 * @param obj
 * @param pointer
 */
export function resolvePointer(obj: JSONValue, pointer: string): JSONValue {
    for (const subProp of pointer.split('/')) {
        const type = getType(obj);
        if (type === 'object') {
            obj = obj as JSONObject;
            if (!(subProp in obj)) {
                throw new Error(`Cannot resolve ${pointer}, ${subProp} does not exist in sub-object`);
            }
            obj = obj[subProp];
        } else if (type === 'array') {
            obj = obj as JSONArray;
            const index = Number(subProp);
            if (!Number.isInteger(index)) {
                throw new Error(
                    `Cannot resolve ${pointer}, sub-object is array type and ${subProp} is not a valid index`,
                );
            } else if (typeof obj[index] === 'undefined') {
                throw new Error(
                    `Cannot resolve ${pointer}, sub-object is array type and index ${subProp} is out of bounds`,
                );
            } else {
                obj = obj[index];
            }
        } else {
            throw new Error(`Cannot resolve ${pointer}, can not get sub-property ${subProp} of primitive ${type}`);
        }
    }
    return obj;
}

export type Condition = string;
export type Pointer = string;

/**
 * Tests if a pointer matches a certain condition
 *
 * Notes:
 * * Starting with a / denotes that you want to search from the root
 * * # and * denote numbers and wildcard tokens
 *
 * Examples:
 * * calling testPointerCondition('/catalog/groups/0/id', '/catalog/groups/#/id') returns true
 * @param pointer
 * @param condition
 */
export function testPointerCondition(pointer: string, condition: string): boolean {
    if (!pointer.startsWith('/') && pointer !== '') {
        throw new Error(`Invalid path '${pointer}', must start with a '/'`);
    }

    // if a condition starts with '/', constrain regex to match with beginning of string
    const patternPrefix = condition.startsWith('/') ? '^' : '';

    const patternRoot = condition
        .replace(/\//g, '\\/') // escape '/'
        .replace(/#/g, '\\d+') // '#' matches all groups of digits
        .replace(/\*/g, '[^/]'); // '*' matches all non-'/' characters

    // build regex match pattern
    const pattern = new RegExp(`${patternPrefix}${patternRoot}$`);

    return pattern.test(pointer);
}

export function countSubElements(element: JSONValue): number {
    let count = 0;
    switch (getType(element)) {
        case 'object':
            element = element as JSONObject;
            for (const property of Object.getOwnPropertyNames(element)) {
                count += countSubElements(element[property]);
            }
            break;
        case 'array':
            element = element as JSONArray;
            for (const subElement of element) {
                count += countSubElements(subElement);
            }
            break;
        default:
            return 1;
    }
    return count;
}

/**
 * Flatten all elements in the right and left document that match some baseComparisonPaths condition
 * @param left A tracked element at the root of the document
 * @param right A tracked element at the root of the document
 * @param paths The paths that should be included in the flattening operation
 * @returns An array of left and right elements at some common path
 */
export function select(
    left: TrackedElement,
    right: TrackedElement,
    paths: string[],
): [TrackedElement[], TrackedElement[]] {
    const leftBaseObjects: TrackedElement[] = [];
    const rightBaseObjects: TrackedElement[] = [];

    traverseMatchSelectionPaths(left, paths, leftBaseObjects);
    traverseMatchSelectionPaths(right, paths, rightBaseObjects);

    return [leftBaseObjects, rightBaseObjects];
}

/**
 * A recursive function that traverses the children of a tracked element and appends all children
 * that match one of the baseComparisonPaths conditions.
 * @param element The element whose children to traverse. To traverse an entire document, pass the root element.
 * @param paths The paths that should be included.
 * @param matched The array of tracked elements to build. This function will MODIFY the array of tracked elements as a side-effect.
 */
function traverseMatchSelectionPaths(element: TrackedElement, paths: string[], matched: TrackedElement[]) {
    for (const baseComparisonPath of paths) {
        if (element.testPointerCondition(baseComparisonPath)) {
            matched.push(element);
            break; // only append a given base object once
        }
    }

    // object and array types are compared, primitives are skipped
    if (element instanceof TrackedObject || element instanceof TrackedArray) {
        element.getAll().forEach((sub) => traverseMatchSelectionPaths(sub, paths, matched));
    }
}
