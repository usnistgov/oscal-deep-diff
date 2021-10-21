declare module 'munkres-js' {
    export default function computeMunkres(
        cost_matrix: number[][],
        options?: { padValue?: number },
    ): [number, number][];
}
