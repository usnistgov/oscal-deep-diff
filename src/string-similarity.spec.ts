import { expect } from 'chai';
import { jaroWrinkerSimilarity } from './string-similarity';

/*
 * Tests for string-similarity.ts
 */

describe('JaroWrinker()', () => {
    it('identical strings', () => {
        expect(jaroWrinkerSimilarity('hi there', 'hi there')).equals(1);
    });

    it('completely different', () => {
        expect(jaroWrinkerSimilarity('a', 'b')).equals(0);
    });
});