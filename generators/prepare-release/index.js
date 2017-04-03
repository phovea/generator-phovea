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

    this.option('major');
    this.option('minor');

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
    if (version.endsWith('-SNAPSHOT')) {
      version = version.slice(0, version.length - 9);
    }
    if (this.options.major) {
      this.version = semver.inc(version, 'major');
    } else if (this.options.minor) {
      this.version = semver.inc(version, 'minor');
    } else {
      this.version = version;
    }
    this.nextDevVersion = semver.inc(this.version, 'patch') + '-SNAPSHOT';
  }

  _checkoutBranch(branch) {
    const line = `checkout ${branch}`;
    this.log(chalk.blue(`checkout ${branch}:`), `git ${line}`);
    return this._spawnOrAbort('git', line.split(' '));
  }

  _tag() {
    const line = `tag v${this.version}`;
    this.log(chalk.blue(`tag version:`), `git ${line}`);
    return this._spawnOrAbort('git', line.split(' '));
  }

  _prepareReleasePackage() {
    const pkg = this.fs.readJSON(`${this.cwd}/package.json`);
    pkg.version = this.version;
    Object.keys(pkg.dependencies || {}).forEach((dep) => {
      const depVersion = pkg.dependencies[dep];
      //TODO
      pkg.dependencies[dep] = depVersion;
    });
    this.fs.writeJSON(`${this.cwd}/package.json`, pkg);
    return new Promise((resolve) => this.fs.commit(resolve)).then(() => {
      const line = `commit -am "prepare release_${this.version}"`;
      this.log(chalk.blue(`git commit:`), `git ${line}`);
      return this._spawnOrAbort('git', ['commit','-am',`prepare release_${this.version}`]);
    });
  }

  _preareNextDevPackage() {
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

  _fetch() {
    const line = `fetch origin`;
    this.log(chalk.blue(`push:`), `git ${line}`);
    return this._spawnOrAbort('git', line.split(' '));
  }

  _pushBranch(branch, tags) {
    const line = `push origin${tags?' --tags':''} ${branch}`;
    this.log(chalk.blue(`push:`), `git ${line}`);
    return this._spawnOrAbort('git', line.split(' '));
  }

  _createPullRequest() {
    const opn = require('opn');
    const url = `https://github.com/${this.repository}/compare/release_${this.version}?expand=1`;
    return opn(url, {
      wait: false
    });
  }

  _waitForConfirmation() {
    return this.prompt({
      type: 'confirm',
      name: 'confirm',
      message: 'Merged the pull request?',
      default: false
    }).then((props) => {
      if (!props.confirm) {
        return this._waitForConfirmation();
      }
    });
  }

  _cleanUp() {
    return new Promise((resolve) => {
      fs.remove(this.cwd, resolve);
    });
  }

  _openReleasePage() {
    const opn = require('opn');
    const url = `https://github.com/${this.repository}/releases/tag/v${this.version}`;
    return opn(url, {
      wait: false
    });
  }

  writing() {
    return Promise.resolve(1)
      .then(this._mkdir.bind(this, null))
      .then(this._cloneRepo.bind(this, this.repository, 'develop'))
      .then(this._determineVersions.bind(this))
      .then(() => this._checkoutBranch(`-b release_${this.version}`))
      .then(this._prepareReleasePackage.bind(this))
      .then(() => this._pushBranch(`release_${this.version}`))
      .then(this._createPullRequest.bind(this))
      .then(this._waitForConfirmation.bind(this))
      .then(this._fetch.bind(this))
      .then(this._checkoutBranch.bind(this, '-t origin/master'))
      .then(this._tag.bind(this))
      .then(this._checkoutBranch.bind(this, 'develop'))
      .then(this._preareNextDevPackage.bind(this))
      .then(this._pushBranch.bind(this, 'develop', true))
      .then(this._openReleasePage.bind(this))
      .then(this._cleanUp.bind(this))
      .catch((msg) => {
        this.log(chalk.red(`Error: ${msg}`));
        return Promise.reject(msg);
      });
  }
}

module.exports = Generator;
