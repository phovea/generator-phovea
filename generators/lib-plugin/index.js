'use strict';
var path = require('path');
var generators = require('yeoman-generator');
var askName = require('inquirer-npm-name');
var _ = require('lodash');

class PluginGenerator extends generators.Base {

  constructor(args, options) {
    super(args, options);

    // Make options available
    this.option('skipInstall');
  }

  initializing() {

  }

  prompting() {
    return askName({
      name: 'name',
      message: 'Your phovea library plugin name',
      default: path.basename(process.cwd()),
      filter: _.kebabCase
    }, this).then((props) => {
      this.config.set('name', props.name);
    });
  }

  default() {
    this.composeWith('phovea:web-plugin', {
      options: {
        skipInstall: this.options.skipInstall
      }
    }, {
      local: require.resolve('../web-plugin')
    });
  }

  writing() {
    const config = this.config.getAll();
    this.fs.copy(this.templatePath('plain/**/*'), this.destinationPath());
    this.fs.copyTpl(this.templatePath('processed/**/*'), this.destinationPath(), config);
  }
}

module.exports = PluginGenerator;
