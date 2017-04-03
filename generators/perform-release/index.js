'use strict';
const Base = require('yeoman-generator').Base;
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

function toBaseName(name) {
  if (name.includes('/')) {
    return name;
  }
  return `Caleydo/${name}`;
}

function toCWD(basename) {
  let match = basename.match(/.*\/(.*)/)[1];
  if (match.endsWith('_product')) {
    match = match.slice(0, -8);
  }
  return match;
}

function failed(spawnResult) {
  return spawnResult.status !== 0;
}

class Generator extends Base {

  constructor(args, options) {
    super(args, options);

    this.argument('repo', {
      required: false
    });
  }

  prompting() {
    return this.prompt([{
      type: 'input',
      name: 'repository',
      message: 'Repository',
      default: this.args.length > 0 ? this.args[0] : undefined,
      when: this.args.length === 0,
      validate: (d) => d.length > 0
    }, {
      type: 'confirm',
      name: 'cloneSSH',
      message: 'SSH clone',
      store: true,
      default: this.options.ssh,
      when: !this.options.ssh
    }]).then((props) => {
      this.repository = toBaseName(props.repository || this.args[0]);
      this.cloneSSH = props.cloneSSH || this.options.ssh;
      this.cwd = toCWD(this.repository);
    });
  }

  _abort(msg) {
    return Promise.reject(msg ? msg : 'Step Failed: Aborting');
  }

  _spawn(cmd, argline, cwd) {
    const options = cwd === false ? {} : {cwd: this.cwd};
    return this.spawnCommandSync(cmd, Array.isArray(argline) ? argline : argline.split(' '), options);
  }

  _spawnOrAbort(cmd, argline, cwd) {
    const r = this._spawn(cmd, argline, cwd);
    if (failed(r)) {
      this.log(r);
      return this._abort('failed: ' + cmd + ' - status code: ' + r.status);
    }
    return Promise.resolve(cmd);
  }

  _cloneRepo(repo, branch, extras) {
    const repoUrl = this.cloneSSH ? `git@github.com:${repo}.git` : `https://github.com/${repo}.git`;
    const line = `clone -b ${branch}${extras || ''} ${repoUrl}`;
    this.log(chalk.blue(`clone repository:`), `git ${line}`);
    return this._spawnOrAbort('git', line.split(' '), false);
  }

  _mkdir(dir) {
    dir = dir || this.cwd;
    this.log('create directory: ' + dir);
    return new Promise((resolve) => fs.ensureDir(dir, resolve));
  }

  _determineVersions() {
    const semver = require('semver');
    const pkg = this.fs.readJSON(`${this.cwd}/package.json`);
    let version = pkg.version;
    this.nextDevVersion = semver.inc(version, 'patch') + '-SNAPSHOT';
  }

  _checkoutDevelopBranch() {
    const branch = 'develop';
    const line = `checkout -b ${branch}`;
    this.log(chalk.blue(`checkout ${branch}:`), `git ${line}`);
    return this._spawnOrAbort('git', line.split(' '));
  }

  _tag() {
    const line = `tag v${this.version}`;
    this.log(chalk.blue(`tag version:`), `git ${line}`);
    return this._spawnOrAbort('git', line.split(' '));
  }

  _updatePackage() {
    const pkg = this.fs.readJSON(`${this.cwd}/package.json`);
    pkg.version = this.nextDevVersion;
    Object.keys(pkg.dependencies || {}).forEach((dep) => {
      const depVersion = pkg.dependencies[dep];
      //TODO
      pkg.dependencies[dep] = depVersion;
    });
    this.fs.writeJSON(`${this.cwd}/package.json`, pkg);
    return new Promise((resolve) => this.fs.commit(resolve)).then(() => {
      const line = `commit -am "prepare next development version ${this.nextDevVersion}"`;
      this.log(chalk.blue(`git commit:`), `git ${line}`);
      return this._spawnOrAbort('git', ['commit','-am',`prepare next development version ${this.nextDevVersion}`]);
    });
  }

  _pushBranch() {
    const line = `push origin --tags develop`;
    this.log(chalk.blue(`push:`), `git ${line}`);
    return this._spawnOrAbort('git', line.split(' '));
  }

  _cleanUp() {
    return new Promise((resolve) => {
      fs.remove(this.cwd, resolve);
    });
  }

  writing() {
    return Promise.resolve(1)
      .then(this._mkdir.bind(this, null))
      .then(this._cloneRepo.bind(this, this.repository, 'master'))
      .then(this._determineVersions.bind(this))
      .then(this._tag.bind(this))
      .then(this._checkoutDevelopBranch.bind(this))
      .then(this._updatePackage.bind(this))
      .then(this._pushBranch.bind(this))
      .then(this._cleanUp.bind(this))
      .catch((msg) => {
        this.log(chalk.red(`Error: ${msg}`));
        return Promise.reject(msg);
      });
  }

  end() {
    this.log('\n\nnext steps: ');
    this.log(chalk.green(' wait for travis to confirm pull request and merge it'));
    this.log(chalk.yellow(` yo phovea:perform-release ${this.repository}`));
  }
}

module.exports = Generator;
