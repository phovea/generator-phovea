'use strict';
const Base = require('../../utils').Base;
const known = () => require('../../utils/known');
const {toLibraryAliasMap, toLibraryExternals} = require('../_init-web');

class Generator extends Base {

  initializing() {
    this.config.defaults({
      modules: ['phovea_server', 'phovea_core']
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
      this.config.set('libraryAliases', toLibraryAliasMap.call(this, this.config.get('modules'), this.config.get('libraries')));
      this.config.set('libraryExternals', toLibraryExternals.call(this, this.config.get('modules'), this.config.get('libraries')));
    });
  }

  default() {
    this.composeWith('phovea:_node', {
      options: this.options
    }, {
      local: require.resolve('../_node')
    });
    const types = this.config.get('type').split('-');
    this.composeWith('phovea:init-' + types[1], {
      options: this.options
    }, {
      local: require.resolve('../init-' + types[1])
    });
    this.composeWith('phovea:init-' + types[0], {
      options: this.options
    }, {
      local: require.resolve('../init-' + types[0])
    });
  }

  end() {
    // ensure later than the others
    return super.writing();
  }
}

module.exports = Generator;
