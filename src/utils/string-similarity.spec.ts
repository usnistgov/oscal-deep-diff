import { expect } from 'chai';
import { jaroWrinklerSimilarity } from './string-similarity';

/*
 * Tests for string-similarity.ts
 */

describe('jaroWrinkler()', () => {
    it('identical strings', () => {
        expect(jaroWrinklerSimilarity('hi there', 'hi there')).equals(1);
    });

    it('completely different', () => {
        expect(jaroWrinklerSimilarity('a', 'b')).equals(0);
    });
});
