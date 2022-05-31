/*
 * Portions of this software was developed by employees of the National Institute
 * of Standards and Technology (NIST), an agency of the Federal Government and is
 * being made available as a public service. Pursuant to title 17 United States
 * Code Section 105, works of NIST employees are not subject to copyright
 * protection in the United States. This software may be subject to foreign
 * copyright. Permission in the United States and in foreign countries, to the
 * extent that NIST may hold copyright, to use, copy, modify, create derivative
 * works, and distribute this software and its documentation without fee is hereby
 * granted on a non-exclusive basis, provided that this notice and disclaimer
 * of warranty appears in all copies.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS' WITHOUT ANY WARRANTY OF ANY KIND, EITHER
 * EXPRESSED, IMPLIED, OR STATUTORY, INCLUDING, BUT NOT LIMITED TO, ANY WARRANTY
 * THAT THE SOFTWARE WILL CONFORM TO SPECIFICATIONS, ANY IMPLIED WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND FREEDOM FROM
 * INFRINGEMENT, AND ANY WARRANTY THAT THE DOCUMENTATION WILL CONFORM TO THE
 * SOFTWARE, OR ANY WARRANTY THAT THE SOFTWARE WILL BE ERROR FREE.  IN NO EVENT
 * SHALL NIST BE LIABLE FOR ANY DAMAGES, INCLUDING, BUT NOT LIMITED TO, DIRECT,
 * INDIRECT, SPECIAL OR CONSEQUENTIAL DAMAGES, ARISING OUT OF, RESULTING FROM,
 * OR IN ANY WAY CONNECTED WITH THIS SOFTWARE, WHETHER OR NOT BASED UPON WARRANTY,
 * CONTRACT, TORT, OR OTHERWISE, WHETHER OR NOT INJURY WAS SUSTAINED BY PERSONS OR
 * PROPERTY OR OTHERWISE, AND WHETHER OR NOT LOSS WAS SUSTAINED FROM, OR AROSE OUT
 * OF THE RESULTS OF, OR USE OF, THE SOFTWARE OR SERVICES PROVIDED HEREUNDER.
 */
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
    score: number;
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
    score: number;
}
