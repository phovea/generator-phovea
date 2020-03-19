
'use strict';
const BaseRelease = require('../../utils/BaseRelease');
const chalk = require('chalk');
var rp = require('request-promise');


class Generator extends BaseRelease {
  constructor(args, options) {
    super(args, options)
    this.data = options.data
  }

  _checkoutBranch(branch, data) {
    const line = `checkout ${branch}`;
    this._logVerbose([chalk.cyan(`Checkout ${branch}:`), chalk.italic(`git ${line}`)]);
    return this._spawnOrAbort('git', line.split(' '), data.cwd, data);
  }

  _prepareNextDevPackage(data) {
    const pkg = this.fs.readJSON(`${data.cwd}/package.json`);
    pkg.version = data.nextDevVersion;

    Object.keys(data.dependencies.develop).forEach((dep) => {
      this.log(data.dependencies)
      pkg.dependencies[dep] = data.dependencies.develop[dep];
    });
    this.fs.writeJSON(`${data.cwd}/package.json`, pkg);

    if (data.requirements) {
      this.log(data.requirements)
      this.fs.write(this.destinationPath(data.cwd + '/requirements.txt'), this.data.requirements.develop.join('\n'));
    }
  }
  _merge(branch, data) {
    const line = `merge ${branch}`;
    this._logVerbose([chalk.cyan(`Merge ${branch}:`), chalk.italic(`git ${line}`)]);
    return this._spawnOrAbort('git', line.split(' '), data.cwd, data);
  }


  writing() {
    Promise.resolve(1)
      .then(() => this._checkoutBranch('-t origin/master', this.data))
    // .then(() => this._checkoutBranch('develop', this.data))
    // .then(() => this._merge('origin/master', this.data))
    // .then(() => this._prepareNextDevPackage(this.data))
    // .then(() => this._pushBranch('develop', this.data))
    //.then(()=>this._pushToDevelop())
  }
}

module.exports = Generator;
