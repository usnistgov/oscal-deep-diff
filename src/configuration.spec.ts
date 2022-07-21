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
import {
    BASE_SETTINGS,
    mergePartialComparatorStepConfigs,
    parseComparatorConfig,
    parseConfig,
    parseOutputConfig,
    parsePartialComparatorStepConfig,
} from './configuration';

describe('mergePartialComparatorStepConfigs()', () => {
    it('should merge two partial configs', () => {
        const config = mergePartialComparatorStepConfigs(
            BASE_SETTINGS,
            { stringComparisonMethod: 'jaro-winkler', priority: 1 },
            {
                stringComparisonMethod: 'cosine',
                priority: 100,
            },
        );
        expect(config.stringComparisonMethod).equals('cosine');
    });
});

describe('parseComparatorConfig()', () => {
    it('should parse a minimal config', () => {
        const config = parseComparatorConfig({ 'controls/#': { ignore: ['uuid'] } });
        expect(config['controls/#'].ignore).to.deep.equal(['uuid']);
    });
});

describe('parsePartialComparatorStepConfig()', () => {
    it('should pass happy path', () => {
        const config = parsePartialComparatorStepConfig({
            priority: 1,
            ignore: ['controls'],
            ignoreCase: false,
            outOfTreeEnabled: true,
            matcherGenerators: [],
            stringComparisonMethod: 'absolute',
        });
        expect(config.priority).equals(1);
        expect(config.ignore).deep.equals(['controls']);
        expect(config.ignoreCase).equals(false);
        expect(config.outOfTreeEnabled).equals(true);
        expect(config.matcherGenerators).deep.equals([]);
        expect(config.stringComparisonMethod).equals('absolute');
    });

    it('should fail on unknown string comparison method', () => {
        expect(() => parsePartialComparatorStepConfig({ stringComparisonMethod: 'unknown' })).to.throw();
    });
});

describe('parseOutputConfig()', () => {
    it('should fail if passed a non-array', () => {
        expect(() => parseOutputConfig(1)).to.throw();
        expect(() => parseOutputConfig([])).to.throw();
    });

    it('should accept an object type', () => {
        expect(() => parseOutputConfig({})).to.not.throw();
        // TODO: OutputConfig is not sanitized and parsed, this could cause problems in the future!
    });
});

describe('parseConfig()', () => {
    it('should return a comparator config from a valid dict', () => {
        expect(() =>
            parseConfig({
                leftPath: 'l',
                rightPath: 'r',
                outputPath: 'out',
                comparatorConfig: {},
                outputConfigs: [{ identifiers: [], outputType: 'raw', outputPath: '', selection: '' }],
            }),
        ).to.not.throw();
    });

    it('should throw when fields are undefined', () => {
        expect(() => parseConfig({})).to.throw();
        expect(() => parseConfig({ rightPath: 'r', outputPath: 'out', comparatorConfig: {} })).to.throw();
        expect(() => parseConfig({ leftPath: 'l', outputPath: 'out', comparatorConfig: {} })).to.throw();
        expect(() => parseConfig({ leftPath: 'l', rightPath: 'r', comparatorConfig: {} })).to.throw();
        expect(() => parseConfig({ leftPath: 'l', rightPath: 'r', outputPath: 'out' })).to.throw();
    });
});
