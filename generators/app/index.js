'use strict';
var path = require('path');
var generators = require('yeoman-generator');

const knownPluginTypes = ['app', 'bundle', 'lib', 'server'];
const defaultPluginType = ['app'];

class ChooseGenerator extends generators.Base {

    constructor(args, options) {
      super(args, options);
      // Make options available
      this.option('skipInstall');
    }

    prompting() {
      return this.prompt([{
          type: 'list',
          name: 'type',
          message: 'Which type of plugin?',
          choices: knownPluginTypes,
          default: defaultPluginType
        }]).then((props) => {
          this.config.set('type', props.type);
        });
      }

      default () {
        const type = this.config.get('type');
        this.composeWith(`phovea:${type}-plugin`, {
          options: {
            skipInstall: this.options.skipInstall
          }
        }, {
          local: require.resolve(`../${type}-plugin`)
        });
      }
    }

    module.exports = ChooseGenerator;
