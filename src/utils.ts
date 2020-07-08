import * as fs from 'fs';

/**
 * Returns the union of properties for both documents
 */
export function getPropertyUnion(oldDocument: object, newDocument: object): string[] {
    return [...new Set([...Object.getOwnPropertyNames(oldDocument), ...Object.getOwnPropertyNames(newDocument)])]
}

/**
 * Returns the intersection of properties for both documents
 */
export function getPropertyIntersection(oldDocument: any, newDocument: any): string[] {
    const oldDocProps = Object.getOwnPropertyNames(oldDocument);
    const newDocProps = Object.getOwnPropertyNames(newDocument);

    return oldDocProps.filter(value => newDocProps.includes(value));
}

/**
 * Will return if element is an object, array, null, or default to typeof
 * @param element 
 */
export function getType(element: any): string {
    return typeof element === 'object'? (Array.isArray(element)? 'array' : (element === null? 'null' : 'object')) : typeof element;
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
export function resolvePointer(obj: any, pointer: string) {
    for (const subProp of pointer.split('/')) {
        const type = getType(obj);
        if (type === 'object') {
            if (!(subProp in obj)) {
                throw new Error(`Cannot resolve ${pointer}, ${subProp} does not exist in sub-object`);
            }
            obj = obj[subProp];
        } else if (type === 'array') {
            const index = Number(subProp);
            if (!Number.isInteger(index)) {
                throw new Error(`Cannot resolve ${pointer}, sub-object is array type and ${subProp} is not a valid index`);
            } else if (typeof obj[index] === 'undefined') {
                throw new Error(`Cannot resolve ${pointer}, sub-object is array type and index ${subProp} is out of bounds`);
            } else {
                obj = obj[index];
            }
        } else {
            throw new Error(`Cannot resolve ${pointer}, can not get sub-property ${subProp} of primitive ${type}`);
        }
    }
    return obj; 
}

export function countSubElements(element: any): number {
    let count = 0;
    switch (getType(element)) {
        case 'object':
            for (const property of Object.getOwnPropertyNames(element)) {
                count += countSubElements(element[property]);
            }
            break;
        case 'array':
            for (const subElement of element) {
                count += countSubElements(subElement);
            }
            break;
        default:
            return 1;
    }
    return count;
}

export function loadJSON(documentPath: string): object {
    // TODO: support URL paths?
    let rawDocument = fs.readFileSync(documentPath);
    return JSON.parse(rawDocument.toString());
}

export function saveJSON(obj: any, outputPath: string) {
    // save pretty printed json
    fs.writeFileSync(outputPath, JSON.stringify(obj, null, 2));
}