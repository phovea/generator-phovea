'use strict';
var path = require('path');
var generators = require('yeoman-generator');
var askName = require('inquirer-npm-name');
var _ = require('lodash');
var patchPackageJSON = require('../../utils').patchPackageJSON;

function resolveRepo(repo) {
  if (!repo) {
    return '';
  }
  if (typeof repo === 'string') {
    return repo;
  }
  return repo.url;
}

class PluginGenerator extends generators.Base {

  constructor(args, options) {
    super(args, options);

    // Make options available
    this.option('skipInstall');


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
    //already set
    if (this.config.get('name')) {
      return Promise.resolve(null);
    }

    return askName({
      name: 'name',
      message: 'Your phovea plugin name',
      default: path.basename(process.cwd()),
      filter: _.kebabCase
    }, this).then((props) => {
      this.config.set('name', this.props.name);
    });
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
    const config = this.config.getAll();
    patchPackageJSON.call(this, config);
    this.fs.copy(this.templatePath('plain/**/*'), this.destinationPath());
    this.fs.copyTpl(this.templatePath('processed/**/*'), this.destinationPath(), config);
  }

  install() {
    if(!this.options.skipInstall) {
      this.installDependencies({ bower: false });
    }
  }
}

module.exports = PluginGenerator;
