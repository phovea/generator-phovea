'use strict';
var path = require('path');
var generators = require('yeoman-generator');
var askName = require('inquirer-npm-name');
var _ = require('lodash');
var extend = require('deep-extend');
var mkdirp = require('mkdirp');

function makeGeneratorName(name) {
  name = _.kebabCase(name);
  name = name.indexOf('phovea_') === 0 ? name : 'phovea_' + name;
  return name;
}

module.exports = generators.Base.extend({
  initializing: function () {
    this.props = {};
  },

  prompting: function () {
    return askName({
      name: 'name',
      message: 'Your phovea plugin name',
      default: makeGeneratorName(path.basename(process.cwd())),
      filter: makeGeneratorName,
      validate: function (str) {
        return str.length > 'phovea-'.length;
      }
    }, this).then(function (props) {
      this.props.name = props.name;
    }.bind(this));
  },

  default: function () {
    if (path.basename(this.destinationPath()) !== this.props.name) {
      this.log(
        'Your generator must be inside a folder named ' + this.props.name + '\n' +
        'I\'ll automatically create this folder.'
      );
      mkdirp(this.props.name);
      this.destinationRoot(this.destinationPath(this.props.name));
    }

    this.composeWith('node:app', {
      options: {
        babel: false,
        boilerplate: false,
        name: this.props.name,
        skipInstall: this.options.skipInstall
      }
    }, {
      local: require('generator-node').app
    });
  },

  writing: function () {
    var pkg = this.fs.readJSON(this.destinationPath('package.json'));
    var pkg_patch = JSON.parse(_.template(this.fs.read(this.templatePath('package.tmpl.json')))({
      name: this.props.name
    }));
    extend(pkg, pkg_patch);

    this.fs.writeJSON(this.destinationPath('package.json'), pkg);

    const templates = {
      name: this.props.name,
      repository: pkg.repository.url,
      modules: [],
      libraries: {},
      extensions: []
    };

    this.fs.copy(this.templatPath('plain/**/*'), this.destinationPath(), templates);
    this.fs.copyTpl(this.templatPath('processed/**/*'), this.destinationPath(), templates);
  },

  install: function () {
    this.installDependencies({bower: false});
  }
});
