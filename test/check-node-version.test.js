
'use strict';
const path = require('path');
const helpers = require('yeoman-test');
const fs = require('fs');
const installedVersions = require('../utils/installedVersions');
const requiredNodeVersion = fs.readFileSync(path.resolve(__dirname, '../.nvmrc'), 'utf8');
const requiredNpmVersion = fs.readFileSync(path.resolve(__dirname, '../.npm-version'), 'utf8');

jest.mock('check-node-version');
const check = require('check-node-version');
const {version} = require('punycode');

installedVersions.checkRequiredVersion = jest.fn();

describe('check-node-version', () => {
    const results = {
        versions: {
            node: {
                version: {
                    version: 12
                },
            },
            npm: {
                version: {
                    version: 18
                }
            }
        }
    };

    const versions = {
        installed: {
            node: results.versions.node.version.version,
            npm: results.versions.npm.version.version
        },
        required: {
            node: requiredNodeVersion.replace('\n', ''),
            npm: requiredNpmVersion.replace('\n', '')
        }
    };

    check.mockImplementation((_, cb) => cb(false, results));


    beforeAll(() => {
        return helpers
            .run(path.join(__dirname, '../generators/check-node-version'));

    });
    it('calls function check only once', () => {
        expect(check.mock.calls.length).toBe(1);
    });

    it('calls function checkRequiredVersion once', () => {
        expect(installedVersions.checkRequiredVersion.mock.calls.length).toBe(1);
    });

    it('calls checkRequiredVersion with correct argument', () => {
        expect(installedVersions.checkRequiredVersion.mock.calls[0][0]).toMatchObject(versions);
    });

    // it('throws error if function check returns an error', () => {
    //     TODO do not terminate the node process in installedVersions since it also kills the test. Throw an error instead.
    //     check.mockImplementation((_, cb) => cb(true, null));
    //     expect(installedVersions.checkRequiredVersion.mock.calls[0][0]).toMatchObject(versions);
    // });
});
