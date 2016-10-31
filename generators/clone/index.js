'use strict';
const Base = require('yeoman-generator').Base;
const path = require('path');
const glob = require('glob').sync;
const Separator = require('inquirer').Separator;

const registry = require('../../knownPhoveaPlugins.json');
const knownPlugins = [].concat(registry.plugins, registry.splugins);
const knownPluginNames = [].concat(
  registry.plugins.map((d) => d.name),
  new Separator(),
  registry.splugins.map((d) => d.name));

function toRepository(plugin) {
  const p = knownPlugins[knownPluginNames.indexOf(plugin)];
  return p.repository;
}

function toSSH(repo) {
  if (/https:\/\/github.com/.test(repo)) {
    return `git@github.com:${repo.substring('https://github.com'.length)}`;
  }
  return repo;
}

function resolveNeighbors(plugins, useSSH) {
  var missing = [];
  const addMissing = (p) => {
    const config = require(path.resolve(p, '.yo-rc.json'))['generator-phovea'];
    const modules = [].concat(config.modules || [], config.smodules || []);
    this.log(`${p} => ${modules.join(' ')}`);
    missing.push(...modules.filter((m) => plugins.indexOf(m) < 0));
  };

  plugins.forEach(addMissing);

  while (missing.length > 0) {
    let next = missing.shift();
    let repo = toRepository(next);
    if (useSSH) {
      repo = toSSH(repo);
    }
    this.log(`git clone ${repo}`);
    this.spawnCommandSync('git', ['clone', repo], {
      cwd: this.destinationPath()
    });
    plugins.push(next);
    addMissing(next);
  }
}

function resolveAllNeighbors(useSSH) {
  const files = glob('*/.yo-rc.json', {
    cwd: this.destinationPath()
  });
  const plugins = files.map(path.dirname);
  return resolveNeighbors.call(this, plugins, useSSH);
}

class Generator extends Base {
  constructor(args, options) {
    super(args, options);

    this.option('ssh', {
      alias: 's',
      defaults: false,
      type: Boolean
    });
    this.option('recursive', {
      alias: 'r',
      defaults: false,
      type: Boolean
    });
    this.option('ueber', {
      alias: 'u',
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
      recursive: false,
      cloneSSH: false,
      runUeber: false
    };
  }

  prompting() {
    return this.prompt([{
      type: 'checkbox',
      name: 'plugins',
      message: 'Modules to clone',
      choices: knownPluginNames,
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
      name: 'recursive',
      message: 'Recursive',
      default: this.options.recursive,
      when: !this.options.recursive
    }, {
      type: 'confirm',
      name: 'runUeber',
      message: 'Run Ueber',
      default: this.options.ueber,
      when: !this.options.ueber
    }]).then((props) => {
      this.props.plugins = props.plugins || this.args;
      this.props.cloneSSH = props.cloneSSH || this.options.ssh;
      this.props.recursive = props.recursive || this.options.recursive;
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
    var repos = this.props.plugins.map(toRepository);
    if (this.props.cloneSSH) {
      repos = repos.map(toSSH);
    }

    repos.forEach((repo) => {
      this.log(`git clone ${repo}`);
      this.spawnCommandSync('git', ['clone', repo], {
        cwd: this.destinationPath()
      });
    });
    if (this.props.recursive) {
      resolveNeighbors.call(this, this.props.plugins, this.props.cloneSSH);
    }
  }
}

module.exports = Generator;
module.exports.resolveNeighbors = resolveNeighbors;
module.exports.resolveAllNeighbors = resolveAllNeighbors;
