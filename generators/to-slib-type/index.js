'use strict';
const Base = require('yeoman-generator');
const {merge, omit, extend, template} = require('lodash');

const diff = [
  'buildInfo.js',
  'index.js',
  'jest.config.js',
  'phovea_registry.js',
  'src/index.ts',
  'src/phovea.ts',
  'tests.webpack.js',
  'tests/index.test.ts',
  'tsconfig.json',
  'tsconfig_dev.json',
  'tsd.d.ts',
  'tslint.json',
  'typedoc.json',
  'webpack.config.js'
]
const prefix = '../../';

class DowngradeSlib extends Base {

  constructor(args, options) {
    super(args, options);
  }

  initializing() {
    this.gitIgnorePath = this.templatePath(`${prefix}_init-python/templates/_gitignore`)
    this.pathToConfigYml = this.templatePath(`${prefix}_init-python/templates/plain/.circleci/config.yml`)
    this.pathToPackageJSON = this.templatePath(`${prefix}_init-python/templates/package.tmpl.json`)
  }

  _reversePackageJSON() {
    const config = this.config.getAll();
    let pkg = this.fs.readJSON(this.destinationPath('package.json'));
    const pkgPatch = JSON.parse(template(this.fs.read(this.pathToPackageJSON))(config));
    pkg = omit(pkg, ['engines', 'dependencies', 'devDependencies']);
    pkg = Object.assign(pkg, pkgPatch);
    this.fs.writeJSON(this.destinationPath('package.json'), pkg);
  }
  _downgrade() {
    diff.forEach((file) => this.fs.delete(this.destinationPath(file)))
    this.fs.copyTpl(this.gitIgnorePath, this.destinationPath('.gitignore'));
    this.fs.copyTpl(this.pathToConfigYml, this.destinationPath('.circleci/config.yml'));
    this._reversePackageJSON();
  }

  _upgrade(){

  }

  writing() {
    this._downgrade();
  }
}

module.exports = DowngradeSlib;
