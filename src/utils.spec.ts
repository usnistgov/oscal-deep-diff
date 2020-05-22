import { expect } from 'chai';
import { getPropertyUnion, getPropertyIntersection, getType } from "./utils";

/*
 * Tests for util.ts
 */

describe('getPropertyUnion()', () => {
    it('empty objects', () => {
        const a = {};
        const b = {};
        expect(getPropertyUnion(a, b)).to.eql([], "two empty objects should return empty array");
    });

    it('same properties', () => {
        const a = {p1: "Oh hi", p2: "Bye"};
        const b = {p1: "Also present", p2: "Same here"};
        expect(getPropertyUnion(a, b)).to.eql(['p1', 'p2']);
    });

    it('different properties', () => {
        const a = {p1: "I'm only in object a"};
        const b = {p2: "I'm only in object b"};
        expect(getPropertyUnion(a, b)).to.eql(['p1', 'p2']);
    });

    it('intersection of properties', () => {
        const a = {p1: "I'm only in object a", p2: "I'm in both objects"};
        const b = {p2: "I'm in both objects", p3: "I'm only in object b"};
        expect(getPropertyUnion(a, b)).to.eql(['p1', 'p2', 'p3']);
    });
});

describe('getPropertyIntersection()', () => {
    it('empty objects', () => {
        const a = {};
        const b = {};
        expect(getPropertyIntersection(a, b)).to.eql([], "two empty objects should return empty array");
    })

    it('same properties', () => {
        const a = {p1: "Oh hi", p2: "Bye"};
        const b = {p1: "Also present", p2: "Same here"};
        expect(getPropertyIntersection(a, b)).to.eql(['p1', 'p2']);
    });

    it('different properties', () => {
        const a = {p1: "I'm only in object a"};
        const b = {p2: "I'm only in object b"};
        expect(getPropertyIntersection(a, b)).to.eql([]);
    });

    it('intersection of properties', () => {
        const a = {p1: "I'm only in object a", p2: "I'm in both objects"};
        const b = {p2: "I'm in both objects", p3: "I'm only in object b"};
        expect(getPropertyIntersection(a, b)).to.eql(['p2']);
    });
});

describe('getType()', () => {
    it('primitives', () => {
        expect(getType(true)).equals('boolean');
        expect(getType(123)).equals('number');
        expect(getType("hey there")).equals('string');
        expect(getType(null)).equals('null');
        expect(getType(undefined)).equals('undefined');
    })

    it('object', () => {
        expect(getType({})).equals('object');
        expect(getType({a:""})).equals('object');
    });

    it('array', () => {
        expect(getType([])).equals('array');
        expect(getType([1, 2, 3])).equals('array');
    });
})
