
'use strict';
const path = require('path');
const assert = require('yeoman-assert');
const helpers = require('yeoman-test');
const rimraf = require('rimraf');
const fse = require('fs-extra');
const testUtils = require('./testUtils');

/**
 * Directory name to run the generator
 */
const target = '../lib';

/**
 * Subgenerators composed with the `init-lib` subgenerator.
 */
const GENERATOR_DEPENDENCIES = [
  '../generators/_node',
  '../generators/init-lib',
  '../generators/_init-web',
  '../generators/_check-own-version',
  '../generators/check-node-version',
];


const expectedFiles = [
  'tsd.d.ts',
  'jest.config.js'
];

const unExpectedFiles = [
  'webpack.config.js',
  'tests.webpack.js',
  'index.js'
];


describe('generate lib plugin with default prompt values', () => {

  /**
 * package.tmpl.json template of the _init-web subgenerator
 */
  const initWebPackage = fse.readJSONSync(testUtils.templatePath('_init-web', 'package.tmpl.json'));

  /**
   * tsconfig.json template of the _init-web subgenerator
   */
  const initWebTsConfig = fse.readJSONSync(testUtils.templatePath('_init-web', 'tsconfig.json', 'plain'));

  beforeAll(() => {
    return helpers
      .run(path.join(__dirname, '../generators/init-lib'))
      .inDir(path.join(__dirname, target), () => null)
      .withGenerators(GENERATOR_DEPENDENCIES);
  });

  afterAll(() => {
    rimraf.sync(path.join(__dirname, target));
  });

  it('generates `package.json` with correct devDependencies', () => {
    assert.jsonFileContent('package.json', {devDependencies: initWebPackage.devDependencies});
  });

  it('generates `package.json` with a correct `main`', () => {
    assert.jsonFileContent('package.json', {main: initWebPackage.main});
  });

  it('generates `package.json` with correct `types`', () => {
    assert.jsonFileContent('package.json', {types: initWebPackage.types});
  });

  it('generates `.gitignore` that has no `/dist/` entry', () => {
    assert.noFileContent('.gitignore', '/dist/');
  });

  it('generates `tsconfig.json` with correct content', () => {
    assert.jsonFileContent('tsconfig.json', initWebTsConfig);
  });

  it('generates no `tsconfig_dev.json`', () => {
    assert.noFile('tsconfig_dev.json');
  });

  it('generates expected plugin files', () => {
    assert.file(expectedFiles);
  });

  it('generates no unexpected plugin files', () => {
    assert.noFile(unExpectedFiles);
  });
});