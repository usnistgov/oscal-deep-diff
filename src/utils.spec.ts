import { expect } from 'chai';
import { getPropertyUnion, getPropertyIntersection, getType, resolvePointer, testPointerCondition } from './utils';

/*
 * Tests for util.ts
 */

describe('getPropertyUnion()', () => {
    it('empty objects', () => {
        const a = {};
        const b = {};
        expect(getPropertyUnion(a, b)).to.eql([], 'two empty objects should return empty array');
    });

    it('same properties', () => {
        const a = { p1: 'Oh hi', p2: 'Bye' };
        const b = { p1: 'Also present', p2: 'Same here' };
        expect(getPropertyUnion(a, b)).to.eql(['p1', 'p2']);
    });

    it('different properties', () => {
        const a = { p1: "I'm only in object a" };
        const b = { p2: "I'm only in object b" };
        expect(getPropertyUnion(a, b)).to.eql(['p1', 'p2']);
    });

    it('intersection of properties', () => {
        const a = { p1: "I'm only in object a", p2: "I'm in both objects" };
        const b = { p2: "I'm in both objects", p3: "I'm only in object b" };
        expect(getPropertyUnion(a, b)).to.eql(['p1', 'p2', 'p3']);
    });
});

describe('getPropertyIntersection()', () => {
    it('empty objects', () => {
        const a = {};
        const b = {};
        expect(getPropertyIntersection(a, b)).to.eql([], 'two empty objects should return empty array');
    });

    it('same properties', () => {
        const a = { p1: 'Oh hi', p2: 'Bye' };
        const b = { p1: 'Also present', p2: 'Same here' };
        expect(getPropertyIntersection(a, b)).to.eql(['p1', 'p2']);
    });

    it('different properties', () => {
        const a = { p1: "I'm only in object a" };
        const b = { p2: "I'm only in object b" };
        expect(getPropertyIntersection(a, b)).to.eql([]);
    });

    it('intersection of properties', () => {
        const a = { p1: "I'm only in object a", p2: "I'm in both objects" };
        const b = { p2: "I'm in both objects", p3: "I'm only in object b" };
        expect(getPropertyIntersection(a, b)).to.eql(['p2']);
    });
});

describe('getType()', () => {
    it('primitives', () => {
        expect(getType(true)).equals('boolean');
        expect(getType(123)).equals('number');
        expect(getType('hey there')).equals('string');
        expect(getType(null)).equals('null');
        expect(getType(undefined)).equals('undefined');
    });

    it('object', () => {
        expect(getType({})).equals('object');
        expect(getType({ a: '' })).equals('object');
    });

    it('array', () => {
        expect(getType([])).equals('array');
        expect(getType([1, 2, 3])).equals('array');
    });
});

describe('resolvePointer()', () => {
    it('simple cases', () => {
        expect(resolvePointer({ a: 'hello' }, 'a')).to.eql('hello', 'can resolve property of object');
        expect(resolvePointer(['0th elem', '1st elem', 'second elem'], '1')).to.eql(
            '1st elem',
            'can resolve index of array',
        );
        expect(resolvePointer({ a: { b: 'c' } }, 'a/b')).to.eql('c', 'can resolve property of sub-object');
        expect(resolvePointer({ a: [{ b: 'c' }] }, 'a/0/b')).to.eql('c');
    });

    it('error cases', () => {
        expect(() => resolvePointer({ a: true }, 'b')).to.throw(/does not exist in sub\-object/);
        expect(() => resolvePointer([], '0')).to.throw(/is out of bounds/);
        expect(() => resolvePointer([], '0.5')).to.throw(/is not a valid index/);
        expect(() => resolvePointer(1, 'subprop')).to.throw(/of primitive/);
    });
});

describe('testPointerCondition()', () => {
    it('simple cases', () => {
        expect(testPointerCondition('/catalog/groups/0/id', '/catalog/groups/#/id')).to.be.true;
        expect(testPointerCondition('/metadata/id', 'id')).to.be.true;
    });
});
