/*
 * Portions of this software was developed by employees of the National Institute
 * of Standards and Technology (NIST), an agency of the Federal Government and is
 * being made available as a public service. Pursuant to title 17 United States
 * Code Section 105, works of NIST employees are not subject to copyright
 * protection in the United States. This software may be subject to foreign
 * copyright. Permission in the United States and in foreign countries, to the
 * extent that NIST may hold copyright, to use, copy, modify, create derivative
 * works, and distribute this software and its documentation without fee is hereby
 * granted on a non-exclusive basis, provided that this notice and disclaimer
 * of warranty appears in all copies.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS' WITHOUT ANY WARRANTY OF ANY KIND, EITHER
 * EXPRESSED, IMPLIED, OR STATUTORY, INCLUDING, BUT NOT LIMITED TO, ANY WARRANTY
 * THAT THE SOFTWARE WILL CONFORM TO SPECIFICATIONS, ANY IMPLIED WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND FREEDOM FROM
 * INFRINGEMENT, AND ANY WARRANTY THAT THE DOCUMENTATION WILL CONFORM TO THE
 * SOFTWARE, OR ANY WARRANTY THAT THE SOFTWARE WILL BE ERROR FREE.  IN NO EVENT
 * SHALL NIST BE LIABLE FOR ANY DAMAGES, INCLUDING, BUT NOT LIMITED TO, DIRECT,
 * INDIRECT, SPECIAL OR CONSEQUENTIAL DAMAGES, ARISING OUT OF, RESULTING FROM,
 * OR IN ANY WAY CONNECTED WITH THIS SOFTWARE, WHETHER OR NOT BASED UPON WARRANTY,
 * CONTRACT, TORT, OR OTHERWISE, WHETHER OR NOT INJURY WAS SUSTAINED BY PERSONS OR
 * PROPERTY OR OTHERWISE, AND WHETHER OR NOT LOSS WAS SUSTAINED FROM, OR AROSE OUT
 * OF THE RESULTS OF, OR USE OF, THE SOFTWARE OR SERVICES PROVIDED HEREUNDER.
 */
import { expect } from 'chai';
import Comparator from './comparator';
import { BASE_SETTINGS, mergePartialComparatorStepConfigs } from './configuration';
import { ArrayChanged, PropertyChanged } from './results';
import { trackRawObject, TrackedArray } from './utils/tracked';

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

    it('Comparator.compare() on property exclusion', () => {
        const result = defaultComparator.compare(
            { onlyOnLeft: true },
            'prop_excluded_l',
            { onlyOnRight: true },
            'prop_excluded_r',
        );
        expect(result.changes).to.have.lengthOf(2);
    });

    it('Comparator.compare() on invalid comparison types', () => {
        expect(() => defaultComparator.compare([], 'invalid_l', {}, 'invalid_r')).to.throw();
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
                    score: 0,
                },
                {
                    leftPointer: '/1',
                    rightPointer: '/1',
                    changes: [],
                    score: 0,
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

describe('Comparator out of tree', () => {
    const left = new TrackedArray('', [
        {
            id: 1,
            subObjs: [
                {
                    obj: 1,
                },
            ],
        },
        {
            id: 2,
            subObjs: [
                {
                    obj: 2,
                },
            ],
        },
    ]);

    const right = new TrackedArray('', [
        {
            id: 1,
            subObjs: [
                {
                    obj: 2,
                },
            ],
        },
        {
            id: 2,
            subObjs: [
                {
                    obj: 1,
                },
            ],
        },
    ]);

    it('Should not match out of tree when disabled', () => {
        const [changes, count] = defaultComparator['compareArrays'](left, right, BASE_SETTINGS);

        // greater arrays matched, but minor arrays are not
        expect(count).to.equal(4);
        expect(changes).to.have.length(1);
        expect(changes[0]).instanceOf(ArrayChanged);
        if (changes[0] instanceof ArrayChanged) {
            expect(changes[0].leftOnly).to.have.length(0);
            expect(changes[0].rightOnly).to.have.length(0);
            expect(changes[0].subChanges).to.have.length(2);

            expect(changes[0].subChanges[0].score).to.equal(2);
            expect(changes[0].subChanges[1].score).to.equal(2);

            expect(changes[0].outOfTreeChanges).to.have.length(0);
        }
    });

    it('Should match out of tree when enabled', () => {
        const [changes, count] = defaultComparator['compareArrays'](
            left,
            right,
            mergePartialComparatorStepConfigs(BASE_SETTINGS, { priority: 1, outOfTreeEnabled: true }),
        );

        // greater arrays matched, minor arrays are matched out of tree
        expect(count).to.equal(0);
        expect(changes).to.have.length(1);
        expect(changes[0]).instanceOf(ArrayChanged);
        if (changes[0] instanceof ArrayChanged) {
            expect(changes[0].leftOnly).to.have.length(0);
            expect(changes[0].rightOnly).to.have.length(0);
            expect(changes[0].subChanges).to.have.length(2);

            expect(changes[0].subChanges[0].score).to.equal(0);
            expect(changes[0].subChanges[1].score).to.equal(0);

            expect(changes[0].outOfTreeChanges).to.have.length(2);
        }
    });
});
