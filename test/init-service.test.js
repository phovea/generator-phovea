
'use strict';
const path = require('path');
const assert = require('yeoman-assert');
const helpers = require('yeoman-test');
const rimraf = require('rimraf');
const dependencies = require('./test-utils/generator-dependencies');
/**
 * Directory name to run the generator
 */
const target = '../service';

describe('generate service plugin with default prompt values', () => {

  beforeAll(() => {
    return helpers
      .run(path.join(__dirname, '../generators/init-service'))
      .inDir(path.join(__dirname, target), () => null)
      .withGenerators(dependencies.INIT_SERVICE);
  });

  afterAll(() => {
    rimraf.sync(path.join(__dirname, target));
  });

  it('generates `package.json` with no devDependencies', () => {
    assert.jsonFileContent('package.json', {devDependencies: undefined});
  });

  it('generates `.yo-rc.json` with correct type', () => {
    assert.jsonFileContent('.yo-rc.json', {"generator-phovea": {type: 'service'}});
  });
});
