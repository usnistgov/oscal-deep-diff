import { expect } from 'chai';
import { MatchConstraint } from './configuration';
import { scoreMatchPair, matchWithConstraint } from './matching';

/**
 * Tests for matching.ts
 */

const literalMatchByIdConstraint: MatchConstraint = {
    parentName: '',
    matchByProperty: 'id',
    matchType: 'literal',
}

describe('scoreMatchPair()', () => {
    it('same item literal match', () => {
        expect(scoreMatchPair({id: 1}, {id: 1}, literalMatchByIdConstraint)).equals(1);
    });

    it('different item literal match', () => {
        expect(scoreMatchPair({id: 1}, {id: 2}, literalMatchByIdConstraint)).equals(0);
    });
});

describe('matchWithConstraint()', () => {
    it('same list literal match', () => {
        const oldArray = [{id: 1}, {id: 2}];
        const newArray = [{id: 1}, {id: 2}];
        const report = matchWithConstraint(oldArray, newArray, literalMatchByIdConstraint);
        console.log(report);
        expect(report.unmatchedNewIndices).to.eql([], 'no unmatched new indices');
        expect(report.unmatchedOldIndices).to.eql([], 'no unmatched old indices');
        expect(report.matchedIndices.length).equals(oldArray.length, 'all items must be matched');
        
    });
})