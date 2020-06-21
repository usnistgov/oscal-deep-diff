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