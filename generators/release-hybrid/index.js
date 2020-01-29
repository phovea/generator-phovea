
'use strict';
const BaseRelease = require('../../utils/BaseRelease');
const chalk = require('chalk');
var rp = require('request-promise');


class Generator extends BaseRelease {

  constructor(args, options) {
    super(args, options)
    this.data = options.data
  }


  /**
   *
   * @param {string} branch to be checked out
   * @param {} ctx injected data
   */
  _checkoutBranch(branch, data) {
    const line = `checkout ${branch}`;
    this._logVerbose([chalk.cyan(`Checkout new branch:`), chalk.italic(`git ${line}`)]);
    return this._spawnOrAbort('git', line.split(' '), data.cwd, null);
  }
  /**
   *Resolve dependencies & requirements to master version
   */
  _writeDependencies() {
    const cwd = this.data.cwd
    const version = this.data.version
    const pkg = this.fs.readJSON(`${cwd}/package.json`);
    const deps = this.data.dependencies.master;
    Object.keys(deps).forEach((dep) => {
      pkg.dependencies[dep] = deps[dep];
    })
    pkg.version = version
    // fs.unlinkSync(this.destinationPath(this.ctx.cwd + '/package.json'))//If you delete the package.json and then replace it with new one .No need to resolve conflicts
    this.fs.writeJSON(`${cwd}/package.json`, pkg);
    this.fs.write(this.destinationPath(cwd + '/requirements.txt'), this.data.requirements.master.join('\n'));
    return Promise.resolve(1).then(() => new Promise((resolve) => this.fs.commit(resolve))).then(() => {
      const line = `commit -am "prepare release_${version}"`;
      this._logVerbose([chalk.cyan(`Commit changes:`), chalk.italic(`git ${line}`)]);
      return this._spawnOrAbort('git', ['commit', '-am', `prepare release_${version}`], cwd, null);
    });
  }

  _pushBranch(branch, ctx) {
    const line = `push origin ${branch}`;
    const options = {cwd: ctx.cwd, stdio: ['inherit', 'pipe', 'pipe']};
    this._logVerbose([chalk.cyan(`Push branch:`), chalk.italic(`git ${line}`)]);
    return this.spawnCommandSync('git', line.split(' '), options);
  }

  _createPullRequest(title, content, base, head) {
    this._logVerbose([chalk.cyan(`Create Pull Request:`), chalk.italic(`POST https://${this.data.gitUser}:**********************@api.github.com/repos/${this.data.repo}/pulls`)])
    const postOptions = {
      method: 'POST',
      uri: `https://${this.data.gitUser}:${this.data.accessToken.current}@api.github.com/repos/${this.data.repo}/pulls`,
      body: {
        title: title,
        head: head,
        body: content,
        base: base
      },
      headers: {
        'User-Agent': 'request'
      },
      json: true
    }
    return rp(postOptions).then((d) => {
      return d.number
    })
      .then((prNumber) => {
        this._logVerbose([chalk.cyan(`Adding labels:`), chalk.italic(`POST https://${this.data.gitUser}:**************************@api.github.com/repos/${this.data.repoName}/issues/${prNumber}`)])
        const patchOptions = {
          method: 'POST',
          uri: `https://${this.data.gitUser}:${this.data.accessToken.current}@api.github.com/repos/${this.data.repo}/issues/${prNumber}`,
          body: {
            labels: ['release: ' + this.data.release]
          },
          headers: {
            'User-Agent': 'request'
          },
          json: true
        }
        return rp(patchOptions)
      })
    //assignee and reviewer will be automatically by the github feature `code owners`
  }

  writing() {
    return Promise.resolve(1)
      .then(() => this._checkoutBranch(`-b release_${this.data.version}`, this.data))
      .then(() => this._writeDependencies())
      .then(() => this._pushBranch(`release_${this.data.version}`, this.data))
      .then(() => this._createPullRequest(`Release ${this.data.version}`, 'this.prContent', 'master', this.data.branch))
      .catch((msg) => {
        this.log(chalk.red(`Error: ${msg}`));
        return Promise.reject(msg);
      });
  }
}
module.exports = Generator;
