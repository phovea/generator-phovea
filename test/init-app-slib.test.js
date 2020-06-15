
'use strict';
const path = require('path');
const assert = require('yeoman-assert');
const helpers = require('yeoman-test');
const rimraf = require('rimraf');
const fse = require('fs-extra');
const testUtils=require('./testUtils');
/**
 * Directory name to run the generator
 */
const target = '../appslib';

/**
 * Subgenerators composed with the `init-app-slib` subgenerator.
 */
const GENERATOR_DEPENDENCIES = [
  '../generators/_node',
  '../generators/_init-hybrid',
  '../generators/init-app',
  '../generators/_init-web',
  '../generators/init-slib',
  '../generators/_init-python',
  '../generators/_check-own-version',
  '../generators/check-node-version',
];

const expectedFiles = [
  'tsd.d.ts'
];

const unExpectedFiles = [
  'webpack.config.js',
  'tests.webpack.js',
];

describe('generate app-slib plugin with prompt `app: appName` and the rest default prompt values', () => {


  beforeAll(() => {
    return helpers
      .run(path.join(__dirname, '../generators/init-app-slib'))
      .inDir(path.join(__dirname, target), () => null)
      .withPrompts({
        app:'appName'
    })
      .withGenerators(GENERATOR_DEPENDENCIES);
  });

  afterAll(() => {
    rimraf.sync(path.join(__dirname, target));
  });

  it('generates `package.json` with the correct devDependencies', () => {
    const initWebPackage = fse.readJSONSync(testUtils.templatePath('_init-web', 'package.tmpl.json'));
    assert.jsonFileContent('package.json', {devDependencies: initWebPackage.devDependencies});
  });

  it('generates `.gitignore` that has no `/dist/` entry', () => {
    assert.noFileContent('.gitignore','/dist/');
  });

  it('generates `tsconfig.json` with correct content', () => {
    const initWebTsConfig = fse.readJSONSync(testUtils.templatePath('_init-web', 'tsconfig.json', 'plain'));
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