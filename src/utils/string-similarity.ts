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

export function jaroWinklerSimilarity(s1: string, s2: string): number {
    // Exit early if they're an exact match.
    if (s1 === s2) {
        return 1;
    }

    // Exit early if either are empty.
    if (!s1 || !s2) {
        return 0;
    }

    let m = 0;

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
    // Exit early if they're an exact match.
    if (s1 === s2) {
        return 1;
    }

    // Exit early if either are empty.
    if (!s1 || !s2) {
        return 0;
    }

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
        case 'jaro-winkler':
            return jaroWinklerSimilarity(s1, s2);
        case 'cosine':
            return cosineSimilarity(s1, s2);
        case 'absolute':
            return s1 === s2 ? 1 : 0;
        default:
            throw new Error(`Unknown string-similarity method '${method}'`);
    }
}
