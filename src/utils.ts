/**
 * Returns the union of properties for both documents
 */
export function getPropertyUnion(leftDocument: object, rightDocument: object): string[] {
    return [...new Set([...Object.getOwnPropertyNames(leftDocument), ...Object.getOwnPropertyNames(rightDocument)])];
}

/**
 * Returns the intersection of properties for both documents
 */
export function getPropertyIntersection(leftDocument: any, rightDocument: any): string[] {
    const leftDocProps = Object.getOwnPropertyNames(leftDocument);
    const rightDocProps = Object.getOwnPropertyNames(rightDocument);

    return leftDocProps.filter((value) => rightDocProps.includes(value));
}

/**
 * Will return if element is an object, array, null, or default to typeof
 * @param element
 */
export function getType(element: any): string {
    return typeof element === 'object'
        ? Array.isArray(element)
            ? 'array'
            : element === null
            ? 'null'
            : 'object'
        : typeof element;
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

export type Condition = string;
export type Pointer = string;

/**
 * Tests if a pointer matches a certain condition
 *
 * Notes:
 * * Starting with a / denotes that you want to search from the root
 * * # and * denote numbers and wildcard tokens
 * * The first non-/ token must not be a # or a *
 *
 * Examples:
 * * calling testPointerCondition('/catalog/groups/0/id', '/catalog/groups/#/id') returns true
 * @param pointer
 * @param condition
 */
export function testPointerCondition(pointer: string, condition: Condition): boolean {
    if (!pointer.startsWith('/') && pointer !== '') {
        throw new Error(`Invalid path '${pointer}', must start with a '/'`);
    }

    let subConditions = condition.split('/');
    if (subConditions[0] === '') {
        // condition begins with a /
        pointer = pointer.slice(1);
    } else {
        const index = pointer.indexOf(subConditions[0]);
        if (index === -1) {
            return false; // first token does not exist
        }

        // remove everything before found first element and the proceeding /
        pointer = pointer.slice(index + subConditions[0].length + 1);
    }
    subConditions = subConditions.splice(1); // first condition has been handled
    let subPointers = pointer.split('/');

    for (const subCondition of subConditions) {
        if (subPointers.length === 0) {
            return false;
        } else if (subCondition === '#') {
            if (!Number.isInteger(Number(subPointers[0]))) {
                return false;
            }
        } else if (subCondition !== '*' && subCondition !== subPointers[0]) {
            return false;
        }
        subPointers = subPointers.slice(1);
    }

    return subPointers.length === 0 || subPointers[0] === ''; // only true if nothing is left
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
