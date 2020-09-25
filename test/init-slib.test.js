
'use strict';
const path = require('path');
const assert = require('yeoman-assert');
const helpers = require('yeoman-test');
const rimraf = require('rimraf');
const dependencies = require('./generator-dependencies');
/**
 * Directory name to run the generator
 */
const target = '../slib';

describe('generate slib plugin with default prompt values', () => {


  beforeAll(() => {
    return helpers
      .run(path.join(__dirname, '../generators/init-slib'))
      .inDir(path.join(__dirname, target), () => null)
      .withGenerators(dependencies.INIT_SLIB);
  });

  afterAll(() => {
    rimraf.sync(path.join(__dirname, target));
  });

  it('generates `package.json` with no devDependencies', () => {
    assert.jsonFileContent('package.json', {devDependencies: undefined});
  });

  it('generates `package.json` with a no `main`', () => {
    assert.jsonFileContent('package.json', {main: undefined});
  });

  it('generates `package.json` with a no `types`', () => {
    assert.jsonFileContent('package.json', {types: undefined});
  });
});
