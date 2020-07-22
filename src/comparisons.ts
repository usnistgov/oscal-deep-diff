export class PropertyAdded {
    change = 'property_added';
    leftParentPointer: string;
    rightPointer: string;
    addedElement: any;

    constructor(leftParentPointer: string, rightPointer: string, addedElement: any) {
        this.leftParentPointer = leftParentPointer;
        this.rightPointer = rightPointer;
        this.addedElement = addedElement;
    }
}

export class PropertyDeleted {
    change = 'property_deleted';
    leftPointer: string;
    deletedElement: any;
    rightParentPointer: string;

    constructor(leftPointer: string, deletedElement: any, rightParentPointer: string) {
        this.leftPointer = leftPointer;
        this.deletedElement = deletedElement;
        this.rightParentPointer = rightParentPointer;
    }
}

export class PropertyChanged {
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

export class ArrayChanged {
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
}

export type Change = PropertyAdded | PropertyDeleted | PropertyChanged | ArrayChanged;

export interface Comparison {
    leftDocument: string;
    rightDocument: string;
    changes: Change[];
}
