
'use strict';
const path = require('path');
const assert = require('yeoman-assert');
const helpers = require('yeoman-test');
const rimraf = require('rimraf');
const fse = require('fs-extra');
const TestUtils = require('./test-utils/TestUtils');
const {template} = require('lodash');
const SpawnUtils = require('../utils/SpawnUtils');
const dependencies = require('./test-utils/generator-dependencies');

/**
 * Directory name to run the generator
 */
const target = '../lib';

const expectedFiles = [
  'tsd.d.ts',
  'jest.config.js'
];

const unExpectedFiles = [
  'webpack.config.js',
  'tests.webpack.js',
  'index.js'
];

/**
 * Run yo phovea:init-lib in dir
 */
const runInitLib = () => helpers
  .run(path.join(__dirname, '../generators/init-lib'))
  .withGenerators(dependencies.INIT_LIB)
  .inDir(path.join(__dirname, target), () => null);


describe('Generate lib plugin with default prompt values', () => {

  /**
   * package.tmpl.json template of the _init-web subgenerator
   */
  const initWebPackage = fse.readJSONSync(TestUtils.templatePath('_init-web', 'package.tmpl.json'));

  /**
   * tsconfig.json template of the _init-web subgenerator
   */
  const initWebTsConfig = fse.readJSONSync(TestUtils.templatePath('_init-web', 'tsconfig.json', 'plain'));

  beforeAll(() => {
    return runInitLib();
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

  it('generates `.gitignore` that has no `/dist/` but a `/dist/tsBuildInfoFile` entry', () => {
    assert.noFileContent('.gitignore', '/dist/\n');
    assert.fileContent('.gitignore', '/dist/tsBuildInfoFile\n');
  });

  it('generates `tsconfig.json` with correct content', () => {
    assert.jsonFileContent('tsconfig.json', initWebTsConfig);
  });

  it('generates `.yo-rc.json` with correct type', () => {
    assert.jsonFileContent('.yo-rc.json', {"generator-phovea": {type: 'lib'}});
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

describe('Generate plugin with name `tdp_core`', () => {

  const prompts = {
    name: 'tdp_core'
  };

  beforeAll(() => {
    return runInitLib().withPrompts(prompts);
  });

  afterAll(() => {
    rimraf.sync(path.join(__dirname, target));
  });
});

describe('Test options of yo phovea:init-lib', () => {

  const prompts = {
    name: 'tdp_core'
  };

  const options = {
    install: true
  };

  beforeAll(() => {
    SpawnUtils.spawnSync = jest.fn();
    return runInitLib()
      .withPrompts(prompts)
      .withOptions(options);
  });

  afterAll(() => {
    rimraf.sync(path.join(__dirname, target));
  });

  it('runs yarn install', () => {
    expect(SpawnUtils.spawnSync.mock.calls.length).toBe(1);
    const [cmd, args, cwd, verbose] = SpawnUtils.spawnSync.mock.calls[0];
    expect([cmd, args, cwd, verbose]).toStrictEqual(['yarn', 'install', '', true]);
  });
});