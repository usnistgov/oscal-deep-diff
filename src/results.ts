import { JSONValue } from './utils/json';

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

export type Change = PropertyRightOnly | PropertyLeftOnly | PropertyChanged | ArrayChanged;

export type ComparisonResult = [Change[], number];

export interface DocumentComparison {
    leftDocument: string;
    rightDocument: string;
    changes: Change[];
}
