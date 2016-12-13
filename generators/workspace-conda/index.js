'use strict';
const Base = require('yeoman-generator').Base;
const generateScripts = require('../workspace-vagrant').generateScripts;

class Generator extends Base {

  initializing() {
    this.props = {
      env: 'phovea'
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

    const scripts = generateScripts.call(this, '.');
    this.fs.extendJSON(this.destinationPath('package.json'), scripts);
  }
}

module.exports = Generator;
