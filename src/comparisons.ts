export class PropertyAdded {
    change = "property_added";
    oldParentPointer: string;
    newPointer: string;
    addedElement: any;

    constructor(oldParentPointer: string, newPointer: string, addedElement: any) {
        this.oldParentPointer = oldParentPointer;
        this.newPointer = newPointer;
        this.addedElement = addedElement;
    }
}

export class PropertyDeleted {
    change = "property_deleted";
    oldPointer: string;
    deletedElement: any;
    newParentPointer: string;

    constructor(oldPointer: string, deletedElement: any, newParentPointer: string) {
        this.oldPointer = oldPointer;
        this.deletedElement = deletedElement;
        this.newParentPointer = newParentPointer;
    }
}

export class PropertyChanged {
    change = "property_changed";
    oldPointer: string;
    oldElement: any;
    newPointer: string;
    newElement: any;

    constructor(oldElement: any, oldPointer: string, newElement: any, newPointer: string) {
        this.oldPointer = oldPointer;
        this.oldElement = oldElement;
        this.newPointer = newPointer;
        this.newElement = newElement;
    }
}

export interface OldArrayItem {
    oldPointer: string;
    oldElement: any;
}

export interface NewArrayItem {
    newPointer: string;
    newElement: any;
}

export class ArrayChanged {
    change = "array_changed";
    oldPointer: string;
    newPointer: string;

    addedItems: NewArrayItem[];
    removedItems: OldArrayItem[];

    subChanges: Change[];

    matchProperty?: string;
    matchMethod?: string;

    hasChanges() {
        return (this.addedItems.length > 0) || (this.removedItems.length > 0) || (this.subChanges.length > 0);
    }

    constructor(oldPointer: string, newPointer: string, addedItems: NewArrayItem[], removedItems: OldArrayItem[], subChanges: Change[], matchProperty?: string, matchMethod?: string) {
        this.oldPointer = oldPointer;
        this.newPointer = newPointer;
        this.addedItems = addedItems;
        this.removedItems = removedItems;
        this.subChanges = subChanges;

        this.matchProperty = matchProperty;
        this.matchMethod = matchMethod;
    }
}

export type Change = PropertyAdded | PropertyDeleted | PropertyChanged | ArrayChanged;

export interface Comparison {
    oldDocument: string;
    newDocument: string;
    changes: Change[];
}