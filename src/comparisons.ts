import { GreenFG, ResetConsole, RedFG, YellowFG, JSONValue, JSONObject } from "./utils";

abstract class Printable {
    abstract printChange(): void;
}

export class PropertyRightOnly implements Printable {
    change = 'property_right_only';
    leftParentPointer: string;
    rightPointer: string;
    element: JSONValue;

    constructor(leftParentPointer: string, rightPointer: string, element: JSONValue) {
        this.leftParentPointer = leftParentPointer;
        this.rightPointer = rightPointer;
        this.element = element;
    }

    printChange(prefix=''): void {
        console.log(`${prefix}Change type:   ${this.change}`);
        console.log(`${prefix}Right pointer: ${this.rightPointer}`);
        console.log(`${prefix}Left parent pointer: ${this.leftParentPointer}`);
        console.log(`${prefix}Element: ${GreenFG}`, this.element, ResetConsole);
    }
}

export class PropertyLeftOnly implements Printable {
    change = 'property_left_only';
    leftPointer: string;
    rightParentPointer: string;
    element: JSONValue;

    constructor(leftPointer: string, element: JSONValue, rightParentPointer: string) {
        this.leftPointer = leftPointer;
        this.rightParentPointer = rightParentPointer;
        this.element = element;
    }

    printChange(prefix=''): void {
        console.log(`${prefix}Change type:  ${this.change}`);
        console.log(`${prefix}Left pointer: ${this.leftPointer}`);
        console.log(`${prefix}Right parent pointer: ${this.rightParentPointer}`);
        console.log(`${prefix}Element: ${RedFG}`, this.element, ResetConsole);
    }
}

export class PropertyChanged implements Printable {
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

    printChange(prefix=''): void {
        console.log(`${prefix}Change type:   ${this.change}`);
        console.log(`${prefix}Right pointer: ${this.rightPointer}`);
        console.log(`${prefix}Left pointer:  ${this.leftPointer}`);
        console.log(`${prefix}Left element:  ${RedFG}`, this.leftElement, ResetConsole);
        console.log(`${prefix}Right element: ${GreenFG}`, this.rightElement, ResetConsole);
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

export class ArrayChanged implements Printable {
    change = 'array_changed';
    leftPointer: string;
    rightPointer: string;

    rightOnly: RightArrayItem[];
    leftOnly: LeftArrayItem[];

    subChanges: ArraySubElement[];

    outOfTreeChanges: ArraySubElement[];

    matchProperty?: string;
    matchMethod?: string;

    hasChanges(): boolean {
        return this.rightOnly.length > 0 || this.leftOnly.length > 0 || this.subChanges.length > 0;
    }

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

    printChange(prefix=''): void {
        console.log(`${prefix}Change type:   ${this.change}`);
        console.log(`${prefix}Left pointer:  ${RedFG}${this.leftPointer}${ResetConsole}`);
        console.log(`${prefix}Right pointer: ${GreenFG}${this.rightPointer}${ResetConsole}`);
        console.log(`${prefix}Sub-changes:`);
        const newPrefix = prefix + '  ';
        for (const elementPair of this.subChanges) {
            console.log(`${newPrefix}${YellowFG}---${ResetConsole}`);
            console.log(`${newPrefix}Left Element:  ${RedFG}`, elementPair.leftPointer, ResetConsole);
            console.log(`${newPrefix}Right Element: ${GreenFG}`, elementPair.leftPointer, ResetConsole);
            console.log(`${newPrefix}Changes:`)
            for (const change of elementPair.changes) {
                console.log(`${newPrefix + '  '}${YellowFG}---${ResetConsole}`);
                change.printChange(newPrefix + '  ');
            }
            console.log(`${newPrefix + '  '}${YellowFG}---${ResetConsole}`);
        }
        console.log(`${prefix}Out-of-tree changes:`);
        for (const elementPair of this.outOfTreeChanges) {
            console.log(`${newPrefix}${YellowFG}---${ResetConsole}`);
            console.log(`${newPrefix}Left Element:  ${RedFG}`, elementPair.leftPointer, ResetConsole);
            console.log(`${newPrefix}Right Element: ${GreenFG}`, elementPair.leftPointer, ResetConsole);
            console.log(`${newPrefix}Changes:`)
            for (const change of elementPair.changes) {
                console.log(`${newPrefix + '  '}${YellowFG}---${ResetConsole}`);
                change.printChange(newPrefix + '  ');
            }
            console.log(`${newPrefix + '  '}${YellowFG}---${ResetConsole}`);
        }
    }
}

export type Change = PropertyRightOnly | PropertyLeftOnly | PropertyChanged | ArrayChanged;

export type ComparisonResult = [Change[], number];

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
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-explicit-any
export function excludeContentReplacer(key: string, value: any): any | undefined {
    switch(key) {
        case "leftElement":
        case "rightElement":
        case "deletedElement":
        case "addedElement":
            return undefined;
        case "addedItems":
            return value.map((x: JSONObject) => x["rightPointer"]);
        case "removedItems":
            return value.map((x: JSONObject) => x["leftPointer"]);
        default:
            return value;
    }
}
