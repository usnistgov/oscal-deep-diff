import { expect } from 'chai';
import { ObjectPropertyMatchConstraint, PrimitiveMatchConstraint } from './matching';

/**
 * Tests for matching.ts
 */

describe('PrimitiveMatchConstraint', () => {
    const constraint = new PrimitiveMatchConstraint("literal");

    it('simple list of primitives', () => {
        const leftArray = [1, 2, 3, 4];
        const rightArray = [1, 2, 3, 4];
        const report = constraint.matchArrayElements(leftArray, rightArray);
        console.log(report);
        expect(report.unmatchedLeftIndices).to.eql([], 'no unmatched left indices');
        expect(report.unmatchedRightIndices).to.eql([], 'no unmatched right indices');
        expect(report.matchedIndices.length).equals(leftArray.length, 'all items must be matched');
    });

    it('simple re-ordered list of primitives', () => {
        const leftArray = [1, 2, 3, 4];
        const rightArray = [1, 3, 2, 4];
        const report = constraint.matchArrayElements(leftArray, rightArray);
        console.log(report);
        expect(report.unmatchedLeftIndices).to.eql([], 'no unmatched left indices');
        expect(report.unmatchedRightIndices).to.eql([], 'no unmatched right indices');
        expect(report.matchedIndices.length).equals(leftArray.length, 'all items must be matched');
    });
});

describe('ObjectPropertyMatchConstraint', () => {
    it('simple list', () => {
        const constraint = new ObjectPropertyMatchConstraint("string-similarity", "id");
        const leftArray = [{id: 1}, {id: 2}, {id: 3}];
        const rightArray = [{id: 1}, {id: 2}, {id: 3}];
        const report = constraint.matchArrayElements(leftArray, rightArray);
        console.log(report);
        expect(report.unmatchedLeftIndices).to.eql([], 'no unmatched left indices');
        expect(report.unmatchedRightIndices).to.eql([], 'no unmatched right indices');
        expect(report.matchedIndices.length).equals(leftArray.length, 'all items must be matched');
    });

    it('sub-property match', () => {
        // The user should be able to manually specify a sub-object's property
        // as the guide for how an array of objects are matched
        const constraint = new ObjectPropertyMatchConstraint("literal", "subobj/id");
        const leftArray = [{subobj: {id: 1}}, {subobj: {id: 1}}];
        const rightArray = [{subobj: {id: 1}}, {subobj: {id: 1}}];
        const report = constraint.matchArrayElements(leftArray, rightArray);
        console.log(report);
        expect(report.unmatchedLeftIndices).to.eql([], 'no unmatched left indices');
        expect(report.unmatchedRightIndices).to.eql([], 'no unmatched right indices');
        expect(report.matchedIndices.length).equals(leftArray.length, 'all items must be matched');
    });
});