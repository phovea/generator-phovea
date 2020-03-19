
'use strict';
const BaseRelease = require('../../utils/BaseRelease');
const chalk = require('chalk');
var rp = require('request-promise');
const {findBase} = require('../../utils/release');


class Generator extends BaseRelease {
  constructor(args, options) {
    super(args, options)
    this.argument('repo', {
      required: false
    });
  }


  _readChangelog() {
    return this.changelog = this.fs.read('CHANGELOG.md');
  }

  _readVersion() {
    const pkg = this.fs.readJSON('package.json')
    return this.version = pkg.version;
  }
  _createRelease() {
    const postOptions = {
      method: 'POST',
      uri: `https://${process.env.GIT_USER}:${process.env.AcCESS_TOKEN}@api.github.com/repos/${toBaseName(this.args[0])}/releases`,
      body: {
        tag_name: 'v' + this.version,
        name: 'v' + this.version,
        body: this.changelog,
      },
      headers: {
        'User-Agent': 'request'
      },
      json: true
    }
    return rp(postOptions)
  }

  _checkoutBranch(branch, data) {
    const line = `checkout ${branch}`;
    this._logVerbose([chalk.cyan(`Checkout ${branch}:`), chalk.italic(`git ${line}`)]);
    return this._spawnOrAbort('git', line.split(' '), data.cwd, data);
  }

  _merge(branch, data) {
    const line = `merge ${branch}`;
    this._logVerbose([chalk.cyan(`Merge ${branch}:`), chalk.italic(`git ${line}`)]);
    return this._spawnOrAbort('git', line.split(' '), data.cwd, data);
  }


  writing() {
    Promise.resolve(1)
      .then(() => this._readChangelog())
      .then(() => this._createRelease())

    //.then(()=>this._pushToDevelop())
  }
}

module.exports = Generator;
