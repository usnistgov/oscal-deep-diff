import { GreenFG, ResetConsole, RedFG, YellowFG } from "./utils";

abstract class Printable {
    abstract printChange(): void;
}

export class PropertyRightOnly implements Printable {
    change = 'property_right_only';
    leftParentPointer: string;
    rightPointer: string;
    element: any;

    constructor(leftParentPointer: string, rightPointer: string, element: any) {
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
    element: any;

    constructor(leftPointer: string, element: any, rightParentPointer: string) {
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
    leftElement: any;
    rightPointer: string;
    rightElement: any;

    constructor(leftElement: any, leftPointer: string, rightElement: any, rightPointer: string) {
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

    rightOnly: RightArrayItem[];
    leftOnly: LeftArrayItem[];

    subChanges: ArraySubElement[];

    outOfTreeChanges: ArraySubElement[];

    matchProperty?: string;
    matchMethod?: string;

    hasChanges() {
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
