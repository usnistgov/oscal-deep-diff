import { expect } from 'chai';
import compute from './hungarian';

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
