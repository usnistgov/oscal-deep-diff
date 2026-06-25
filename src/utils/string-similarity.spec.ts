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
import stringSimilarity from './string-similarity';

/*
 * Tests for string-similarity.ts
 */

describe('String Similarity', () => {
    it('Jaro-Winkler ', () => {
        expect(stringSimilarity('hi there', 'hi there', 'jaro-winkler', false)).equals(1);
        expect(stringSimilarity('a', 'b', 'jaro-winkler', false)).equals(0);
        expect(stringSimilarity('a', '', 'jaro-winkler', false)).equals(0);
        expect(stringSimilarity('dog', 'log', 'jaro-winkler', false)).equals(
            stringSimilarity('bog', 'fog', 'jaro-winkler', false),
        );
        // with jaro-winkler similarity, the beginning of the string is weighted more heavily
        expect(stringSimilarity('aaa', 'aab', 'jaro-winkler', false)).to.be.greaterThan(
            stringSimilarity('aaa', 'aba', 'jaro-winkler', false),
        );
    });

    it('cosine', () => {
        expect(stringSimilarity('hi there', 'hi there', 'cosine', false)).equals(1);
        expect(stringSimilarity('a', 'b', 'cosine', false)).equals(0);
        expect(stringSimilarity('a', '', 'cosine', false)).equals(0);
        // with cosine similarity, the order of letters does not matter
        expect(stringSimilarity('aaa', 'aab', 'cosine', false)).equals(stringSimilarity('aaa', 'aba', 'cosine', false));
    });

    it('cosine is bounded by 1 and symmetric for terms with differing magnitudes', () => {
        // term-frequency vectors: 'a a a b' -> [3, 1], 'a b' -> [1, 1]
        // dot product is 4, magnitudes are sqrt(10) and sqrt(2), so cosine is 4 / sqrt(20) ~= 0.8944
        const score = stringSimilarity('a a a b', 'a b', 'cosine', false);
        expect(score).to.be.closeTo(0.8944, 0.0001);
        // cosine similarity must never exceed 1
        expect(score).to.be.at.most(1);
        // and it must be symmetric regardless of argument order
        expect(stringSimilarity('a a a b', 'a b', 'cosine', false)).equals(
            stringSimilarity('a b', 'a a a b', 'cosine', false),
        );
    });

    it('absolute', () => {
        expect(stringSimilarity('hi there', 'Hi there', 'absolute', false)).equals(0);
        expect(stringSimilarity('hi there', 'Hi there', 'absolute', true)).equals(1);
        expect(stringSimilarity('a', 'b', 'absolute', true)).equals(0);
    });

    it('unknown', () => {
        expect(() => stringSimilarity('a', 'b', 'unknown', true)).to.throw();
    });
});
