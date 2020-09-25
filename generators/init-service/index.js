'use strict';

const BaseInitServerGenerator = require("../../base/BaseInitServerGenerator");

class Generator extends BaseInitServerGenerator {
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
    }]).then(({serviceName}) => {
      this.config.set('serviceName', serviceName);
      this.config.set('cwd', serviceName);
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
