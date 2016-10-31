'use strict';
const Base = require('yeoman-generator').Base;
const patchPackageJSON = require('../../utils').patchPackageJSON;

class VagrantGenerator extends Base {

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

    patchPackageJSON.call(this, config, [], {
      dependencies: [],
      scripts: {

      }
    });
  }
}

module.exports = VagrantGenerator;
