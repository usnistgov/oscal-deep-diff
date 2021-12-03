import { expect } from 'chai';
import Comparator from './comparator';
import { ArrayChanged, PropertyChanged } from './results';
import { trackRawObject } from './utils/tracked';

/**
 * Comparator with default options to test "default" behavior
 */
const defaultComparator = new Comparator();

type CompareParams = Parameters<typeof defaultComparator.compare>;
type CompareElementsParams = Parameters<typeof defaultComparator['compareElements']>;

/**
 * Convert Comparator.compare() parameters into Comparator.compareElements() parameters
 */
function trackCompareParams([l, , r]: CompareParams): CompareElementsParams {
    return [trackRawObject('', l), trackRawObject('', r)];
}

describe('Comparator Comparison', () => {
    const identical_obj = {
        id: 1,
        title: 'The quick brown fox',
        data: {
            nested_id: 1,
            nested_title: 'The quick brown fox',
        },
        subItems: [
            {
                id: 2,
                title: 'Subitem 1',
            },
            {
                id: 3,
                title: 'Subitem 2',
            },
        ],
    };

    const identical: CompareParams = [identical_obj, 'identical_left', identical_obj, 'identical_right'];

    it('Comparator.compare() on Identical Objects', () => {
        const results = defaultComparator.compare(...identical);
        expect(results.changes).to.have.length(1, 'comparison result should have one element');

        const subchanges = results.changes[0];
        expect(subchanges).instanceOf(ArrayChanged);
        if (subchanges instanceof ArrayChanged) {
            expect(subchanges.subChanges).to.have.length(2), 'both array items should be matched';
            expect(subchanges.leftOnly).to.have.length(0, 'no unmatched left elements');
            expect(subchanges.rightOnly).to.have.length(0, 'no unmatched right elements');
            subchanges.subChanges.map((subChange) => {
                expect(subChange.changes).to.have.length(
                    0,
                    `element pair ${subChange.leftPointer}:${subChange.rightPointer} should be identical`,
                );
            });
        }
    });

    it('Comparator.compareElements() on Identical Objects', () => {
        const [changes, cost] = defaultComparator['compareElements'](...trackCompareParams(identical));
        expect(changes).to.have.length(1); // just a sanity check
        expect(cost).to.equal(0, 'cost for identical objects should be 0');
    });

    const simple_array_difference: CompareParams = [
        [
            {
                id: 0,
                title: 'Element 1',
            },
            {
                id: 1,
                title: 'Element 2',
            },
        ],
        'array_changed_left',
        [
            {
                id: 0,
                title: 'Element 1',
            },
            {
                id: 1,
                title: 'Element 2 - Changed',
            },
            {
                id: 2,
                title: 'Element 3',
            },
        ],
        'array_changed_right',
    ];

    it('Comparator.compare() on Array Difference', () => {
        const results = defaultComparator.compare(...simple_array_difference);
        expect(results.changes).to.have.length(1);
        const arrayChanges = results.changes[0];
        expect(arrayChanges).instanceOf(ArrayChanged);
        if (arrayChanges instanceof ArrayChanged) {
            expect(arrayChanges.leftOnly).to.have.length(0, 'there should be no unmatched left elements');
            expect(arrayChanges.rightOnly).to.have.length(1, 'there should be one unmatched right element');
            expect(arrayChanges.rightOnly[0].rightPointer).to.equal('/2');
            expect(arrayChanges.subChanges).to.have.length(2, 'there should be two matched elements');

            expect(arrayChanges.subChanges[0].leftPointer).to.equal('/0');
            expect(arrayChanges.subChanges[0].rightPointer).to.equal('/0');
            expect(arrayChanges.subChanges[0].changes).to.have.length(0);

            expect(arrayChanges.subChanges[1].leftPointer).to.equal('/1');
            expect(arrayChanges.subChanges[1].rightPointer).to.equal('/1');
            expect(arrayChanges.subChanges[1].changes).to.have.length(1);

            expect(arrayChanges.subChanges[1].changes[0]).instanceOf(PropertyChanged);
            if (arrayChanges.subChanges[1].changes[0] instanceof PropertyChanged) {
                expect(arrayChanges.subChanges[1].changes[0].leftElement).to.equal('Element 2');
                expect(arrayChanges.subChanges[1].changes[0].rightElement).to.equal('Element 2 - Changed');
            }
        }
    });

    it('Comparator.compareElement() on Array Difference', () => {
        const [changes, cost] = defaultComparator['compareElements'](...trackCompareParams(simple_array_difference));
        expect(changes).to.have.length(1); // just a sanity check
        expect(cost).to.be.greaterThan(2, "cost should be at least 2 accounting for Element 3's properties");
        expect(cost).to.be.lessThanOrEqual(
            4,
            "cost should be no more than 3 accounting for Element 2's changed property",
        );
    });
});

describe('Comparator ignore option', () => {
    const ignoreIdComparator = new Comparator({
        '*': {
            priority: 1,
            ignore: ['id', 'ignoreme'],
        },
    });

    // Ignore id on top level
    it('should work on simple object properties', () => {
        const simpleObject: CompareParams = [{ id: 1 }, 'simple_object_left', { id: 2 }, 'simple_object_right'];
        const results = ignoreIdComparator.compare(...simpleObject);
        expect(results.changes).to.have.length(0);
    });

    // Ignore id propagates downwards
    it('should work on nested object properties', () => {
        const nestedObject: CompareParams = [
            { test: 1, sub: { id: 1 } },
            'nested_object_left',
            { test: 1, sub: { id: 2 } },
            'nested_object_right',
        ];
        const results = ignoreIdComparator.compare(...nestedObject);
        expect(results.changes).to.have.length(0);
    });

    // Ignore id propagates through arrays
    it('should work on array element properties', () => {
        const arrayObject: CompareParams = [
            [
                { test: 1, id: 2 },
                { test: 2, id: 1 },
            ],
            'array_left',
            [{ test: 1, id: 1 }, { test: 2 }],
            'array_right',
        ];
        const results = ignoreIdComparator.compare(...arrayObject);
        expect(results.changes).to.have.length(1);
        const arrayChanges = results.changes[0];
        expect(arrayChanges).to.be.instanceOf(ArrayChanged);
        if (arrayChanges instanceof ArrayChanged) {
            expect(arrayChanges.leftOnly).to.have.length(0);
            expect(arrayChanges.rightOnly).to.have.length(0);
            // they should be matched to each other
            expect(arrayChanges.subChanges).to.deep.equal([
                {
                    leftPointer: '/0',
                    rightPointer: '/0',
                    changes: [],
                },
                {
                    leftPointer: '/1',
                    rightPointer: '/1',
                    changes: [],
                },
            ]);
        }
    });

    it('should ignore subobjects', () => {
        const ignoredSubObjects: CompareParams = [
            {
                ignoreme: {
                    test: 'one',
                },
            },
            'ignoredSubObject_left',
            {
                ignoreme: {
                    test: 'two',
                },
            },
            'ignoredSubObject_right',
        ];
        const results = ignoreIdComparator.compare(...ignoredSubObjects);
        expect(results.changes).to.have.length(0);
    });
});
