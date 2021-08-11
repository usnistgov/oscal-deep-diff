import { BaseLevelComparison } from './intermediate-document';

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
