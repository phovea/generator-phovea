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
      name: 'task',
      message: 'Task',
      choices: ['init', 'ueber', 'clone'],
      default: 'init'
    }, {
      type: 'list',
      name: 'type',
      message: 'Plugin Type',
      choices: knownPluginTypes,
      default: defaultPluginType,
      when: (props) => props.task === 'init'
    }]).then((props) => {
      if (props.task === 'init') {
        this.config.set('type', props.type);
        this.gen = 'init-' + props.type;
      } else {
        this.gen = props.task;
      }
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

module.exports = ChooseGenerator;
