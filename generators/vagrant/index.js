'use strict';
const Base = require('yeoman-generator').Base;

class Generator extends Base {

  initializing() {
    this.props = {
      guestIp: '192.168.50.52',
      hostPort: 9000
    };
  }

  writing() {
    const config = this.props;
    const includeDot = {
      globOptions: {
        dot: true
      }
    };
    this.fs.copy(this.templatePath('plain/**/*'), this.destinationPath(), includeDot);
    this.fs.copyTpl(this.templatePath('processed/**/*'), this.destinationPath(), config, includeDot);
  }
}

module.exports = Generator;
