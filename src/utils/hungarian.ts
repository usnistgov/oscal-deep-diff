type CostMatrix = (number | 'DISALLOWED')[][];

/**
 * Pad a possibly non-square matrix to make it square
 */
function pad_matrix(matrix: CostMatrix, pad_value: number | 'DISALLOWED' = 0): CostMatrix {
    let max_columns = 0;
    let total_rows = matrix.length;

    for (let i = 0; i < total_rows; i++) {
        if (matrix[i].length > max_columns) {
            max_columns = matrix[i].length;
        }
    }

    total_rows = max_columns > total_rows ? max_columns : total_rows;

    const padded: CostMatrix = [];

    for (let i = 0; i < total_rows; i++) {
        const row = matrix[i]?.slice() ?? [];

        // if the row is too short, pad it
        while (total_rows > row.length) {
            row.push(pad_value);
        }

        padded.push(row);
    }

    return padded;
}

type State = {
    /**
     * The square cost matrix (be sure to pad it!)
     */
    matrix: CostMatrix;
    /**
     * The size of the cost matrix
     */
    size: number;
    row_covered: boolean[];
    col_covered: boolean[];
    path: number[][];
    marked: number[][];
    Z0_r: number;
    Z0_c: number;
};

/**
 * Make a square matrix of some size
 */
function make_matrix(rows: number, cols: number, val: number): number[][] {
    return Array.from(new Array(rows), (_) => Array.from(new Array(cols), (_) => val));
}

/**
 * Augment a cost matrix with costs of leaving an item unmatched, allowing for
 * incomplete matching.
 *
 * For example, given the following cost matrix:
 *     | B-1 | B-2 | B-3
 * ----+-----+-----+----
 * A-1 | 42  | 0   | 100
 * A-2 | 10  | 14  | 120
 * A-3 | 15  | 30  | 999
 *
 * And the following unmatched costs:
 * { A-1: 50, A-2: 10, A-3: 20 }
 * { B-1: 44, B-2: 30, B-3: 25 }
 *
 * The resulting cost matrix would be:
 *     | B-1 | B-2 | B-3 | a-1 | a-2 | a3
 * ----+-----+-----+-----|-----+-----+-----
 * A-1 | 42  | 0   | 100 | 50  | --- | ---
 * A-2 | 10  | 14  | 120 | --- | 10  | ---
 * A-3 | 15  | 30  | 999 | --- | --- | 20
 * b-1 | 44  | --- | --- | 0   | 0   | 0
 * b-2 | --- | 30  | --- | 0   | 0   | 0
 * b-3 | --- | --- | 25  | 0   | 0   | 0
 *
 * This output has the following properties:
 * - The new matrix has size [A]+[B] (always square)
 * - Each element can match with a special item representing the unmatched cost
 * - The unmatched costs can match with each other with 0 cost (these results
 *     should be discarded)
 */
function makeAugmentedMatrix(matchCost: CostMatrix, lUnmatchedCost: number[], rUnmatchedCost: number[]): CostMatrix {
    const leftSize = matchCost.length;
    const rightSize = matchCost[0].length;

    const augmentedCost = [];
    for (let l = 0; l < leftSize; l++) {
        const augmentedRow = [
            ...matchCost[l],
            ...new Array(l).fill('DISALLOWED'),
            lUnmatchedCost[l],
            ...new Array(leftSize - l - 2).fill('DISALLOWED'),
        ];
        augmentedCost.push(augmentedRow);
    }

    for (let r = 0; r < rightSize; r++) {
        const augmentedRow = [
            ...new Array(r).fill('DISALLOWED'),
            rUnmatchedCost[r],
            ...new Array(rightSize - r - 2).fill('DISALLOWED'),
            ...new Array(leftSize).fill(0),
        ];
        augmentedCost.push(augmentedRow);
    }

    return augmentedCost;
}

/**
 * Compute a pairing of the given adjacency matrix along with unpaired element
 * costs
 * @param matchCost An adjacency matrix of costs to minimize
 * @param lUnmatchedCost The cost associated with leaving a left (row) element
 *  unmatched
 * @param rUnmatchedCost THe cost associated with leaving a right (column)
 *  element unmatched
 * @returns An optimized pairing along with unmatched elements
 */
