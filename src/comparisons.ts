import { JSONValue, JSONObject } from './utils';

export class PropertyRightOnly {
    change = 'property_right_only';
    leftParentPointer: string;
    rightPointer: string;
    element: JSONValue;

    constructor(leftParentPointer: string, rightPointer: string, element: JSONValue) {
        this.leftParentPointer = leftParentPointer;
        this.rightPointer = rightPointer;
        this.element = element;
    }
}

export class PropertyLeftOnly {
    change = 'property_left_only';
    leftPointer: string;
    rightParentPointer: string;
    element: JSONValue;

    constructor(leftPointer: string, element: JSONValue, rightParentPointer: string) {
        this.leftPointer = leftPointer;
        this.rightParentPointer = rightParentPointer;
        this.element = element;
    }
}

export class PropertyChanged {
    change = 'property_changed';
    leftPointer: string;
    leftElement: JSONValue;
    rightPointer: string;
    rightElement: JSONValue;

    constructor(leftElement: JSONValue, leftPointer: string, rightElement: JSONValue, rightPointer: string) {
        this.leftPointer = leftPointer;
        this.leftElement = leftElement;
        this.rightPointer = rightPointer;
        this.rightElement = rightElement;
    }
}

export interface LeftArrayItem {
    leftPointer: string;
    leftElement: JSONValue;
}

export interface RightArrayItem {
    rightPointer: string;
    rightElement: JSONValue;
}

export interface ArraySubElement {
    leftPointer: string;
    rightPointer: string;
    changes: Change[];
}

export class ArrayChanged {
    change = 'array_changed';
    leftPointer: string;
    rightPointer: string;

    rightOnly: RightArrayItem[];
    leftOnly: LeftArrayItem[];

    subChanges: ArraySubElement[];

    outOfTreeChanges: ArraySubElement[];

    matchProperty?: string;
    matchMethod?: string;

    constructor(
        leftPointer: string,
        rightPointer: string,
        addedItems: RightArrayItem[],
        removedItems: LeftArrayItem[],
        subChanges: ArraySubElement[],
        outOfTreeChanges: ArraySubElement[],
        matchProperty?: string,
        matchMethod?: string,
    ) {
        this.leftPointer = leftPointer;
        this.rightPointer = rightPointer;
        this.rightOnly = addedItems;
        this.leftOnly = removedItems;
        this.subChanges = subChanges;

        this.outOfTreeChanges = outOfTreeChanges;

        this.matchProperty = matchProperty;
        this.matchMethod = matchMethod;
    }
}

export class SelectionResults {
    change = 'selection';
    leftRoot: string;
    rightRoot: string;

    leftOnly: LeftArrayItem[];
    rightOnly: RightArrayItem[];

    subChanges: ArraySubElement[];

    constructor(
        leftRoot: string,
        rightRoot: string,
        leftOnly: LeftArrayItem[],
        rightOnly: RightArrayItem[],
        subChanges: ArraySubElement[],
    ) {
        this.leftRoot = leftRoot;
        this.rightRoot = rightRoot;

        this.leftOnly = leftOnly;
        this.rightOnly = rightOnly;

        this.subChanges = subChanges;
    }
}

export type Change = PropertyRightOnly | PropertyLeftOnly | PropertyChanged | ArrayChanged | SelectionResults;

export type ComparisonResult = [Change[], number];

export interface DocumentComparison {
    leftDocument: string;
    rightDocument: string;
    changes: Change[];
}

/**
 * To be used with `Json.stringify() in order to transform the default
 * comparator output object to a more compressed format that excludes all
 * content from either document.
 * @param key
 * @param value
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-explicit-any
export function excludeContentReplacer(key: string, value: any): any | undefined {
    switch (key) {
        case 'leftElement':
        case 'rightElement':
        case 'deletedElement':
        case 'addedElement':
            return undefined;
        case 'addedItems':
            return value.map((x: JSONObject) => x['rightPointer']);
        case 'removedItems':
            return value.map((x: JSONObject) => x['leftPointer']);
        default:
            return value;
    }
}
