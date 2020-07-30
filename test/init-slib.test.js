
'use strict';
const path = require('path');
const assert = require('yeoman-assert');
const helpers = require('yeoman-test');
const rimraf = require('rimraf');
/**
 * Directory name to run the generator
 */
const target = '../slib';

/**
 * Subgenerators composed with the `init-slib` subgenerator.
 */
const GENERATOR_DEPENDENCIES = [
  '../generators/_node',
  '../generators/_init-python',
  '../generators/_check-own-version',
  '../generators/check-node-version',
];

describe('generate slib plugin with default prompt values', () => {


  beforeAll(() => {
    return helpers
      .run(path.join(__dirname, '../generators/init-slib'))
      .inDir(path.join(__dirname, target), () => null)
      .withGenerators(GENERATOR_DEPENDENCIES);
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
