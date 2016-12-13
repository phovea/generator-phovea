'use strict';
const Base = require('yeoman-generator').Base;
const path = require('path');
const generateScripts = require('../workspace-vagrant').generateScripts;
const chalk = require('chalk');

class Generator extends Base {

  initializing() {
    this.props = {
      containerName: path.dirname(this.destinationPath())
    };
  }

  prompting() {
    return this.prompt({
      name: 'containerName',
      message: 'Container Name',
      default: this.config.get('containerName')
    }).then((args) => {
      this.config.set('containerName', args.containerName);
    });
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

    this.log('build using:', chalk.red('docker build -t phovea_workspace .'));
    this.log('run cli:', chalk.red('docker run -t -i -name phovea_instance phovea_workspace /bin/bash'));
    this.log('run server:', chalk.red('docker run -t -i -name phovea_instance phovea_workspace python phovea_server'));
  }
}

module.exports = Generator;
