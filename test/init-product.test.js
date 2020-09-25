
'use strict';
const path = require('path');
const assert = require('yeoman-assert');
const helpers = require('yeoman-test');
const rimraf = require('rimraf');
const fse = require('fs-extra');
const TestUtils = require('./TestUtils');
const {template} = require('lodash');

/**
 * Directory name to run the generator
 */
const target = '../product';


const expectedFiles = [
    '.gitattributes',
    'package.json',
    'build.js',
    'phovea_product.schema.json',
    '.circleci/config.yml',
    '.gitignore',
    'README.md',
    '.editorconfig',
    'ISSUE_TEMPLATE.md',
    'LICENSE'
];

/**
 * Subgenerators composed with the `init-slib` subgenerator.
 */
const GENERATOR_DEPENDENCIES = [
    '../generators/_node',
    '../generators/_check-own-version',
    '../generators/check-node-version',
];


describe('generate a product with default prompt values', () => {

    const pluginName = 'wep_app';
    const pkg = JSON.parse(template(JSON.stringify(fse.readJSONSync(TestUtils.templatePath('init-product', 'package.tmpl.json'))))(
        {name: pluginName}));

    const config = {
        type: 'web',
        label: 'Web App',
        repo: 'phovea/wep_app',
        branch: 'master',
        additional: [{
            "name": "phovea_core",
            "repo": "phovea/phovea_core",
        }, {
            "name": "phovea_ui",
            "repo": "phovea/phovea_ui",
        }]
    };

    beforeAll(() => {
        return helpers
            .run(path.join(__dirname, '../generators/init-product'))
            .inDir(path.join(__dirname, target), () => null)
            .withGenerators(GENERATOR_DEPENDENCIES)
            .withPrompts({
                ...config,
                name: pluginName,
            });
    });

    afterAll(() => {
        rimraf.sync(path.join(__dirname, target));
    });

    it('generates all expected files', () => {
        assert.file(expectedFiles);
    });

    it('generates correct `package.json`', () => {
        assert.jsonFileContent('package.json', {dependencies: pkg.dependencies});
        assert.jsonFileContent('package.json', {name: 'wep_app'});
        assert.jsonFileContent('package.json', {scripts: pkg.scripts});
    });

    it('generates `phovea_product.json` with the correct service', () => {
        assert.jsonFileContent('phovea_product.json', [config]);
    });
});