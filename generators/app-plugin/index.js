'use strict';
var path = require('path');
var generators = require('yeoman-generator');
var askName = require('inquirer-npm-name');
var patchPackageJSON = require('../../utils').patchPackageJSON;

class PluginGenerator extends generators.Base {

  constructor(args, options) {
    super(args, options);

    // Make options available
    this.option('skipInstall');
  }

  initializing() {
    this.config.defaults({
      libraries: {
        d3: 'd3/d3'
      },
      modules: ['phovea_core', 'phovea_bootstrap_fontawesome']
    });
  }

  prompting() {
    return askName({
      name: 'name',
      message: 'Your phovea application plugin name',
      default: path.basename(process.cwd()),
      filter: _.kebabCase
    }, this).then((props) => {
      this.config.set('name', props.name);
    });
  }

  default() {
    this.composeWith('phovea:web-plugin',{
      options: {
        skipInstall: this.options.skipInstall
      }
    }, {
      local: require('../web-plugin')
    });
  }

  writing() {
    const config = this.config.getAll();
    patchPackageJSON.call(this, config);
    this.fs.copy(this.templatePath('plain/**/*'), this.destinationPath());
    this.fs.copyTpl(this.templatePath('processed/**/*'), this.destinationPath(), config);
  }
}

module.exports = PluginGenerator;
