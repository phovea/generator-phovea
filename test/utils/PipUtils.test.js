'use strict';
const PipUtils = require('../../utils/PipUtils');

describe('find intersection list of pip versions', () => {
    const pipPackage = 'alembic';
    it('check for empty list', () => {
        const versions = [];

        expect(PipUtils.mergePipVersions(pipPackage, versions)).toBe('');
    });

    it('check for single exact version', () => {
        const versions = ['==3.10.1'];

        expect(PipUtils.mergePipVersions(pipPackage, versions)).toBe('==3.10.1');
    });

    it('check for list of exact versions', () => {
        const versions = ['==3.10.1', '==3.10.2'];

        expect(PipUtils.mergePipVersions(pipPackage, versions)).toBe('==3.10.2');
    });

    it('check for list of ranged and exact versions', () => {
        const versions = ['~=3.10.1', '^=3.10.2'];

        expect(PipUtils.mergePipVersions(pipPackage, versions)).toBe('~=3.10.2');
    });

    // TODO Refactor to return max without removing the range tags
    it('finds max exact version when no intersection exists', () => {
        const versions = ['~=3.10.3', '^=3.10.2', '~=3.10.3', '^=4.10.2'];

        expect(PipUtils.mergePipVersions(pipPackage, versions)).toBe('==4.10.2');
    });
});

describe('check PipUtils.toSemver', () => {

    it('version is an empty string', () => {
        const version = '';
        expect(PipUtils.toSemVer(version)).toBe('');
    });

    it('version has `==`', () => {
        const version = '==3.4.0';
        expect(PipUtils.toSemVer(version)).toBe('3.4.0');
    });

    it('version has `~=`', () => {
        const version = '~=3.4.0';
        expect(PipUtils.toSemVer(version)).toBe('~3.4.0');
    });

    it('version has `^=`', () => {
        const version = '^=3.4.0';
        expect(PipUtils.toSemVer(version)).toBe('^3.4.0');
    });
});

describe('check PipUtils.toPipVersion', () => {

    it('version is an empty string', () => {
        const version = '';
        expect(PipUtils.toPipVersion(version)).toBe(null);
    });

    it('version has no range tag', () => {
        const version = '3.4.0';
        expect(PipUtils.toPipVersion(version)).toBe('==3.4.0');
    });

    it('version has a `~`', () => {
        const version = '~3.4.0';
        expect(PipUtils.toPipVersion(version)).toBe('~=3.4.0');
    });

    it('version has `^`', () => {
        const version = '^3.4.0';
        expect(PipUtils.toPipVersion(version)).toBe('^=3.4.0');
    });

});

describe('parse requirements.txt into an object', () => {

    it('returns an empty object if requirements file is null', () => {
        const file = null;
        expect(PipUtils.parseRequirements(file)).toEqual({});
    });

    it('returns an empty object if the requirements file contains an string of only whitespace', () => {
        const file = '  ';
        expect(PipUtils.parseRequirements(file)).toEqual({});
    });

    it('returns the requirements object', () => {
        const file = `
        flake8^=3.7.9
        pep8-naming~=0.9.1
        pytest==5.3.5
        git+https://github.com/datavisyn/tdp_core.git@develop#egg=tdp_core


        `;
        const result = {
            'flake8': '^=3.7.9',
            'pep8-naming': '~=0.9.1',
            'pytest': '==5.3.5',
            'git+https://github.com/datavisyn/tdp_core.git': '@develop#egg=tdp_core'
        };
        expect(PipUtils.parseRequirements(file)).toEqual(result);
    });
});
