import { TrackedElement } from '../tracked';
import { BaseLevelComparison } from './intermediate-output';

function padNumericIdentifier(identifier: string, digits = 3) {
    return identifier
        .split(/\W+/)
        .map((piece) => (isNaN(+piece) ? piece : piece.padStart(digits, '0')))
        .join('-');
}

export function sortBaseLevelComparison(comparison: BaseLevelComparison[], primaryIdentifier = 'id'): void {
    comparison.sort((a, b) => {
        // extract id from control comparisons. First right identifiers, then left identifiers
        // (in the case of a withdrawn control)
        const aId = padNumericIdentifier(
            a.rightIdentifiers?.[primaryIdentifier] ?? a.leftIdentifiers?.[primaryIdentifier] ?? '',
        );
        const bId = padNumericIdentifier(
            b.rightIdentifiers?.[primaryIdentifier] ?? b.leftIdentifiers?.[primaryIdentifier] ?? '',
        );

        return aId > bId ? 1 : aId < bId ? -1 : 0;
    });
}

export function extractIdentifiers(element: TrackedElement, identfiers: string[]): { [key: string]: string } {
    return identfiers.reduce((obj, identifier) => {
        obj[identifier] = element.resolve(identifier).raw?.toString() ?? '';
        return obj;
    }, {} as { [key: string]: string });
}
