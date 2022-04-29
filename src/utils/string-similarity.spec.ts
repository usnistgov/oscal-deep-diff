import { expect } from 'chai';
import { jaroWinklerSimilarity } from './string-similarity';

/*
 * Tests for string-similarity.ts
 */

describe('jaroWinkler()', () => {
    it('identical strings', () => {
        expect(jaroWinklerSimilarity('hi there', 'hi there')).equals(1);
    });

    it('completely different', () => {
        expect(jaroWinklerSimilarity('a', 'b')).equals(0);
    });
});
