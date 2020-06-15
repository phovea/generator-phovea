
'use strict';
const path = require('path');
const assert = require('yeoman-assert');
const helpers = require('yeoman-test');
const rimraf = require('rimraf');
const fse = require('fs-extra');
/**
 * Directory name to run the generator
 */
const target = '../libslib';

/**
 * Subgenerators composed with the `init-lib-slib` subgenerator.
 */
const GENERATOR_DEPENDENCIES = [
  '../generators/_node',
  '../generators/_init-hybrid',
  '../generators/init-lib',
  '../generators/_init-web',
  '../generators/init-slib',
  '../generators/_init-python',
  '../generators/_check-own-version',
  '../generators/check-node-version',
];

/**
 * Get the path to the templates of a specific subgenerator.
 * @param {string} subgenerator 
 * @param {string} file 
 */
const templatePath = (subgenerator, file) => path.join(__dirname, `../generators/${subgenerator}/templates/${file}`);



describe('generate lib-slib plugin with default prompt values', () => {


  beforeAll(() => {
    return helpers
      .run(path.join(__dirname, '../generators/init-lib-slib'))
      .inDir(path.join(__dirname, target), () => null)
      .withGenerators(GENERATOR_DEPENDENCIES);
  });

  afterAll(() => {
    rimraf.sync(path.join(__dirname, target));
  });

  it('generates `package.json` with the correct devDependencies', () => {
    const initWebPackage = fse.readJSONSync(templatePath('_init-web', 'package.tmpl.json'));
    assert.jsonFileContent('package.json', {devDependencies: initWebPackage.devDependencies});
  });
});