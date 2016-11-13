'use strict';
const Base = require('yeoman-generator').Base;

const known = require('../../utils/known');
const plugins = known.plugins;
const libs = known.libs;

class Generator extends Base {

  prompting() {
    const type = this.config.get('type');
    var moduleChoices = [];
    var libraryChoices = [];
    if (plugins.isTypeHybrid({type})) {
      moduleChoices = plugins.listNamesWithDescription;
      libraryChoices = libs.listNamesWithDescription;
    } else if (plugins.isTypeWeb({type})) {
      moduleChoices = plugins.listWebNamesWithDescription;
      libraryChoices = libs.listWebNamesWithDescription;
    } else if (plugins.isTypeServer({type})) {
      moduleChoices = plugins.listServerNamesWithDescription;
      libraryChoices = libs.listServerNamesWithDescription;
    }

    // remove self
    const name = this.config.get('name');
    moduleChoices = moduleChoices.filter((d) => d.value !== name);

    return this.prompt([{
      type: 'list',
      name: 'modules',
      message: 'Additional Modules',
      choices: moduleChoices,
      default: this.config.get('modules')
    }, {
      type: 'list',
      name: 'libraries',
      message: 'Additional Libraries',
      choices: libraryChoices,
      default: this.config.get('libraries')
    }]).then((props) => {
      this.config.set('modules', props.modules);
      this.config.set('libraries', props.libraries);
    });
  }

  default() {
    this.composeWith(`phovea:update`, {}, {
      local: require.resolve(`../update`)
    });
  }
}

module.exports = Generator;
