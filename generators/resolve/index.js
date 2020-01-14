'use strict';
const Base = require('yeoman-generator');
const resolveAllNeighbors = require('../clone').resolveAllNeighbors;

class Generator extends Base {
  constructor(args, options) {
    super(args, options);

    this.option('ssh', {
      alias: 's',
      type: Boolean
    });
    this.option('workspace', {
      alias: 'u',
      defaults: false,
      type: Boolean
    });
    this.option('type', {
      alias: 't'
    });
    this.option('shallow', {
      description: 'shallow clone copy',
      defaults: false,
      type: Boolean
    });
  }

  initializing() {
    this.composeWith('phovea:check-node-version');
    this.props = {
      cloneSSH: false,
      runWorkspace: false,
      type: 'both'
    };
  }

  prompting() {
    return this.prompt([{
      type: 'confirm',
      name: 'cloneSSH',
      message: 'SSH clone',
      store: true,
      default: this.options.ssh,
      when: this.options.ssh === undefined
    }, {
      type: 'list',
      name: 'type',
      message: 'Plugin types to resolve',
      choices: ['both', 'web', 'server'],
      default: this.options.type || 'both',
      when: this.options.type === undefined
    }, {
      type: 'confirm',
      name: 'runWorkspace',
      message: 'Update Workspace',
      default: this.options.workspace,
      when: this.options.workspace === undefined
    }]).then((props) => {
      this.props.cloneSSH = props.cloneSSH || this.options.ssh;
      this.props.type = props.type || this.options.type || 'both';
      this.props.runWorkspace = props.runWorkspace || this.options.workspace;
    });
  }

  default() {
    this.composeWith(this.props.runWorkspace ? 'phovea:workspace' : 'phovea:_check-own-version')//run `phovea:_check-own-version` only once
  }

  writing() {
    resolveAllNeighbors.call(this, this.props.cloneSSH, this.props.type, this.options.shallow);
  }
}

module.exports = Generator;
