'use strict';
var path = require('path');
var generators = require('yeoman-generator');
var askName = require('inquirer-npm-name');
var _ = require('lodash');
var extend = require('deep-extend');

class PluginGenerator extends generators.Base {

  constructor(args, options) {
    super(args, options);

    // Make options available
    this.option('skip-install');

    this.config.save();


    this.props = {};
  }

  initializing() {

  }

  prompting() {
    return askName({
      name: 'name',
      message: 'Your phovea plugin name',
      default: path.basename(process.cwd()),
      filter: _.kebabCase
    }, this).then((props) => {
      this.props.name = props.name;
      this.props.description = '';
      this.props.libraries = {};
      this.props.modules = ['phovea_core'];
      this.props.extensions = [];
      this.props.repository = '';
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
        name: this.props.name,
        coveralls: false,
        skipInstall: this.options.skipInstall
      }
    }, {
      local: require('generator-node').app
    });
  }

  writing() {
    var pkg = this.fs.readJSON(this.destinationPath('package.json'), {});
    var pkg_patch = JSON.parse(_.template(this.fs.read(this.templatePath('package.tmpl.json')))({
      name: this.props.name
    }));
    extend(pkg, pkg_patch);

    this.fs.writeJSON(this.destinationPath('package.json'), pkg);

    this.props.repository = '';
    this.log(pkg);

    this.fs.copy(this.templatePath('plain/**/*'), this.destinationPath());
    this.fs.copyTpl(this.templatePath('processed/**/*'), this.destinationPath(), this.props);
  }

  install() {
    if(!this.options['skip-install']) {
      this.installDependencies({ bower: false });
    }
  }
}

module.exports = PluginGenerator;
