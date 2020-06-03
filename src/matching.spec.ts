import { expect } from 'chai';
import { ObjectPropertyMatchConstraint, PrimitiveMatchConstraint } from './matching';

/**
 * Tests for matching.ts
 */

describe('PrimitiveMatchConstraint', () => {
    const constraint = new PrimitiveMatchConstraint("literal");

    it('simple list of primitives', () => {
        const oldArray = [1, 2, 3, 4];
        const newArray = [1, 2, 3, 4];
        const report = constraint.matchArrayElements(oldArray, newArray);
        console.log(report);
        expect(report.unmatchedNewIndices).to.eql([], 'no unmatched new indices');
        expect(report.unmatchedOldIndices).to.eql([], 'no unmatched old indices');
        expect(report.matchedIndices.length).equals(oldArray.length, 'all items must be matched');
    });

    it('simple re-ordered list of primitives', () => {
        const oldArray = [1, 2, 3, 4];
        const newArray = [1, 3, 2, 4];
        const report = constraint.matchArrayElements(oldArray, newArray);
        console.log(report);
        expect(report.unmatchedNewIndices).to.eql([], 'no unmatched new indices');
        expect(report.unmatchedOldIndices).to.eql([], 'no unmatched old indices');
        expect(report.matchedIndices.length).equals(oldArray.length, 'all items must be matched');
    });
});

describe('ObjectPropertyMatchConstraint', () => {
    it('simple list', () => {
        const constraint = new ObjectPropertyMatchConstraint("string-similarity", "id");
        const oldArray = [{id: 1}, {id: 2}, {id: 3}];
        const newArray = [{id: 1}, {id: 2}, {id: 3}];
        const report = constraint.matchArrayElements(oldArray, newArray);
        console.log(report);
        expect(report.unmatchedNewIndices).to.eql([], 'no unmatched new indices');
        expect(report.unmatchedOldIndices).to.eql([], 'no unmatched old indices');
        expect(report.matchedIndices.length).equals(oldArray.length, 'all items must be matched');
    });
});