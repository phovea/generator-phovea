
'use strict';
const path = require('path');
const helpers = require('yeoman-test');
const rimraf = require('rimraf');
const SpawnUtils = require('../utils/SpawnUtils');
const dependencies = require('./test-utils/generator-dependencies');

const repo = 'git@github.com:Caleydo/ordino.git';
const target = '../cloned';

const cloneRepo = (options) => helpers
    .run(path.join(__dirname, '../generators/clone-repo'))
    .inDir(path.join(__dirname, target), () => null)
    .withArguments([repo])
    .withOptions(options)
    .withGenerators(dependencies.COMMON);

describe('call clone-repo with branch develop', () => {

    beforeAll(() => {
        SpawnUtils.spawnOrAbort = jest.fn();

        return cloneRepo({branch: 'develop', extras: '--depth 1', dir: '.', cwd: 'ordino_workspace'});
    });

    afterAll(() => {
        rimraf.sync(path.join(__dirname, target));
    });

    it('calls function spawnOrAbort() once with the correct argument', () => {
        expect(SpawnUtils.spawnOrAbort.mock.calls.length).toBe(1);
        const cmd = SpawnUtils.spawnOrAbort.mock.calls[0][0];
        expect(cmd).toBe('git');

        const options = SpawnUtils.spawnOrAbort.mock.calls[0][1];
        expect(options).toStrictEqual(['clone', '-b', 'develop', '--depth', '1', repo, '.']);

        const cwd = SpawnUtils.spawnOrAbort.mock.calls[0][2];
        expect(cwd).toBe('ordino_workspace');
    });
});

describe('call clone-repo with an exact version tag', () => {

    beforeAll(() => {
        SpawnUtils.spawnOrAbort = jest.fn();
        return cloneRepo({branch: 'v2.0.0'});
    });

    afterAll(() => {
        rimraf.sync(path.join(__dirname, target));
    });

    it('calls function spawnOrAbort() once with the correct arguments', () => {
        expect(SpawnUtils.spawnOrAbort.mock.calls.length).toBe(1);
        const cmd = SpawnUtils.spawnOrAbort.mock.calls[0][0];
        expect(cmd).toBe('git');

        const options = SpawnUtils.spawnOrAbort.mock.calls[0][1];
        expect(options).toStrictEqual(['clone', '-b', 'v2.0.0', repo]);

        const cwd = SpawnUtils.spawnOrAbort.mock.calls[0][2];
        expect(cwd).toBe(undefined);
    });
});

describe('call clone-repo with an advanced version tag', () => {

    beforeAll(() => {
        SpawnUtils.spawnOrAbort = jest.fn();
        SpawnUtils.spawnSync = jest.fn();
        SpawnUtils.spawnSync.mockImplementation(() => {
            return {
                status: 0,
                stdout: `
                336072e87ec8f6054cead9f64c6830897fb7f076        refs/tags/v2.0.0
                8747a43780e4651542facd7b4feac7bcb8e3778d        refs/tags/v2.0.1
                `
            };
        });
        return cloneRepo({branch: '^v2.0.0'});
    });

    afterAll(() => {
        rimraf.sync(path.join(__dirname, target));
    });

    it('calls function spawnOrAbort() once with the the correctly resolved version tag', () => {
        expect(SpawnUtils.spawnSync.mock.calls.length).toBe(1);
        const cmd = SpawnUtils.spawnOrAbort.mock.calls[0][0];
        expect(cmd).toBe('git');

        const options = SpawnUtils.spawnOrAbort.mock.calls[0][1];
        expect(options).toStrictEqual(['clone', '-b', 'v2.0.1', repo]);

        const cwd = SpawnUtils.spawnOrAbort.mock.calls[0][2];
        expect(cwd).toBe(undefined);
    });
});

describe('call clone-repo with an advanced version tag and no remote', () => {

    beforeAll(() => {
        SpawnUtils.spawnOrAbort = jest.fn();
        SpawnUtils.abort = jest.fn();
        SpawnUtils.spawnSync = jest.fn();
        SpawnUtils.spawnSync.mockImplementation(() => {
            return {
                status: 128,
                stderr: `some error`
            };
        });
        return cloneRepo({branch: '^v2.0.0'});
    });

    afterAll(() => {
        rimraf.sync(path.join(__dirname, target));
    });

    it('calls function abort() once and spawnOrAbort() never', () => {
        expect(SpawnUtils.abort.mock.calls.length).toBe(1);
        const msg = SpawnUtils.abort.mock.calls[0][0];
        expect(msg).toBe('failed to fetch list of tags from git repository - status code: 128');

        expect(SpawnUtils.spawnOrAbort.mock.calls.length).toBe(0);
    });
});

describe('call clone-repo with an advanced version tag that does not resolve to an exact version tag', () => {

    beforeAll(() => {
        SpawnUtils.spawnOrAbort = jest.fn();
        SpawnUtils.abort = jest.fn();
        SpawnUtils.spawnSync = jest.fn();
        SpawnUtils.spawnSync.mockImplementation(() => {
            return {
                status: 0,
                stdout: `
                336072e87ec8f6054cead9f64c6830897fb7f076        refs/tags/v2.0.0
                8747a43780e4651542facd7b4feac7bcb8e3778d        refs/tags/v2.0.1
                `
            };
        });
        return cloneRepo({branch: '^v3.0.0'});
    });

    afterAll(() => {
        rimraf.sync(path.join(__dirname, target));
    });

    it('calls function abort() once and spawnOrAbort() never', () => {
        expect(SpawnUtils.abort.mock.calls.length).toBe(1);
        const msg = SpawnUtils.abort.mock.calls[0][0];
        expect(msg).toBe('failed to find git version tag for given version range');

        expect(SpawnUtils.spawnOrAbort.mock.calls.length).toBe(0);
    });
});

describe('call clone-repo with a git commit', () => {


    beforeAll(() => {
        SpawnUtils.spawnOrAbort = jest.fn();
        SpawnUtils.spawnOrAbort.mockImplementation(() => Promise.resolve());
        return cloneRepo({branch: 'e7cfd95e0ff2188d006444f93ea2ed6aeac18864'});
    });

    afterAll(() => {
        rimraf.sync(path.join(__dirname, target));
    });

    it('calls function spawnOrabort() twice', () => {
        expect(SpawnUtils.spawnOrAbort.mock.calls.length).toBe(2);

    });

    it('first it clones the the repo', () => {
        const cmd = SpawnUtils.spawnOrAbort.mock.calls[0][0];
        expect(cmd).toBe('git');

        const options = SpawnUtils.spawnOrAbort.mock.calls[0][1];
        expect(options).toStrictEqual(['clone', repo]);

        const cwd = SpawnUtils.spawnOrAbort.mock.calls[0][2];
        expect(cwd).toBe(undefined);

    });

    it('then it checks out the git commit', () => {
        const cmd = SpawnUtils.spawnOrAbort.mock.calls[1][0];
        expect(cmd).toBe('git');

        const options = SpawnUtils.spawnOrAbort.mock.calls[1][1];
        expect(options).toStrictEqual(['checkout', 'e7cfd95e0ff2188d006444f93ea2ed6aeac18864']);

        const cwd = SpawnUtils.spawnOrAbort.mock.calls[1][2];
        expect(cwd).toBe('ordino');
    });
});