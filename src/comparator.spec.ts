import { expect } from 'chai';
import { Comparator } from './comparator';
import { Change, ArrayChanged } from './comparisons';

/**
 * Tests for comparator.ts
 */

// In typescript private members can be accessed using array access (see https://stackoverflow.com/a/35991491)

describe('compare documents no constraints', () => {
    const comparator = new Comparator();

    it('simple object', () => {
        const changes: Change[] = [];

        const leftDoc = { id: 1, name: 'John' };
        const rightDoc = { id: 1, name: 'Jake' };

        comparator['compareElements'](leftDoc, '', rightDoc, '', changes);

        expect(changes).to.have.lengthOf(1, 'too many changes returned');
        expect(changes[0].change).to.equal('property_changed', 'incorrect change type');

        console.log(changes);
    });

    it('simple object with primitive array', () => {
        const changes: Change[] = [];

        const leftDoc = {
            uuid: '3c9ec6b1-f013-46ec-aec0-8888c7b61b9b',
            items: [1, 2, 3],
        };
        const rightDoc = {
            uuid: '3c9ec6b1-f013-46ec-aec0-8888c7b61b9b',
            items: [1, 2, 3, 4],
        };

        comparator['compareElements'](leftDoc, '', rightDoc, '', changes);

        console.log(changes);

        expect(changes).to.have.lengthOf(1, 'too many changes returned');
        expect(changes[0].change).to.equal('array_changed', 'incorrect change type');
        const change = changes[0] as ArrayChanged;
        expect(change.addedItems).to.have.lengthOf(1, "only '4' item was added");
        expect(change.removedItems).to.have.lengthOf(0, 'no items were deleted');
        expect(change.subChanges).to.have.lengthOf(0, 'there were no sub-changes');
    });

    it('object with object array', () => {
        const changes: Change[] = [];

        const leftDoc = { items: [{ id: 1 }, { id: 2 }, { id: 3 }] };
        const rightDoc = { items: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] };

        comparator['compareElements'](leftDoc, '', rightDoc, '', changes);

        console.log(changes);

        expect(changes).to.have.lengthOf(1, 'too many changes returned');
        expect(changes[0].change).to.equal('array_changed', 'incorrect change type');
        const change = changes[0] as ArrayChanged;
        expect(change.addedItems).to.have.lengthOf(1, "only '{id: 4}' item was added");
        expect(change.removedItems).to.have.lengthOf(0, 'no items were deleted');
        expect(change.subChanges).to.have.lengthOf(0, 'there were no sub-changes');
        expect(change.addedItems[0].rightElement.id).to.equal(4);
    });
});
