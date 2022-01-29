import { expect } from 'chai';
import { ArrayChanged, DocumentComparison } from '../results';
import { buildSelection } from './util';

describe('Build Selection Path', () => {
    it('Should select basic match', () => {
        const comparison: DocumentComparison = {
            leftDocument: '',
            rightDocument: '',
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
                                        },
                                    ],
                                    [],
                                ),
                            ],
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
