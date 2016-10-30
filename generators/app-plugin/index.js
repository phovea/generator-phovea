'use strict';
var BasePluginGenerator = require('../../utils');

class PluginGenerator extends BasePluginGenerator {

  constructor(args, options) {
    super('application', args, options);
  }

  initializing() {
    super.initializing();
    this.config.defaults({
      app: '',
      libraries: {
        d3: 'd3/d3'
      },
      modules: ['phovea_core', 'phovea_bootstrap_fontawesome']
    });
  }

  prompting() {
    return super.prompting().then(() => this.prompt([{
      type    : 'input',
      name    : 'app',
      message : 'Your application title',
      default : this.config.get('name')
    }])).then((props) => {
      this.config.set('app', props.app);
    });
  }

  writing() {
    const config = this.config.getAll();
    this._patchPackageJSON(config, ['main']);
    this._writeTemplates();
  }
}

module.exports = PluginGenerator;
