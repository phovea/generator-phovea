'use strict';
const GeneratorUtils = require('../utils/GeneratorUtils');


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
        modules: ['phovea_server'],
        libraries: [],
        sextensions: [],
    };
    it('isWeb returns false', () => {
        expect(GeneratorUtils.stringifyAble(config).isWeb('phovea_server')).toBe(false);
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