export function computeWithUnmatchedElements(
    matchCost: CostMatrix,
    lUnmatchedCost: number[],
    rUnmatchedCost: number[],
): [[number, number][], number[], number[]] {
    const augmentedCost = makeAugmentedMatrix(matchCost, lUnmatchedCost, rUnmatchedCost);
    // since the augmented matrix must be square, pad step can be skipped
    const solution = compute(augmentedCost, false);

    const pairs: [number, number][] = [];
    const lUnmatched: number[] = [];
    const rUnmatched: number[] = [];

    const leftSize = matchCost.length;
    const rightSize = matchCost[0].length;

    for (let i = 0; i < solution.length; i++) {
        const [leftIndex, rightIndex] = solution[i];

        if (leftIndex < leftSize && rightIndex < rightSize) {
            // Valid pairings
            pairs.push([leftIndex, rightIndex]);
        } else if (leftIndex < leftSize && rightIndex >= rightSize) {
            // Unmatched left element
            lUnmatched.push(leftIndex);
        } else if (leftIndex >= leftSize && rightIndex < rightSize) {
            // Unmatched right element
            rUnmatched.push(rightIndex);
        }
        // The fourth quadrant can be ignored
    }

    return [pairs, lUnmatched, rUnmatched];
}

/**
 * Compute a pairing of the given adjacency matrix
 * @param raw_cost_matrix An adjacency matrix of 'costs' to minimize
 * @param pad Set to false if you trust the matrix to be square
 * @returns An array of matched pairs
 */
export default function compute(raw_cost_matrix: CostMatrix, pad = true): [number, number][] {
    const matrix = pad ? pad_matrix(raw_cost_matrix) : raw_cost_matrix.map((col) => col.slice());
    const state: State = {
        matrix,
        size: matrix.length,
        row_covered: Array.from(new Array(matrix.length), (_) => false),
        col_covered: Array.from(new Array(matrix.length), (_) => false),
        path: make_matrix(matrix.length * 2, 2, 0),
        marked: make_matrix(matrix.length, matrix.length, 0),
        Z0_c: 0,
        Z0_r: 0,
    };

    const original_length = raw_cost_matrix.length;
    const original_width = raw_cost_matrix[0].length;

    let step = 1;
    const steps = [step1, step2, step3, step4, step5, step6];
    while (step != 7) {
        console.log(step);
        step = steps[step - 1](state);
    }

    const results: [number, number][] = [];
    for (let i = 0; i < original_length; i++) {
        for (let j = 0; j < original_width; j++) {
            if (state.marked[i][j] == 1) {
                results.push([i, j]);
            }
        }
    }
    return results;
}

/**
 * For each row of the matrix, find the smallest element and subtract it from
 * every element in its row. Go to step 2.
 */
function step1({ matrix, size }: State) {
    for (let i = 0; i < size; i++) {
        // convince typescript that filtering out 'DISALLOWED' leaves only numbers
        const vals = matrix[i].filter((val) => val !== 'DISALLOWED') as number[];
        if (vals.length === 0) {
            throw new Error(`Row ${i} is entirely DISALLOWED`);
        }
        const min = Math.min(...vals);
        // subtract the minimum value from every element in the row
        for (let j = 0; j < size; j++) {
            let val = matrix[i][j];
            if (val !== 'DISALLOWED') {
                val -= min;
            }
            matrix[i][j] = val;
        }
    }

    return 2;
}

/**
 * Find a zero in the resulting matrix. If there is no starred zero in its row
 * or column, star Z. Repeat for each element in the matrix. Go to step 3.
 */
function step2({ matrix, size, row_covered, col_covered, marked }: State) {
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (matrix[i][j] === 0 && !col_covered[j] && !row_covered[i]) {
                marked[i][j] = 1;
                col_covered[j] = true;
                row_covered[i] = true;
                break;
            }
        }
    }

    // clear covers
    for (let i = 0; i < size; i++) {
        row_covered[i] = false;
        col_covered[i] = false;
    }

    return 3;
}

/**
 * Cover each column containing a starred zero. If K columns are covered, the
 * starred zeros describe a complete set of unique assignments. In this case,
 * Go to done, otherwise, go to step 4
 */
function step3({ size, col_covered, marked }: State) {
    let count = 0;
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (marked[i][j] === 1 && !col_covered[j]) {
                col_covered[j] = true;
                count++;
            }
        }
    }

    return count >= size ? 7 : 4;
}

/**
 * Find a noncovered zero and prime it. If there is no starred zero in the row
 * containing this primed zero, go to step 5. Otherwise, cover this row and
 * uncover the column containing the starred zero. Continue in this manner
 * until there are no uncovered zeros left. Save the smallest uncovered value
 * and go to step 6.
 */
function step4(state: State) {
    let row = 0;
    let col = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        [row, col] = find_a_zero(state);
        if (row < 0) {
            return 6;
        } else {
            state.marked[row][col] = 2;
            const star_col = find_star_in_row(state, row);
            if (star_col >= 0) {
                col = star_col;
                state.row_covered[row] = true;
                state.col_covered[col] = false;
            } else {
                state.Z0_r = row;
                state.Z0_c = col;
                return 5;
            }
        }
    }
}

