type CostMatrix = (number | 'DISALLOWED')[][];

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
export function makeAugmentedMatrix(
    matchCost: CostMatrix,
    lUnmatchedCost: number[],
    rUnmatchedCost: number[],
): CostMatrix {
    const leftSize = matchCost.length;
    const rightSize = matchCost[0].length;

    const augmentedCost = [];
    for (let l = 0; l < leftSize; l++) {
        const augmentedRow = [
            ...matchCost[l],
            ...new Array(l).fill('DISALLOWED'),
            lUnmatchedCost[l],
            ...new Array(leftSize - l - 1).fill('DISALLOWED'),
        ];
        augmentedCost.push(augmentedRow);
    }

    for (let r = 0; r < rightSize; r++) {
        const augmentedRow = [
            ...new Array(r).fill('DISALLOWED'),
            rUnmatchedCost[r],
            ...new Array(rightSize - r - 1).fill('DISALLOWED'),
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

type State = {
    /**
     * The square cost matrix (be sure to pad it!)
     */
    matrix: CostMatrix;
    /**
     * The size of the cost matrix
     */
    size: number;
    rowCovered: boolean[];
    colCovered: boolean[];
    path: number[][];
    marked: number[][];
    z0r: number;
    z0c: number;
};

/**
 * Compute a pairing of the given adjacency matrix
 * @param rawMatchCost An adjacency matrix of 'costs' to minimize
 * @param pad Set to false if you trust the matrix to be square
 * @returns An array of matched pairs
 */
export default function compute(rawMatchCost: CostMatrix, pad = true): [number, number][] {
    const matrix = pad ? padMatrix(rawMatchCost) : rawMatchCost.map((col) => col.slice());
    const state: State = {
        matrix,
        size: matrix.length,
        rowCovered: Array.from(new Array(matrix.length), (_) => false),
        colCovered: Array.from(new Array(matrix.length), (_) => false),
        path: make_matrix(matrix.length * 2, 2, 0),
        marked: make_matrix(matrix.length, matrix.length, 0),
        z0c: 0,
        z0r: 0,
    };

    const originalLength = rawMatchCost.length;
    const originalWidth = rawMatchCost[0].length;

    let step = 1;
    const steps = [step1, step2, step3, step4, step5, step6];
    while (step != 7) {
        step = steps[step - 1](state);
    }

    const results: [number, number][] = [];
    for (let i = 0; i < originalLength; i++) {
        for (let j = 0; j < originalWidth; j++) {
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
function step2({ matrix, size, rowCovered, colCovered, marked }: State) {
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (matrix[i][j] === 0 && !colCovered[j] && !rowCovered[i]) {
                marked[i][j] = 1;
                colCovered[j] = true;
                rowCovered[i] = true;
                break;
            }
        }
    }

    // clear covers
    for (let i = 0; i < size; i++) {
        rowCovered[i] = false;
        colCovered[i] = false;
    }

    return 3;
}

/**
 * Cover each column containing a starred zero. If K columns are covered, the
 * starred zeros describe a complete set of unique assignments. In this case,
 * Go to done, otherwise, go to step 4
 */
function step3({ size, colCovered, marked }: State) {
    let count = 0;
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (marked[i][j] === 1 && !colCovered[j]) {
                colCovered[j] = true;
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
        [row, col] = findAZero(state);
        if (row < 0) {
            return 6;
        } else {
            state.marked[row][col] = 2;
            const starCol = findStarInRow(state, row);
            if (starCol >= 0) {
                col = starCol;
                state.rowCovered[row] = true;
                state.colCovered[col] = false;
            } else {
                state.z0r = row;
                state.z0c = col;
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

    state.path[count][0] = state.z0r;
    state.path[count][1] = state.z0c;
    let done = false;

    while (!done) {
        const row = findStarInColumn(state, state.path[count][1]);
        if (row >= 0) {
            count++;
            state.path[count][0] = row;
            state.path[count][1] = state.path[count - 1][1];
        } else {
            done = true;
        }

        if (!done) {
            const col = findPrimeInRow(state, state.path[count][0]);
            count++;
            state.path[count][0] = state.path[count - 1][0];
            state.path[count][1] = col;
        }
    }

    augmentPath(state, count);
    // clear covers & erase primes
    for (let i = 0; i < state.size; i++) {
        state.rowCovered[i] = false;
        state.colCovered[i] = false;
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
            if (!state.rowCovered[i] && !state.colCovered[j]) {
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

            if (state.rowCovered[i]) {
                val += min;
                events++;
            }

            if (!state.colCovered[j]) {
                val -= min;
                events++;
            }

            if (state.rowCovered[i] && !state.colCovered[j]) {
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
function findAZero({ matrix, size, rowCovered, colCovered }: State): [number, number] {
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (matrix[i][j] === 0 && !rowCovered[i] && !colCovered[j]) {
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
function findStarInRow({ size, marked }: State, row: number): number {
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
function findStarInColumn({ size, marked }: State, col: number): number {
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
function findPrimeInRow({ size, marked }: State, row: number): number {
    for (let j = 0; j < size; j++) {
        if (marked[row][j] == 2) {
            return j;
        }
    }

    return -1;
}

function augmentPath({ path, marked }: State, count: number) {
    for (let i = 0; i <= count; i++) {
        marked[path[i][0]][path[i][1]] = marked[path[i][0]][path[i][1]] === 1 ? 0 : 1;
    }
}

/**
 * Make a matrix of some size
 */
function make_matrix(rows: number, cols: number, val: number): number[][] {
    return Array.from(new Array(rows), (_) => Array.from(new Array(cols), (_) => val));
}

/**
 * Pad a possibly non-square matrix to make it square
 */
function padMatrix(matrix: CostMatrix, padValue: number | 'DISALLOWED' = 0): CostMatrix {
    let maxColumns = 0;
    let totalRows = matrix.length;

    for (let i = 0; i < totalRows; i++) {
        if (matrix[i].length > maxColumns) {
            maxColumns = matrix[i].length;
        }
    }

    totalRows = maxColumns > totalRows ? maxColumns : totalRows;

    const padded: CostMatrix = [];

    for (let i = 0; i < totalRows; i++) {
        const row = matrix[i]?.slice() ?? [];

        // if the row is too short, pad it
        while (totalRows > row.length) {
            row.push(padValue);
        }

        padded.push(row);
    }

    return padded;
}
