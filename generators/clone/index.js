'use strict';
const Base = require('yeoman-generator');
const path = require('path');
const glob = require('glob').sync;
const known = require('../../utils/known');
const {toHTTPRepoUrl, toSSHRepoUrl} = require('../../utils/repo');
function toRepository(plugin, useSSH) {
  const p = known.plugin.byName(plugin);
  return useSSH ? toSSHRepoUrl(p.repository) : toHTTPRepoUrl(p.repository);
}

function resolveNeighbors(plugins, useSSH, types, shallow) {
  let missing = [];
  const addMissing = (p) => {
    this.log(this.destinationPath(p + '/.yo-rc.json'));
    const config = this.fs.readJSON(this.destinationPath(p + '/.yo-rc.json'), {'generator-phovea': {}})['generator-phovea'];
    let modules = [].concat(config.modules || [], config.smodules || []);
    this.log(`${p} => ${modules.join(' ')}`);
    if (types && types !== 'both') {
      // filter to just certain sub types
      const filter = types === 'web' ? known.plugin.isTypeWeb : known.plugin.isTypeServer;
      modules = modules.filter((m) => known.plugin.isTypeHybrid(m) || filter(m));
    }
    missing.push(...modules.filter((m) => plugins.indexOf(m) < 0));
  };

  plugins.forEach(addMissing);

  while (missing.length > 0) {
    let next = missing.shift();
    let repo = toRepository(next, useSSH);
    let args = ['clone', repo];
    if (shallow) {
      args.splice(1, 0, '--depth', '1');
    }
    this.log(`git clone ${args.join(' ')}`);
    this.spawnCommandSync('git', args, {
      cwd: this.destinationPath()
    });
    plugins.push(next);
    addMissing(next);
  }
}

function resolveAllNeighbors(useSSH, types) {
  const files = glob('*/.yo-rc.json', {
    cwd: this.destinationPath()
  });
  const plugins = files.map(path.dirname);
  return resolveNeighbors.call(this, plugins, useSSH, types);
}

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
      this.composeWith('phovea:workspace', {}, {
        local: require.resolve('../workspace')
      });
    } else {
      this.composeWith('phovea:_version');
    }
  }

  writing() {
    const repos = this.props.plugins.map((d) => toRepository(d, this.props.cloneSSH));

    repos.forEach((repo) => {
      this.log(`git clone ${repo}`);
      this.spawnCommandSync('git', ['clone', repo], {
        cwd: this.destinationPath()
      });
    });
    if (this.props.resolve) {
      resolveNeighbors.call(this, this.props.plugins, this.props.cloneSSH);
    }
  }
}

module.exports = Generator;
module.exports.resolveNeighbors = resolveNeighbors;
module.exports.resolveAllNeighbors = resolveAllNeighbors;
