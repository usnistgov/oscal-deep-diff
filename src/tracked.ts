import { getType, testPointerCondition } from "./utils";


export function trackRawObject(pointer: string, raw: any): TrackedElement {
    const type = getType(raw);
    if (type === 'array') {
        return new TrackedArray(pointer, raw);
    } else if (type === 'object') {
        return new TrackedObject(pointer, raw);
    } else {
        return new TrackedPrimitive(pointer, raw);
    }
}

export abstract class TrackedElement {
    pointer: string;

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
    raw: any;

    constructor(pointer: string, raw: any) {
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
    raw: any[];

    constructor(pointer: string, raw: any[]) {
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

        return trackedSubElement.resolveImpl(remaining);
    }

    // todo optimize
    public getIndex(index: number) {
        return this.resolveImpl([index.toString()]);
    }

    // todo heavily optimize
    public getAll(): TrackedElement[] {
        return [...this.raw.keys()].map(index => this.getIndex(index));
    }
}

export class TrackedObject extends TrackedElement {
    raw: any;

    constructor(pointer: string, raw: any) {
        super(pointer);
        this.raw = raw;
    }

    public resolveImpl([property, ...remaining]: string[]): TrackedElement {
        const rawSubElement = this.raw[property];
        if (rawSubElement === undefined) {
            throw new Error(`Cannot resolve path, property ${property} does not exist in object ${this.pointer}`);
        }
        const trackedSubElement = trackRawObject(`${this.pointer}/${property}`, rawSubElement);

        return trackedSubElement.resolveImpl(remaining);
    }

    // public properties(depth=1) {
    //     const properties: string[] = [];
    //     for (const subProp of Object.getOwnPropertyNames(this.raw)) {
            
    //     }

    // }

    // public propertiesUnion(other: Element, depth=1) {

    // }

    // public propertiesIntersection(other: Element, depth=1) {

    // }
}