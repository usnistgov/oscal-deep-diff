import { getType, JSONArray, JSONObject, JSONPrimitive, JSONValue, testPointerCondition } from './json';

export function trackRawObject(pointer: string, raw: JSONValue): TrackedElement {
    const type = getType(raw);

    if (type === 'array') {
        return new TrackedArray(pointer, raw as JSONArray);
    } else if (type === 'object') {
        return new TrackedObject(pointer, raw as JSONObject);
    } else {
        return new TrackedPrimitive(pointer, raw as JSONPrimitive);
    }
}

export abstract class TrackedElement {
    pointer: string;
    abstract raw: JSONValue;

    constructor(pointer: string) {
        this.pointer = pointer;
    }

    public resolve(path: string): TrackedElement {
        const pointerArray = path.split('/');
        return this.resolveImpl(pointerArray);
    }

    public abstract resolveImpl([property, ...remaining]: string[]): TrackedElement;

    public testPointerCondition(condition: string): boolean {
        return testPointerCondition(this.pointer, condition);
    }
}

export class TrackedPrimitive extends TrackedElement {
    raw: JSONPrimitive;

    constructor(pointer: string, raw: JSONPrimitive) {
        super(pointer);
        this.raw = raw;
    }

    public resolveImpl([property, ...remaining]: string[]): TrackedElement {
        if (property !== undefined || remaining.length > 0) {
            throw new Error(`Cannot resolve path, ${this.pointer} is a terminal (primitive) node`);
        }

        return this;
    }
}

export class TrackedArray extends TrackedElement {
    raw: JSONArray;

    constructor(pointer: string, raw: JSONArray) {
        super(pointer);
        this.raw = raw;
    }

    public resolveImpl([property, ...remaining]: string[]): TrackedElement {
        const index = Number(property);
        if (!Number.isInteger(index)) {
            throw new Error(`Cannot resolve path, ${property} is not a valid index of array pointer ${this.pointer}`);
        }

        const rawSubElement = this.raw[index];
        if (rawSubElement === undefined) {
            throw new Error(`Cannot resolve path, index ${index} does not exist in array ${this.pointer}`);
        }
        const trackedSubElement = trackRawObject(`${this.pointer}/${property}`, rawSubElement);

        if (remaining.length === 0) {
            return trackedSubElement;
        }
        return trackedSubElement.resolveImpl(remaining);
    }

    // todo optimize
    public getIndex(index: number): TrackedElement {
        return this.resolveImpl([index.toString()]);
    }

    // todo heavily optimize
    public getAll(): TrackedElement[] {
        return [...this.raw.keys()].map((index) => this.getIndex(index));
    }
}

export class TrackedObject extends TrackedElement {
    raw: JSONObject;

    constructor(pointer: string, raw: JSONObject) {
        super(pointer);
        this.raw = raw;
    }

    public resolveImpl([property, ...remaining]: string[]): TrackedElement {
        if (property === '') {
            // special case when called from root of document
            // e.g. /catalog when split will be ['', 'catalog']
            return this.resolveImpl(remaining);
        }

        const rawSubElement = this.raw[property];
        if (rawSubElement === undefined) {
            throw new Error(`Cannot resolve path, property ${property} does not exist in object ${this.pointer}`);
        }
        const trackedSubElement = trackRawObject(`${this.pointer}/${property}`, rawSubElement);

        if (remaining.length === 0) {
            return trackedSubElement; // base case, no remaining items left
        }
        return trackedSubElement.resolveImpl(remaining);
    }

    public getAll(): TrackedElement[] {
        return [...Object.getOwnPropertyNames(this.raw).map((key) => this.resolve(key))];
    }
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
