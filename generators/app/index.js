'use strict';
const Base = require('yeoman-generator');
const plugins = require('../../utils/types').plugin;

class Generator extends Base {

  constructor(args, options) {
    super(args, options);
    // Make options available
    this.option('install');
  }

  initializing() {
    this.composeWith('phovea:check-node-version');
  }

  prompting() {
    return this.prompt([{
      type: 'list',
      name: 'type',
      message: 'Plugin Type',
      choices: plugins.typesWithDescription,
      default: plugins.types[0]
    }]).then((props) => {
      this.config.set('type', props.type);
      this.gen = 'init-' + props.type;
    });
  }

  default() {
    const gen = this.gen;
    this.composeWith(`phovea:${gen}`, {
      options: {
        install: this.options.install
      }
    }, {
      local: require.resolve(`../${gen}`)
    });
  }
}

module.exports = Generator;
