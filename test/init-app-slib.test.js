
'use strict';
const path = require('path');
const assert = require('yeoman-assert');
const helpers = require('yeoman-test');
const rimraf = require('rimraf');
const fse = require('fs-extra');
const TestUtils = require('./TestUtils');
/**
 * Directory name to run the generator
 */
const target = '../appslib';

/**
 * Subgenerators composed with the `init-app-slib` subgenerator.
 */
const GENERATOR_DEPENDENCIES = [
  '../generators/_init-hybrid',
  '../generators/_node',
  '../generators/init-app',
  '../generators/_init-web',
  '../generators/init-slib',
  '../generators/_init-python',
  '../generators/_check-own-version',
  '../generators/check-node-version',
];

const expectedFiles = [
  'tsd.d.ts',
  'jest.config.js',
  'src/index.template.ejs'
];

const unExpectedFiles = [
  'webpack.config.js',
  'tests.webpack.js',
];


describe('generate app-slib plugin with prompt `app: appName` and the rest default prompt values', () => {

  /**
   * package.tmpl.json template of the _init-web subgenerator
   */
  const initWebPackage = fse.readJSONSync(TestUtils.templatePath('_init-web', 'package.tmpl.json'));

  /**
   * tsconfig.json template of the _init-web subgenerator
   */
  const initWebTsConfig = fse.readJSONSync(TestUtils.templatePath('_init-web', 'tsconfig.json', 'plain'));

  beforeAll(() => {
    return helpers
      .run(path.join(__dirname, '../generators/init-app-slib'))
      .inDir(path.join(__dirname, target), () => null)
      .withPrompts({
        app: 'appName'
      })
      .withGenerators(GENERATOR_DEPENDENCIES);
  });

  afterAll(() => {
    rimraf.sync(path.join(__dirname, target));
  });

  it('generates `package.json` with the correct devDependencies', () => {
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
