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
export type JSONPrimitive = string | number | boolean | null;
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;
export type JSONObject = { [member: string]: JSONValue };
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JSONArray extends Array<JSONValue> {}

/**
 * Returns the union of properties for both documents
 */
export function getPropertyUnion(leftDocument: JSONObject, rightDocument: JSONObject): string[] {
    return [...new Set([...Object.getOwnPropertyNames(leftDocument), ...Object.getOwnPropertyNames(rightDocument)])];
}

/**
 * Returns the intersection of properties for both documents
 */
export function getPropertyIntersection(leftDocument: JSONObject, rightDocument: JSONObject): string[] {
    const leftDocProps = Object.getOwnPropertyNames(leftDocument);
    const rightDocProps = Object.getOwnPropertyNames(rightDocument);

    return leftDocProps.filter((value) => rightDocProps.includes(value));
}

/**
 * Will return if element is an object, array, null, or default to typeof
 */
export function getType(element: JSONValue): string {
    return typeof element === 'object'
        ? Array.isArray(element)
            ? 'array'
            : element === null
            ? 'null'
            : 'object'
        : typeof element;
}

export function convertPointerToCondition(pointer: string): string {
    return pointer
        .split('/')
        .map((property) => {
            if (Number.isInteger(Number(property)) && property !== '') {
                return '#';
            }
            return property;
        })
        .join('/');
}

/**
 * Returns the resolved object if it exists, or throws an error otherwise
 *
 * Examples:
 * * calling resolvePointer({a: "Hello"}, "a") returns "Hello"
 * * calling resolvePointer({a: "Hello"}, "a/sub") throws an error
 * @param obj
 * @param pointer
 */
export function resolvePointer(obj: JSONValue, pointer: string): JSONValue {
    for (const subProp of pointer.split('/')) {
        const type = getType(obj);
        if (type === 'object') {
            obj = obj as JSONObject;
            if (!(subProp in obj)) {
                throw new Error(`Cannot resolve ${pointer}, ${subProp} does not exist in sub-object`);
            }
            obj = obj[subProp];
        } else if (type === 'array') {
            obj = obj as JSONArray;
            const index = Number(subProp);
            if (!Number.isInteger(index)) {
                throw new Error(
                    `Cannot resolve ${pointer}, sub-object is array type and ${subProp} is not a valid index`,
                );
            } else if (typeof obj[index] === 'undefined') {
                throw new Error(
                    `Cannot resolve ${pointer}, sub-object is array type and index ${subProp} is out of bounds`,
                );
            } else {
                obj = obj[index];
            }
        } else {
            throw new Error(`Cannot resolve ${pointer}, can not get sub-property ${subProp} of primitive ${type}`);
        }
    }
    return obj;
}

/**
 * Tests if a pointer matches a certain condition
 *
 * Notes:
 * * Starting with a / denotes that you want to search from the root
 * * # and * denote numbers and wildcard tokens
 *
 * Examples:
 * * calling testPointerCondition('/catalog/groups/0/id', '/catalog/groups/#/id') returns true
 * @param pointer
 * @param condition
 */
export function testPointerCondition(pointer: string, condition: string): boolean {
    if (!pointer.startsWith('/') && pointer !== '') {
        throw new Error(`Invalid path '${pointer}', must start with a '/'`);
    }

    if (pointer === '' && condition === '/') {
        return true;
    }

    // if a condition starts with '/', constrain regex to match with beginning of string
    const patternPrefix = condition.startsWith('/') ? '^' : '';

    const patternRoot = condition
        .replace(/\//g, '\\/') // escape '/'
        .replace(/#/g, '\\d+') // '#' matches all groups of digits
        .replace(/\*/g, '[^/]'); // '*' matches all non-'/' characters

    // build regex match pattern
    const pattern = new RegExp(`${patternPrefix}${patternRoot}$`);

    return pattern.test(pointer);
}

export function testPointerConditions(pointer: string, ...conditions: string[]): boolean {
    for (const condition of conditions) {
        if (testPointerCondition(pointer, condition)) {
            return true;
        }
    }
    return false;
}

export function countSubElements(element: JSONValue, shallow = false): number {
    let count = 0;
    switch (getType(element)) {
        case 'object':
            element = element as JSONObject;
            for (const property of Object.getOwnPropertyNames(element)) {
                count += countSubElements(element[property], shallow);
            }
            break;
        case 'array':
            if (!shallow) {
                element = element as JSONArray;
                for (const subElement of element) {
                    count += countSubElements(subElement);
                }
            }
            break;
        default:
            return 1;
    }
    return count;
}
