'use strict';
const BasePluginGenerator = require('../../utils').BasePython;

class Generator extends BasePluginGenerator {
  initializing() {
    super.initializing();
    this.config.defaults({
      serviceName: 'sample'
    });
  }

  prompting() {
    if (this.options.useDefaults) {
      return;
    }
    return this.prompt([{
      type: 'input',
      name: 'serviceName',
      message: 'Service Name',
      default: this.config.get('serviceName')
    }]).then((props) => {
      this.config.set('serviceName', props.serviceName);
    });
  }

  default() {
    super.default();
  }

  writing() {
    super.writing();
  }
}

module.exports = Generator;
