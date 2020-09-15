'use strict';
const Base = require('yeoman-generator');
const known = require('../../utils/known');
const RepoUtils = require('../../utils/RepoUtils');
const WorkspaceUtils = require('../../utils/WorkspaceUtils');


class Generator extends Base {
  constructor(args, options) {
    super(args, options);

    this.option('ssh', {
      alias: 's',
      defaults: false,
      type: Boolean
    });
    this.option('resolve', {
      alias: 'r',
      defaults: false,
      type: Boolean
    });
    this.option('workspace', {
      alias: 'w',
      defaults: false,
      type: Boolean
    });
    this.argument('name', {
      required: false
    });
  }

  initializing() {
    this.composeWith('phovea:check-node-version', {}, {
      local: require.resolve('../check-node-version')
    });
    this.props = {
      plugins: [],
      resolve: false,
      cloneSSH: false,
      runWorkspace: false
    };
  }

  prompting() {
    return this.prompt([{
      type: 'checkbox',
      name: 'plugins',
      message: 'Modules to clone',
      choices: known.plugin.listNamesWithDescription,
      default: this.args,
      when: !this.args.length
    }, {
      type: 'confirm',
      name: 'cloneSSH',
      message: 'SSH clone',
      store: true,
      default: this.options.ssh,
      when: !this.options.ssh
    }, {
      type: 'confirm',
      name: 'resolve',
      message: 'Resolve',
      default: this.options.resolve,
      when: !this.options.resolve
    }, {
      type: 'confirm',
      name: 'runWorkspace',
      message: 'Update Workspace',
      default: this.options.workspace,
      when: !this.options.workspace
    }]).then((props) => {
      this.props.plugins = props.plugins || this.args;
      this.props.cloneSSH = props.cloneSSH || this.options.ssh;
      this.props.resolve = props.resolve || this.options.resolve;
      this.props.runWorkspace = props.runWorkspace || this.options.workspace;
    });
  }

  default() {
    if (this.props.runWorkspace) {
      this.composeWith('phovea:workspace');
    } else {
      this.composeWith('phovea:_check-own-version');
    }
  }

  writing() {
    const repos = this.props.plugins.map((d) => RepoUtils.toRepository(d, this.props.cloneSSH));

    repos.forEach((repo) => {
      this.log(`git clone ${repo}`);
      this.spawnCommandSync('git', ['clone', repo], {
        cwd: this.destinationPath()
      });
    });
    if (this.props.resolve) {
      WorkspaceUtils.resolveNeighbors(this.props.plugins, this.props.cloneSSH, null, null, this.destinationPath());
    }
  }
}

module.exports = Generator;