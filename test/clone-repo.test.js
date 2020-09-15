
'use strict';
const path = require('path');
const assert = require('yeoman-assert');
const helpers = require('yeoman-test');
const NpmUtils = require('../utils/NpmUtils');
const SpawnUtils = require('../utils/SpawnUtils');

/**
 * Subgenerators composed with the `clone-repo` subgenerator.
 */
const GENERATOR_DEPENDENCIES = [

    '../../generators/_check-own-version',
    '../../generators/check-node-version',
];

describe('generator clone-repo', () => {

    const repo = 'git@github.com:Caleydo/ordino.git';

    beforeAll(() => {
        // NpmUtils.isGitCommit = jest.fn();
        // NpmUtils.isGitCommit.mockReturnValueOnce(true);
        // NpmUtils.isAdvancedVersionTag = jest.fn();
        SpawnUtils.spawnOrAbort = jest.fn();

        return helpers
            .run(path.join(__dirname, '../generators/clone-repo'))
            .inDir(path.join(__dirname, 'cloned'), () => null)
            .withArguments([repo])
            .withOptions({branch: 'develop'})
            .withGenerators(GENERATOR_DEPENDENCIES);
    });

    it('calls function spawnOrAbort() once with argument `develop`', () => {
        expect(SpawnUtils.spawnOrAbort.mock.calls.length).toBe(1);
        expect(SpawnUtils.spawnOrAbort.mock.calls[0][0]).toBe('git');
        expect(SpawnUtils.spawnOrAbort.mock.calls[0][1]).toStrictEqual(['clone', '-b', 'develop', repo]);
        expect(SpawnUtils.spawnOrAbort.mock.calls[0][2]).toBe(undefined);
    });
});
