// Adopted from https://medium.com/@sumn2u/string-similarity-comparision-in-js-with-examples-4bae35f13968

export function jaroWrinkerSimilarity(s1: string, s2: string): number {
    let m = 0;

    // Exit early if either are empty.
    if (!s1 || !s2) {
        return 0;
    }

    // Exit early if they're an exact match.
    if (s1 === s2) {
        return 1;
    }

    const range = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
    const s1Matches = new Array(s1.length);
    const s2Matches = new Array(s2.length);

    for (let i = 0; i < s1.length; i++) {
        const low = i >= range ? i - range : 0;
        const high = i + range <= s2.length ? i + range : s2.length - 1;

        for (let j = low; j <= high; j++) {
            if (s1Matches[i] !== true && s2Matches[j] !== true && s1[i] === s2[j]) {
                ++m;
                s1Matches[i] = s2Matches[j] = true;
                break;
            }
        }
    }

    // Exit early if no matches were found.
    if (m === 0) {
        return 0;
    }

    // Count the transpositions.
    let k = 0;
    let numTranspositions = 0;

    for (let i = 0; i < s1.length; i++) {
        if (s1Matches[i] === true) {
            for (let j = k; j < s2.length; j++) {
                if (s2Matches[j] === true) {
                    k = j + 1;
                    break;
                }

                if (s1[i] !== s2[j]) {
                    ++numTranspositions;
                }
            }
        }
    }

    let weight = (m / s1.length + m / s2.length + (m - numTranspositions / 2) / m) / 3;
    let l = 0;
    const p = 0.1;

    if (weight > 0.7) {
        while (s1[l] === s2[l] && l < 4) {
            ++l;
        }

        weight = weight + l * p * (1 - weight);
    }

    return weight;
}

function termFreqMap(s: string): { [key: string]: number } {
    return s.split(' ').reduce<{ [key: string]: number }>((acc, word) => {
        acc[word] = (acc[word] ?? 0) + 1;
        return acc;
    }, {});
}

function termFreqMapToVec(map: { [key: string]: number }, set: Set<string>): number[] {
    return [...set].map((item) => map[item] ?? 0);
}

function vecDotProduct(v1: number[], v2: number[]): number {
    let dotProduct = 0;
    for (let i = 0; i < v1.length; i++) {
        dotProduct += v1[i] * v2[i];
    }
    return dotProduct;
}

function vecMagnitude(vec: number[]): number {
    return Math.sqrt(vec.reduce((acc, curr) => acc + curr ** 2, 0));
}

export function cosineSimilarity(s1: string, s2: string): number {
    const termFreqMap1 = termFreqMap(s1);
    const termFreqMap2 = termFreqMap(s2);

    const termsSet = new Set<string>([...Object.keys(termFreqMap1), ...Object.keys(termFreqMap2)]);

    const termFreqVec1 = termFreqMapToVec(termFreqMap1, termsSet);
    const termFreqVec2 = termFreqMapToVec(termFreqMap2, termsSet);

    return vecDotProduct(termFreqVec1, termFreqVec2) / (vecMagnitude(termFreqVec2) * vecMagnitude(termFreqVec2));
}

export default function stringSimilarity(s1: string, s2: string, method: string, ignoreCase: boolean): number {
    if (ignoreCase) {
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();
    }

    switch (method) {
        case 'jaro-wrinker':
            return jaroWrinkerSimilarity(s1, s2);
        case 'cosine':
            return cosineSimilarity(s1, s2);
        case 'absolute':
            return s1 === s2 ? 1 : 0;
        default:
            throw new Error(`Unknown string-similarity method '${method}'`);
    }
}
