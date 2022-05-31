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
import compute, { makeAugmentedMatrix, computeWithUnmatchedElements } from './hungarian';

describe('Hungarian Algorithm', () => {
    it('Basic Pairing', () => {
        const pairs = compute([
            [0, 1, 1],
            [1, 0, 1],
            [1, 1, 0],
        ]);
        expect(pairs).to.have.length(3);
        expect(pairs).to.deep.equal([
            [0, 0],
            [1, 1],
            [2, 2],
        ]);
    });

    it('Basic Pairing 2', () => {
        const pairs = compute([
            [0, 1, 1],
            [1, 1, 0],
            [1, 0, 1],
        ]);
        expect(pairs).to.have.length(3);
        expect(pairs).to.deep.equal([
            [0, 0],
            [1, 2],
            [2, 1],
        ]);
    });

    it('Non-square Pairing', () => {
        const pairs = compute([
            [0, 1, 1],
            [1, 1, 0],
            [1, 0, 1],
        ]);
        expect(pairs).to.have.length(3);
        expect(pairs).to.deep.equal([
            [0, 0],
            [1, 2],
            [2, 1],
        ]);
    });

    it('Munkres.py Tests', () => {
        const matrices: [(number | 'DISALLOWED')[][], number][] = [
            // Square
            [
                [
                    [400, 150, 400],
                    [400, 450, 600],
                    [300, 225, 300],
                ],
                850,
            ],
            // Rectangular variant
            [
                [
                    [400, 150, 400, 1],
                    [400, 450, 600, 2],
                    [300, 225, 300, 3],
                ],
                452,
            ],
            // Square
            [
                [
                    [10, 10, 8],
                    [9, 8, 1],
                    [9, 7, 4],
                ],
                18,
            ],
            // Square variant with floating point value
            [
                [
                    [10.1, 10.2, 8.3],
                    [9.4, 8.5, 1.6],
                    [9.7, 7.8, 4.9],
                ],
                19.5,
            ],
            // Rectangular variant
            [
                [
                    [10, 10, 8, 11],
                    [9, 8, 1, 1],
                    [9, 7, 4, 10],
                ],
                15,
            ],
            // Rectangular variant with floating point value
            [
                [
                    [10.01, 10.02, 8.03, 11.04],
                    [9.05, 8.06, 1.07, 1.08],
                    [9.09, 7.1, 4.11, 10.12],
                ],
                15.2,
            ],
            // Rectangular with 'DISALLOWED'
            [
                [
                    [4, 5, 6, 'DISALLOWED'],
                    [1, 9, 12, 11],
                    ['DISALLOWED', 5, 4, 'DISALLOWED'],
                    [12, 12, 12, 10],
                ],
                20,
            ],
            // Rectangular variant with 'DISALLOWED' and floating point value
            [
                [
                    [4.001, 5.002, 6.003, 'DISALLOWED'],
                    [1.004, 9.005, 12.006, 11.007],
                    ['DISALLOWED', 5.008, 4.009, 'DISALLOWED'],
                    [12.01, 12.011, 12.012, 10.013],
                ],
                20.028,
            ],
            // 'DISALLOWED' to force pairings
            [
                [
                    [1, 'DISALLOWED', 'DISALLOWED', 'DISALLOWED'],
                    ['DISALLOWED', 2, 'DISALLOWED', 'DISALLOWED'],
                    ['DISALLOWED', 'DISALLOWED', 3, 'DISALLOWED'],
                    ['DISALLOWED', 'DISALLOWED', 'DISALLOWED', 4],
                ],
                10,
            ],
            // 'DISALLOWED' to force pairings with floating point value
            [
                [
                    [1.1, 'DISALLOWED', 'DISALLOWED', 'DISALLOWED'],
                    ['DISALLOWED', 2.2, 'DISALLOWED', 'DISALLOWED'],
                    ['DISALLOWED', 'DISALLOWED', 3.3, 'DISALLOWED'],
                    ['DISALLOWED', 'DISALLOWED', 'DISALLOWED', 4.4],
                ],
                11.0,
            ],
        ];

        for (const [matrix, expected_cost] of matrices) {
            const solution = compute(matrix);
            const total_cost = solution
                .map(([r, c]): number => {
                    const pair_cost = matrix[r][c];
                    if (pair_cost === 'DISALLOWED') {
                        // we have a big problem
                        expect.fail('There should be no DISALLOWED pairs');
                    }
                    return pair_cost;
                })
                .reduce((acc, val) => acc + val, 0);

            expect(total_cost).to.equal(expected_cost);
        }
    });
});

describe('Hungarian Algorithm With Unmatched Costs', () => {
    it('Augmented Matrix', () => {
        const augmented = makeAugmentedMatrix(
            [
                [40, 0, 100],
                [10, 14, 120],
                [15, 30, 999],
            ],
            [50, 10, 30],
            [44, 30, 25],
        );
        expect(augmented).to.deep.equal([
            [40, 0, 100, 50, 'DISALLOWED', 'DISALLOWED'],
            [10, 14, 120, 'DISALLOWED', 10, 'DISALLOWED'],
            [15, 30, 999, 'DISALLOWED', 'DISALLOWED', 30],
            [44, 'DISALLOWED', 'DISALLOWED', 0, 0, 0],
            ['DISALLOWED', 30, 'DISALLOWED', 0, 0, 0],
            ['DISALLOWED', 'DISALLOWED', 25, 0, 0, 0],
        ]);
    });

    it('Basic pairing with optimally unmatched solution', () => {
        const [pairs, lUnmatched, rUnmatched] = computeWithUnmatchedElements([[2]], [0.5], [0.5]);
        expect(pairs).to.have.length(0);
        expect(lUnmatched).to.deep.equal([0]);
        expect(rUnmatched).to.deep.equal([0]);
    });

    it('Basic pairing with optimally matched solution', () => {
        const [pairs, lUnmatched, rUnmatched] = computeWithUnmatchedElements([[1]], [1], [1]);
        expect(pairs).to.deep.equal([[0, 0]]);
        expect(lUnmatched).to.have.length(0);
        expect(rUnmatched).to.have.length(0);
        // second solution from augmented matrix [1, 1] is discarded
    });
});
