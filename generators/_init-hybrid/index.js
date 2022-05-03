'use strict';
const known = () => require('../../utils/known');
const BaseInitPluginGenerator = require('../../base/BaseInitPluginGenerator');
const RepoUtils = require('../../utils/RepoUtils');

class Generator extends BaseInitPluginGenerator {

  initializing() {
    this.config.defaults({
      modules: ['tdp_core']
    });
  }

  prompting() {
    return this.prompt([{
      type: 'checkbox',
      name: 'modules',
      message: 'Included Modules',
      choices: known().plugin.listNamesWithDescription,
      default: this.config.get('modules'),
      when: !this.options.useDefaults
    }, {
      type: 'checkbox',
      name: 'libraries',
      message: 'Included Libraries',
      choices: known().lib.listNamesWithDescription,
      default: this.config.get('libraries'),
      when: !this.options.useDefaults
    }]).then((props) => {
      if (!this.options.useDefaults) {
        this.config.set('modules', props.modules);
        this.config.set('libraries', props.libraries);
      }
      this.config.set('libraryAliases', RepoUtils.toLibraryAliasMap(this.config.get('modules'), this.config.get('libraries')));
      this.config.set('libraryExternals', RepoUtils.toLibraryExternals(this.config.get('modules'), this.config.get('libraries')));
    });
  }

  default() {
    const types = this.config.get('type').split('-');
    this.composeWith(['phovea:_node', 'phovea:init-' + types[1], 'phovea:init-' + types[0]], {options: this.options, isWorkspace: this.options.isWorkspace});
  }

  end() {
    // ensure later than the others
    return super.writing();
  }
}

module.exports = Generator;
