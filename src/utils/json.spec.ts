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
import { getPropertyUnion, getPropertyIntersection, getType, resolvePointer, testPointerCondition } from './json';

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
        expect(() => resolvePointer({ a: true }, 'b')).to.throw(/does not exist in sub-object/);
        expect(() => resolvePointer([], '0')).to.throw(/is out of bounds/);
        expect(() => resolvePointer([], '0.5')).to.throw(/is not a valid index/);
        expect(() => resolvePointer(1, 'subprop')).to.throw(/of primitive/);
    });
});

describe('testPointerCondition()', () => {
    it('pointer conditions without a beginning / should match sub-elements', () => {
        expect(testPointerCondition('/catalog/groups/0/controls/12', 'controls/#')).to.be.true;

        expect(testPointerCondition('/metadata/id', 'id')).to.be.true;
    });

    it('pointer conditions with # should substitute array indices', () => {
        expect(testPointerCondition('/catalog/groups/0/id', '/catalog/groups/#/id')).to.be.true;

        expect(testPointerCondition('/catalog/groups/4/controls/10', '/catalog/groups/#/controls/#')).to.be.true;
    });

    it('pointer conditions without a beginning / should test all possible sub-pointer starting candidates', () => {
        // match to first instance
        expect(testPointerCondition('/catalog/groups/0/controls/12/controls/5', 'controls/#/controls/#')).to.be.true;

        // match to last instance
        expect(testPointerCondition('/catalog/groups/0/controls/12/controls/5', 'controls/#')).to.be.true;

        // match to instance in between
        expect(testPointerCondition('/catalog/groups/0/controls/12/controls/5/controls/1', 'controls/#/controls/#')).to
            .be.true;
    });
});
