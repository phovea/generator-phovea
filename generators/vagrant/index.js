'use strict';
var generators = require('yeoman-generator');

class VagrantGenerator extends generators.Base {

  initializing() {
    this.config.defaults({
      guestIp: '192.168.50.52',
      hostPort: 9000
    });
  }

  // prompting() {
  //  return this.prompt([]).then((props) => {
  //
  //  });
  // }

  writing() {
    const config = this.config.getAll();
    const includeDot = {
      globOptions: {
        dot: true
      }
    };
    this.fs.copy(this.templatePath('plain/**/*'), this.destinationPath(), includeDot);
    this.fs.copyTpl(this.templatePath('processed/**/*'), this.destinationPath(), config, includeDot);
  }
}

module.exports = VagrantGenerator;
