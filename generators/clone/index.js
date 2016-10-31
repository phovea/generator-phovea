'use strict';
const Base = require('yeoman-generator').Base;
const path = require('path');
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
    return `git@github.com:${repo.substring('https://github.com'.length)}`
  }
  return repo;
}

class Generator extends Base {
  constructor(args, options) {
    super(args, options);

    this.option('ssh', {
      alias: 's',
      defaults: false,
      type: Boolean
    });
    this.argument('name');
  }

  initializing() {
    this.repos = [];
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
    }]).then((props) => {
      this.repos = (props.plugins || this.args).map(toRepository);
      if (props.cloneSSH || this.options.ssh) {
        this.repos = this.repos.map(toSSH);
      }
    });
  }

  install() {
    this.repos.forEach((repo) => {
      this.log(`git clone ${repo}`);
      this.spawnCommandSync('git', ['clone', repo], {
        cwd: this.destinationPath()
      });
    });
  }


}

module.exports = Generator;
