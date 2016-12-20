'use strict';
const Base = require('yeoman-generator').Base;
const resolveAllNeighbors = require('../clone').resolveAllNeighbors;

class Generator extends Base {
  constructor(args, options) {
    super(args, options);

    this.option('ssh', {
      alias: 's',
      defaults: false,
      type: Boolean
    });
    this.option('workspace', {
      alias: 'u',
      defaults: false,
      type: Boolean
    });
  }

  initializing() {
    this.props = {
      cloneSSH: false,
      runWorkspace: false
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
      name: 'runWorkspace',
      message: 'Update Workspace',
      default: this.options.workspace,
      when: !this.options.workspace
    }]).then((props) => {
      this.props.cloneSSH = props.cloneSSH || this.options.ssh;
      this.props.runWorkspace = props.runWorkspace || this.options.workspace;
    });
  }

  default() {
    if (this.props.runWorkspace) {
      this.composeWith('phovea:workspace', {}, {
        local: require.resolve('../workspace')
      });
    }
  }

  writing() {
    resolveAllNeighbors.call(this, this.props.cloneSSH);
  }
}

module.exports = Generator;
