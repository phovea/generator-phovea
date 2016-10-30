'use strict';
var path = require('path');
var generators = require('yeoman-generator');
var askName = require('inquirer-npm-name');
var _ = require('lodash');
var Base = require('../../utils').Base;

function resolveRepo(repo) {
  if (!repo) {
    return '';
  }
  if (typeof repo === 'string') {
    return repo;
  }
  return repo.url;
}

const knownPlugins = require('../../knownPhoveaPlugins.json');

class PluginGenerator extends Base {

  constructor(args, options) {
    super('', args, options);
  }

  initializing() {
    const pkg = this.fs.readJSON(this.destinationPath('package.json'), {});
    this.config.defaults({
      name: pkg.name || '',
      author: '',
      today: (new Date()).toUTCString(),
      libraries: {},
      modules: ['phovea_core'],
      extensions: [],
      description: pkg.description || '',
      repository: resolveRepo(pkg.repository),
    });
  }

  prompting() {
    return super.prompting();
  }

  default() {
    this.composeWith('node:app', {
      options: {
        babel: false,
        boilerplate: false,
        editorconfig: false,
        git: false,
        gulp: false,
        travis: false,
        name: this.config.get('name'),
        coveralls: false,
        skipInstall: this.options.skipInstall
      }
    }, {
      local: require('generator-node').app
    });
  }

  writing() {
    super.writing();
  }

  install() {
    if(!this.options.skipInstall) {
      this.installDependencies({ bower: false });
    }
  }
}

module.exports = PluginGenerator;
