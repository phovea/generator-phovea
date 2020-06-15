
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
const target = '../app';

/**
 * Subgenerators composed with the `init-app` subgenerator.
 */
const GENERATOR_DEPENDENCIES = [
  '../generators/_node',
  '../generators/init-lib',
  '../generators/_init-web',
  '../generators/_check-own-version',
  '../generators/check-node-version',
];

describe('generate app plugin with prompt `app: appName` and the rest default prompt values', () => {


  beforeAll(() => {
    return helpers
      .run(path.join(__dirname, '../generators/init-app'))
      .inDir(path.join(__dirname, target), () => null)
      .withPrompts({
          app:'appName'
      })
      .withGenerators(GENERATOR_DEPENDENCIES);
  });

  afterAll(() => {
    rimraf.sync(path.join(__dirname, target));
  });

  it('generates `package.json` with correct devDependencies', () => {
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

  it('generates `tsconfig_dev.json`', () => {
    assert.file('tsconfig_dev.json');
  });
});