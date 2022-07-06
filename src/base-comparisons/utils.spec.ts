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
import { ArrayChanged, DocumentComparison } from '../results';
import { trackRawObject } from '../utils/tracked';
import { buildSelection, extractIdentifiers, padNumericIdentifier } from './util';

describe('padNumericIdentifier()', () => {
    it('should pad a numeric identifier', () => {
        expect(padNumericIdentifier('ac-3', 2)).equals('ac-03');
    });
});

describe('extractIdentifiers()', () => {
    it('should extract identifiers from a tracked element', () => {
        const elem = trackRawObject('/', { id: 'ac', title: 'Access Control', controls: [] });
        expect(extractIdentifiers(elem, ['id', 'title'])).deep.equals({
            id: 'ac',
            title: 'Access Control',
        });
    });
});

describe('Build Selection Path', () => {
    it('Should select basic match', () => {
        const comparison: DocumentComparison = {
            leftDocument: '',
            rightDocument: '',
            score: 0,
            changes: [
                new ArrayChanged(
                    '/catalog/groups',
                    '/catalog/groups',
                    [],
                    [],
                    [
                        {
                            leftPointer: '/catalog/groups/0',
                            rightPointer: '/catalog/groups/0',
                            changes: [
                                new ArrayChanged(
                                    '/catalog/groups/0/controls',
                                    '/catalog/groups/0/controls',
                                    [],
                                    [],
                                    [
                                        {
                                            leftPointer: '/catalog/groups/0/controls/0',
                                            rightPointer: '/catalog/groups/0/controls/0',
                                            changes: [],
                                            score: 0,
                                        },
                                    ],
                                    [],
                                ),
                            ],
                            score: 0,
                        },
                    ],
                    [],
                ),
            ],
        };

        const selectionResults = buildSelection(comparison, 'controls');
        expect(selectionResults.matched).to.have.length(1);
        expect(selectionResults.matched[0].leftPointer).to.equal('/catalog/groups/0/controls/0');
        expect(selectionResults.matched[0].rightPointer).to.equal('/catalog/groups/0/controls/0');
    });

    it('Should select left/right isolated parent elements', () => {
        const comparison: DocumentComparison = {
            leftDocument: '',
            rightDocument: '',
            score: 0,
            changes: [
                new ArrayChanged(
                    '/catalog/groups',
                    '/catalog/groups',
                    [
                        {
                            rightPointer: '/catalog/groups/0',
                            rightElement: {
                                controls: [
                                    {
                                        name: 'Some test control :)',
                                    },
                                ],
                            },
                        },
                    ],
                    [
                        {
                            leftPointer: '/catalog/groups/0',
                            leftElement: {
                                controls: [
                                    {
                                        name: 'Some other test control :)',
                                    },
                                ],
                            },
                        },
                    ],
                    [],
                    [],
                ),
            ],
        };

        const selectionResults = buildSelection(comparison, 'controls');
        expect(selectionResults.leftOnly).to.have.length(1);
        expect(selectionResults.rightOnly).to.have.length(1);
        expect(selectionResults.leftOnly[0].leftPointer).to.equal('/catalog/groups/0/controls/0');
        expect(selectionResults.rightOnly[0].rightPointer).to.equal('/catalog/groups/0/controls/0');
    });
});
