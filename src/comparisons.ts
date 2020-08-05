import { GreenFG, ResetConsole, RedFG } from "./utils";

abstract class Printable {
    abstract printChange(): void;
}

export class PropertyAdded implements Printable {
    change = 'property_added';
    leftParentPointer: string;
    rightPointer: string;
    addedElement: any;

    constructor(leftParentPointer: string, rightPointer: string, addedElement: any) {
        this.leftParentPointer = leftParentPointer;
        this.rightPointer = rightPointer;
        this.addedElement = addedElement;
    }

    printChange(): void {
        console.log(`Change type:   ${this.change}`);
        console.log(`Right pointer: ${this.rightPointer}`);
        console.log(`Left parent pointer: ${this.leftParentPointer}`);
        console.log(`Added element: ${GreenFG}`, this.addedElement, ResetConsole);
    }
}

export class PropertyDeleted implements Printable {
    change = 'property_deleted';
    leftPointer: string;
    deletedElement: any;
    rightParentPointer: string;

    constructor(leftPointer: string, deletedElement: any, rightParentPointer: string) {
        this.leftPointer = leftPointer;
        this.deletedElement = deletedElement;
        this.rightParentPointer = rightParentPointer;
    }

    printChange(): void {
        console.log(`Change type:  ${this.change}`);
        console.log(`Left pointer: ${this.leftPointer}`);
        console.log(`Right parent pointer: ${this.rightParentPointer}`);
        console.log(`Deleted element: ${RedFG}`, this.deletedElement, ResetConsole);
    }
}

export class PropertyChanged implements Printable {
    change = 'property_changed';
    leftPointer: string;
    leftElement: any;
    rightPointer: string;
    rightElement: any;

    constructor(leftElement: any, leftPointer: string, rightElement: any, rightPointer: string) {
        this.leftPointer = leftPointer;
        this.leftElement = leftElement;
        this.rightPointer = rightPointer;
        this.rightElement = rightElement;
    }

    printChange(): void {
        console.log(`Change type:   ${this.change}`);
        console.log(`Right pointer: ${this.rightPointer}`);
        console.log(`Left pointer:  ${this.leftPointer}`);
        console.log(`Left element:  ${RedFG}`, this.leftElement, ResetConsole);
        console.log(`Right element: ${GreenFG}`, this.rightElement, ResetConsole);
    }
}

export interface LeftArrayItem {
    leftPointer: string;
    leftElement: any;
}

export interface RightArrayItem {
    rightPointer: string;
    rightElement: any;
}

export interface ArraySubElement {
    leftPointer: string;
    rightPointer: string;
    changes: Change[];
}

export class ArrayChanged implements Printable {
    change = 'array_changed';
    leftPointer: string;
    rightPointer: string;

    addedItems: RightArrayItem[];
    removedItems: LeftArrayItem[];

    subChanges: ArraySubElement[];

    matchProperty?: string;
    matchMethod?: string;

    hasChanges() {
        return this.addedItems.length > 0 || this.removedItems.length > 0 || this.subChanges.length > 0;
    }

    constructor(
        leftPointer: string,
        rightPointer: string,
        addedItems: RightArrayItem[],
        removedItems: LeftArrayItem[],
        subChanges: ArraySubElement[],
        matchProperty?: string,
        matchMethod?: string,
    ) {
        this.leftPointer = leftPointer;
        this.rightPointer = rightPointer;
        this.addedItems = addedItems;
        this.removedItems = removedItems;
        this.subChanges = subChanges;

        this.matchProperty = matchProperty;
        this.matchMethod = matchMethod;
    }

    printChange(): void {
        console.log(`Change type:   ${this.change}`);
        console.log(`Right pointer: ${this.rightPointer}`);
        console.log(`Left pointer:  ${this.leftPointer}`);
    }
}

export type Change = PropertyAdded | PropertyDeleted | PropertyChanged | ArrayChanged;

export interface Comparison {
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
export function excludeContentReplacer(key: string, value: any) {
    switch(key) {
        case "leftElement":
        case "rightElement":
        case "deletedElement":
        case "addedElement":
            return undefined;
        case "addedItems":
            return value.map((x: any) => x["rightPointer"]);
        case "removedItems":
            return value.map((x: any) => x["leftPointer"]);
        default:
            return value;
    }
}
