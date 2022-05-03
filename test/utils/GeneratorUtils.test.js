'use strict';
const GeneratorUtils = require('../../utils/GeneratorUtils');


describe('Test `stringifyInline()` correctly stringifies object', () => {

    it('adds 1 space', () => {
        const obj = {key1: 'value1', key2: 'value2'};
        const space = ' ';
        const result = "{\n  'key1': 'value1',\n  'key2': 'value2'\n }";
        expect(GeneratorUtils.stringifyInline(obj, space)).toBe(result);
    });

    it('adds 2 spaces', () => {
        const obj = {key1: 'value1', key2: 'value2'};
        const space = '  ';
        const result = "{\n   'key1': 'value1',\n   'key2': 'value2'\n  }";
        expect(GeneratorUtils.stringifyInline(obj, space)).toBe(result);
    });

    it('removes double quotes', () => {
        const obj = {key1: 'value1', key2: 'value2'};
        const space = '  ';
        const result = '{\n   "key1": "value1",\n   "key2": "value2"\n  }';
        expect(GeneratorUtils.stringifyInline(obj, space)).not.toBe(result);
    });
});

describe('Test `stringifyAble()`', () => {
    const config = {
        type: 'slib',
        modules: ['tdp_core'],
        libraries: [],
        sextensions: [],
    };
    it('isWeb returns true', () => {
        expect(GeneratorUtils.stringifyAble(config).isWeb('tdp_core')).toBe(true);
    });

    it('formats boolean to python boolean', () => {
        expect(GeneratorUtils.stringifyAble(config).stringifyPython({key1: true, key2: false}, ' ')).toBe("{\n  'key1': True,\n  'key2': False\n }");
    });

    it('returns stringify function', () => {
        expect(GeneratorUtils.stringifyAble(config).stringify).toBe(GeneratorUtils.stringifyInline);
    });

    it('returns the config', () => {
        expect(GeneratorUtils.stringifyAble(config)).toMatchObject(config);
    });
});

describe('Test `toJSONFromText()`', () => {
    it('parses string to object with the correct variable types ', () => {

        const extras = `
        type=lib
        isBoolean=true
        count=3
        weights=[1, 2, 3]
        `;

        const extrasObject = {
            type: 'lib',
            isBoolean: true,
            count: 3,
        };
        expect(GeneratorUtils.toJSONFromText(extras)).toMatchObject(extrasObject);
    });

    it('parses dot notation to correct nested object', () => {
        const extras = `
       config.name=ordino
       config.isServer=false
       config.number=5
        `;

        const extrasObject = {
            config: {
                name: 'ordino',
                isServer: false,
                number: 5
            }
        };

        expect(GeneratorUtils.toJSONFromText(extras)).toMatchObject(extrasObject);
    });

    it('returns an empty object for non string inputs', () => {
        expect(GeneratorUtils.toJSONFromText(null)).toMatchObject({});
        expect(GeneratorUtils.toJSONFromText(undefined)).toMatchObject({});
        expect(GeneratorUtils.toJSONFromText('')).toMatchObject({});
        expect(GeneratorUtils.toJSONFromText(' ')).toMatchObject({});
        expect(GeneratorUtils.toJSONFromText(1)).toMatchObject({});
    });
});