/**
 * Construct a series of alternating primed and starred zeros as follows.
 * Let Z0 represent the uncovered primed zero found in step 4.
 * Let Z1 denote the starred zero in the column of Z0 (if any).
 * Let Z2 denote the primed zero in the row of Z1 (there will always be one).
 * Continue until the series terminates at a primed zero that has no starred
 * zero in its column. Unstar each starred zero of the series, star each primed
 * zero of the series, erase all primes and uncover every line in the matrix.
 * Return to step 3.
 */
function step5(state: State) {
    let count = 0;

    state.path[count][0] = state.Z0_r;
    state.path[count][1] = state.Z0_c;
    let done = false;

    while (!done) {
        const row = find_star_in_col(state, state.path[count][1]);
        if (row >= 0) {
            count++;
            state.path[count][0] = row;
            state.path[count][1] = state.path[count - 1][1];
        } else {
            done = true;
        }

        if (!done) {
            const col = find_prime_in_row(state, state.path[count][0]);
            count++;
            state.path[count][0] = state.path[count - 1][0];
            state.path[count][1] = col;
        }
    }

    augment_path(state, count);
    // clear covers & erase primes
    for (let i = 0; i < state.size; i++) {
        state.row_covered[i] = false;
        state.col_covered[i] = false;
        for (let j = 0; j < state.size; j++) {
            if (state.marked[i][j] === 2) {
                state.marked[i][j] = 0;
            }
        }
    }

    return 3;
}

/**
 * Add the value found in step 4 to every element of each covered row, and
 * subtract it from every element of each uncovered column. Return to step 4
 * without altering an stars, primes, or covered lines
 */
function step6(state: State) {
    let min = Infinity;

    // find the smallest uncovered value in the matrix
    for (let i = 0; i < state.size; i++) {
        for (let j = 0; j < state.size; j++) {
            if (!state.row_covered[i] && !state.col_covered[j]) {
                const value = state.matrix[i][j];
                if (value !== 'DISALLOWED' && value < min) {
                    min = value;
                }
            }
        }
    }

    let events = 0;
    for (let i = 0; i < state.size; i++) {
        for (let j = 0; j < state.size; j++) {
            let val = state.matrix[i][j];
            if (val === 'DISALLOWED') {
                continue;
            }

            if (state.row_covered[i]) {
                val += min;
                events++;
            }

            if (!state.col_covered[j]) {
                val -= min;
                events++;
            }

            if (state.row_covered[i] && !state.col_covered[j]) {
                events -= 2;
            }

            state.matrix[i][j] = val;
        }
    }

    if (events == 0) {
        throw new Error('Matrix cannot be solved');
    }

    return 4;
}

/**
 * Find the first uncovered element with value 0
 */
function find_a_zero({ matrix, size, row_covered, col_covered }: State /*,i0 = 0, j0 = 0*/): [number, number] {
    // let row = 0;
    // let col = 0;
    // let i = i0;
    // let done = false;

    // while (!done) {
    //     let j = j0;
    //     // eslint-disable-next-line no-constant-condition
    //     while (true) {
    //         if (matrix[i][j] === 0 && !row_covered[i] && !col_covered[j]) {
    //             row = i;
    //             col = j;
    //             done = true;
    //         }
    //         j = (j + 1) % size;
    //         if (j === j0) {
    //             break;
    //         }
    //     }
    //     i = (i + 1) % size;
    //     if (i === i0) {
    //         done = true;
    //     }
    // }
    // return [row, col];

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (matrix[i][j] === 0 && !row_covered[i] && !col_covered[j]) {
                return [i, j];
            }
        }
    }

    return [-1, -1];
}

/**
 * Find the first starred element in the specific row. Returns the row index,
 * or -1 if no starred element was found.
 */
function find_star_in_row({ size, marked }: State, row: number): number {
    for (let j = 0; j < size; j++) {
        if (marked[row][j] == 1) {
            return j;
        }
    }

    return -1;
}

/**
 * Find the first starred element in the specific column. Returns the column
 * index, or -1 if no starred element was found.
 */
function find_star_in_col({ size, marked }: State, col: number): number {
    for (let i = 0; i < size; i++) {
        if (marked[i][col] === 1) {
            return i;
        }
    }

    return -1;
}

/**
 * Find the first prime element in the specified row. Returns the column index,
 * or -1 if no starred element was found.
 */
function find_prime_in_row({ size, marked }: State, row: number): number {
    for (let j = 0; j < size; j++) {
        if (marked[row][j] == 2) {
            return j;
        }
    }

    return -1;
}

function augment_path({ path, marked }: State, count: number) {
    for (let i = 0; i <= count; i++) {
        marked[path[i][0]][path[i][1]] = marked[path[i][0]][path[i][1]] === 1 ? 0 : 1;
    }
}
