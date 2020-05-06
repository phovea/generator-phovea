'use strict';
const Base = require('yeoman-generator');

const diff = [
  'buildPython.js',
  'deploy/docker-compose.partial.yml',
  'docker_packages.txt',
  'docs/.gitignore',
  'docs/_static/touch.txt',
  'docs/_templates/touch.txt',
  'docs/conf.py',
  'docs/index.rst',
  'requirements.txt',
  'requirements_dev.txt',
  'setup.cfg',
  'setup.py',
  'test/__init__.py',
  'test/config.json',
  'tox.ini',
]
const prefix = '../../';

class DowngradeLib extends Base {

  constructor(args, options) {
    super(args, options);
  }

  initializing() {
    this.gitIgnorePath = this.templatePath(`${prefix}_init-web/templates/_gitignore`)
    this.pathToConfigYml = this.templatePath(`${prefix}_init-web/templates/plain/.circleci/config.yml`)
    this.pathToPackageJSON = this.templatePath(`${prefix}_init-web/templates/package.tmpl.json`)
  }
  _reversePackageJSON() {
    const pkg = this.fs.readJSON(this.destinationPath('package.json'));
    const {scripts, files} = this.fs.readJSON(this.pathToPackageJSON);
    pkg.scripts = scripts;
    pkg.files = files;
    this.fs.writeJSON(this.destinationPath('package.json'), pkg);
  }
  writing() {
    diff.forEach((file) => this.fs.delete(this.destinationPath(file)))
    this.fs.copyTpl(this.gitIgnorePath, this.destinationPath('.gitignore'));
    this.fs.copyTpl(this.pathToConfigYml, this.destinationPath('.circleci/config.yml'));
    this._reversePackageJSON();
  }
}

module.exports = DowngradeLib;
