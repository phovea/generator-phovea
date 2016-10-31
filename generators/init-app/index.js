'use strict';
var BasePluginGenerator = require('../../utils').Base;

class PluginGenerator extends BasePluginGenerator {

  initializing() {
    super.initializing();
    this.config.defaults({
      app: '',
      entries: {
        app: './src/index.ts'
      },
      libraries: ['d3'],
      modules: ['phovea_core', 'phovea_bootstrap_fontawesome']
    });
  }

  prompting() {
    return this.prompt([{
      type: 'input',
      name: 'app',
      message: 'Application Title',
      default: this.config.get('name')
    }]).then((props) => {
      this.config.set('app', props.app);
    });
  }

  default() {
    super.default();
  }

  writing() {
    const config = this.config.getAll();
    this._patchPackageJSON(config, ['main']);
    this._writeTemplates(config);
  }
}

module.exports = PluginGenerator;
