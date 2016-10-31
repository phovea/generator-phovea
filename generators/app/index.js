'use strict';
var generators = require('yeoman-generator');

const knownPluginTypes = ['app', 'bundle', 'lib', 'server', 'service'];
const defaultPluginType = ['app'];

class ChooseGenerator extends generators.Base {

  constructor(args, options) {
    super(args, options);
    // Make options available
    this.option('install');
  }

  prompting() {
    return this.prompt([{
      type: 'list',
      name: 'type',
      message: 'Plugin Type',
      choices: knownPluginTypes,
      default: defaultPluginType
    }]).then((props) => {
      this.config.set('type', props.type);
    });
  }

  default() {
    const type = this.config.get('type');
    this.composeWith(`phovea:${type}-plugin`, {
      options: {
        install: this.options.install
      }
    }, {
      local: require.resolve(`../${type}-plugin`)
    });
  }
}

module.exports = ChooseGenerator;
