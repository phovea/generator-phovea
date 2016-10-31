'use strict';
const Base = require('yeoman-generator').Base;
const path = require('path');
const resolveAllNeighbors = require('../clone').resolveAllNeighbors;

class Generator extends Base {
  constructor(args, options) {
    super(args, options);

    this.option('ssh', {
      alias: 's',
      defaults: false,
      type: Boolean
    });
    this.option('ueber', {
      alias: 'u',
      defaults: false,
      type: Boolean
    });
  }

  initializing() {
    this.props = {
      cloneSSH: false,
      runUeber: false
    };
  }

  prompting() {
    return this.prompt([{
      type: 'confirm',
      name: 'cloneSSH',
      message: 'SSH clone',
      store: true,
      default: this.options.ssh,
      when: !this.options.ssh
    }, {
      type: 'confirm',
      name: 'runUeber',
      message: 'Run Ueber',
      default: this.options.ueber,
      when: !this.options.ueber
    }]).then((props) => {
      this.props.cloneSSH = props.cloneSSH || this.options.ssh;
      this.props.runUeber = props.runUeber || this.options.ueber;
    });
  }

  default() {
    if (this.props.runUeber) {
      this.composeWith('phovea:ueber', {}, {
        local: require.resolve('../ueber')
      });
    }
  }

  writing() {
    resolveAllNeighbors.call(this, this.props.cloneSSH);
  }
}

module.exports = Generator;
