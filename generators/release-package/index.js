'use strict';
const Base = require('yeoman-generator');
const chalk = require('chalk');
const fs = require('fs-extra');
const knownRepositories = require('../../knownRepositories');
const {toHTTPRepoUrl, toSSHRepoUrl, simplifyRepoUrl} = require('../../utils/repo');
const opn = require('opn');
var rp = require('request-promise');
const semver = require('semver')
const {parseRequirements} = require('../../utils/pip');
// const {parseRequirements} = require('../../utils/pip');

// const Git = require('nodegit');
// const knownRepositories = require('../../knownRepositories')
// const path = require('path');

function toBaseName(name) {
  if (name.includes('/')) {
    return name;
  }
  return `${Object.keys(knownRepositories).find((base) => knownRepositories[base].includes(name))}/${name}`;
}
function getOrganization(name) {
  if (name.includes('/')) {
    return Object.keys(knownRepositories).find((base) => knownRepositories[base].includes(name))
  }
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
    this.option('ssh', {
      alias: 's',
      defaults: false,
      type: Boolean
    });
    this.option('major', {
      defaults: false,
      type: Boolean
    });
    this.option('minor', {
      defaults: false,
      type: Boolean
    });
    this.option('patch', {
      defaults: false,
      type: Boolean
    });
    this.option('branch', {
      defaults: 'develop',
      type: String
    });
    this.argument('repo', {
      required: false
    });
  }

  initializing() {
    this.composeWith(['phovea:check-node-version', 'phovea:_check-own-version'])
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
    }, {
      type: 'confirm',
      name: 'createToken',
      message: 'Create github access token',
      store: true,
    }]).then((props) => {
      this.createToken = props.createToken;
      this.repository = toBaseName(props.repository || this.args[0]);
      this.cloneSSH = props.cloneSSH || this.options.ssh;
      this.cwd = toCWD(this.repository);
      this.repo = {cwd: `${this.cwd}/${toCWD(this.repository)}`, repo: this.repository, name: toCWD(this.repository)};
    });
  }


  /**
   * Creates a new directory in current directory
   * @param {string} dir name of the directory to be created
   */
  _mkdir(dir) {
    dir = dir || this.cwd;
    this.log('create directory: ' + dir);
    return new Promise((resolve) => fs.ensureDir(dir, resolve));
  }

  /**
 *
 * @param {string} repo name of the repo i.e `Caleydo/ordino_public`
 * @param {string} branch specific branch we want to clone
 * @param {string} extras extra git options we might want to  pass
 */
  _cloneRepo(repo, branch, extras) {
    const repoUrl = this.cloneSSH ? toSSHRepoUrl(repo) : toHTTPRepoUrl(repo);
    const line = `clone -b ${branch}${extras || ''} ${repoUrl}`;
    this.log(chalk.blue(`clone repository:`), `git ${line}`);
    return this._spawnOrAbort('git', line.split(' '));
  }

  /**
   * Executes cmd or returns error message if it failed
   * @param {string} cmd command we want to run i.e. `git`
   * @param {Array} argline arguments of command i.e. `['clone','-b']`
   * @param {string|undefined} cwd directory to execute command
   * @param {any} returnValue
   */
  _spawnOrAbort(cmd, argline, cwd, returnValue) {
    const r = this._spawn(cmd, argline, cwd);
    returnValue = returnValue || cmd;
    if (failed(r)) {
      this.log(r);
      return this._abort('failed: ' + cmd + ' - status code: ' + r.status);
    }
    return Promise.resolve(returnValue);
  }

  /**
   *executes a command line cmd
   * @param {string} cmd command to execute
   * @param {array} argline cmd arguments
   * @param {string} cwd optional directory
   */
  _spawn(cmd, argline, cwd) {
    const options = cwd === false ? {} : {cwd: cwd || this.cwd, stdio: ['inherit', 'pipe', 'pipe']};
    return this.spawnCommandSync(cmd, Array.isArray(argline) ? argline : argline.split(' '), options);
  }

  /**
   * reject promise with error message
   * @param {string} msg
   */
  _abort(msg) {
    return Promise.reject(msg ? msg : 'Step Failed: Aborting');
  }

  /**
   *
   * @param {string} branch to be checked out
   * @param {} ctx injected data
   */
  _checkoutBranch(branch, ctx) {
    const line = `checkout ${branch}`;
    this.log(chalk.blue(`checkout ${branch}:`), `git ${line}`);
    return this._spawnOrAbort('git', line.split(' '), ctx.cwd, ctx);
  }

  // _prepareReleasePackage(ctx) {
  //   const semver = require('semver');
  //   const pkg = this.fs.readJSON(`${ctx.cwd}/package.json`);
  //   pkg.version = ctx.version;
  //   ctx.dependencies = {};
  //   Object.keys(pkg.dependencies || {}).forEach((dep) => {
  //     // if (known
  //     // const depVersion = pkg.dependencies[dep];
  //     // let version = depVersion;
  //     // this.log(dep, version)
  //   })
  // }

  _openRelease(ctx) {
    console.log(this.username, this._getGitUser())
    // const base = simplifyRepoUrl(ctx.repo);
    // const url = `https://github.com/oltionchampari/dummy_repo/releases/edit/v6.0.0`;
    // return opn(url, {
    //   wait: false
    // }).then(() => ctx);
  }
  _collectReleaseNotes() {
    const options = {
      cwd: 'dummy_repo/dummy_repo',
      stdio: ['inherit', 'pipe', 'pipe'] // pipe `stdout` and `stderr` to host process
    };
    const logBody = this.spawnCommandSync('git', ['log', '--merges', '--pretty=format:"%b'], options).stdout.toString().split('\n')
    const pullRequestNumber = this.spawnCommandSync('git', ['log', '--merges', '--pretty=format:"%s'], options).stdout.toString().split('\n').map((n) => n.match(/#\S {1}/g)[0]);
    this.changelog = logBody.map((l, i) => '*' + l.replace('"', '') + ' ' + pullRequestNumber[i]).join('\n');
    this.log(`\n\n${chalk.yellow('CHANGELOG')}\n${this.changelog}\n`)
  }

  /**
   * Get labels of the pull requests in the current branch
   * @param {*} issueNumbers
   * @param {*} repository
   */
  async _getGitLabels(issueNumbers, repository) {

    const labels = await Promise.all(issueNumbers.map(n => {
      const options = {
        url: `https://${this.username}:${this.accessToken}@api.github.com/repos/${repository}/issues/${n}/labels`,
        headers: {
          'User-Agent': 'request'
        }
      };
      return rp(options).then((d) => JSON.parse(d).filter((f) => f.name.includes('release:')))
    }))
    const b = [].concat.apply([], labels.map((l) => l.map((s) => s.name.replace('release: ', ''))))
    return b
  }

  _openCreateTokenPage() {
    this.log('Generate a new access token (scope:repo)')
    const url = `https://github.com/settings/tokens/new`;
    return opn(url, {
      wait: false
    })
  }

  async _createAccessToken() {
    if (this.createToken) {
      await this._openCreateTokenPage()
    }
    return this.prompt({
      type: "input",
      name: "accessToken",
      message: "Enter github access token",
      required: true,
      store: true
    }).then(props => {
      this.accessToken = props.accessToken
    });
  }
  /**
   * Calculate if release is `major`,`minor`,`patch`
   */
  async _getReleaseVersion() {
    const hasMajorDependency = await this._majorReleasedDependency()
    if (hasMajorDependency) {
      this.release = 'major'
      this.log(chalk.yellow(`One or more dependencies has a major release, thus version to be released: `, chalk.green(this.release)))
    } else {
      const labels = await this._getGitLabels([82], 'datavisyn/festival')//TODO labels empty throw error
      this.release = labels.includes('major') ? 'major' : labels.includes('minor') ? 'minor' : 'patch'
      this.log(chalk.yellow(`From the labels of the pull requests, version computed: `, chalk.green(this.release)))
    }
    return this.release
  }

  async _majorReleasedDependency() {
    const dependencies = await this._getVersions()
    return dependencies.raw.some((dep) => semver.minor(dep.version) === 0 && semver.patch(dep.version) === 0)
  }

  _getGitUser() {
    const options = {
      cwd: 'dummy_repo/dummy_repo',
      stdio: ['inherit', 'pipe', 'pipe'] // pipe `stdout` and `stderr` to host process
    };
    this.log(chalk.blue('Running git config', 'user.name'))
    this.username = this.spawnCommandSync('git', ['config', 'user.name'], options).stdout.toString().replace('\n', '')
    return this.username
  }

  async _editPullRequest(ctx) {
    this.username = await this._getGitUser();
    const version = await this._getDependencyTag('datavisyn/festival')
    const url = `https://github.com/${this.repository}/pull/${this.prNumber}`;
    this.log(chalk.blue('Please assign reviewers and assignees for PR'))
    return this.prompt({
      type: 'confirm',
      name: 'jumpToGithub',
      message: 'Take me to github',
      store: true,
      default: true
    }).then((props) => {
      if (props.jumpToGithub) {
        return opn(url, {
          wait: false
        });
      }
    })
  }


  _createPullRequest(title, content, base, head) {
    this.log(chalk.blue('Creating new PR...'), this.username)
    const postOptions = {
      method: 'POST',
      uri: `https://${this.username}:${this.accessToken}@api.github.com/repos/${this.repository}/pulls`,
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
      this.prNumber = d.number
      return d.number
    })
      .then((prNumber) => {
        this.log(chalk.blue('Assigning labels...'))
        const patchOptions = {
          method: 'POST',
          uri: `https://${this.username}:${this.accessToken}@api.github.com/repos/${this.repository}/issues/${prNumber}`,
          body: {
            labels: ['release: ' + this.release]
          },
          headers: {
            'User-Agent': 'request'
          },
          json: true
        }
        return rp(patchOptions)
      })
    //assignee and reviewer will be automatically by the github feature `code owners`
    //TODO assign assignee to the PR
    //TODO assign reviewer to the PR
  }

  /**
   * determine release number
   * prepare next dev version
   * @param {*} ctx
   */
  _determineVersion(ctx) {
    const semver = require('semver');
    const pkg = this.fs.readJSON(`${ctx.cwd}/package.json`);
    let version = pkg.version;
    if (version.endsWith('-SNAPSHOT')) {
      version = version.slice(0, version.length - 9);
    }
    if (this.release === 'major') {
      ctx.version = semver.inc(version, 'major');
    } else if (this.release === 'minor') {
      ctx.version = semver.inc(version, 'minor');
    } else {
      ctx.version = semver.inc(version, 'patch');
    }
    ctx.private = pkg.private === true;
    ctx.nextDevVersion = semver.inc(ctx.version, 'patch') + '-SNAPSHOT';
    this.ctx = ctx
    return Promise.resolve(ctx);
  }
  _isKnownRepo(repo) {
    return Object.keys(knownRepositories).some((r) => knownRepositories[r].includes(repo) || knownRepositories[r].some((d) => repo.includes(d)))
  }

  _getDependencyTag(dep) {
    const options = {
      url: `https://${this.username}:${this.accessToken}@api.github.com/repos/${dep}/releases`,
      headers: {
        'User-Agent': 'request'
      }
    };
    //TODO package not yet released
    return rp(options).then((d) => JSON.parse(d)[0].name.replace('v', ''));
  }

  /////////////////////////////////////////////////////////////////////// REQUIREMENTS

  // async _patchRequirements() {

  // }

  _getRequirementVersions(req) {
    return Promise.all(req.map((r) => {
      return this._getDependencyTag(toBaseName(this._pipToNpm(r)))
        .then((v) => {
          return {key: r, version: v}
        })
    }))
  }

  _getMasterRequirements(req) {
    return req.map((r) => {return this._parsePip(r.key) + ':' + this._computeMasterVersion(r.key, r.version)})
  }

  _getDevelopRequirements(req) {
    return req.map((r) => {return this._parseGithub(r.key) + ':' + this._computeDevelopVersion(r.key, r.version)})
  }

  _getRequirements() {
    const reqs = parseRequirements(this.fs.read(`${this.ctx.cwd}/requirements.txt`))//parsed to object requirements
    const foreignRequirements = Object.keys(reqs).filter((req) => !this._isKnownRepo(req)).map((r) => {return [r] + ':' + reqs[r]})//requirements minus our repos
    const knownRequirements = Object.keys(reqs).filter((req) => this._isKnownRepo(req))//ourOwn requirements

    return {known: knownRequirements, foreign: foreignRequirements}
  }

  _mergeRequirements(reqA, reqB) {

  }
  ///get it from config json
  _isNotPublishedToPip(dependency) {
    return dependency.endsWith('tdp_core.git')
  }

  _computeMasterUnPublished(dependency, version) {

    return `@v${version}@egg=${this._pipToNpm(dependency)}`
  }

  //turn 4.0.0 to >=4.0.0,<5.0.0
  _computeMasterPublished(version) {
    const firstLetter = parseInt(version.charAt(0))
    return `>=${firstLetter}.0.0,<${firstLetter + 1}.0.0`
  }

  _computeMasterVersion(dependency, version) {
    return this._isNotPublishedToPip(dependency) ? this._computeMasterUnPublished(dependency, version) : this._computeMasterPublished(version)
  }

  _computeDevelopVersion(dependency, version) {
    return `@develop@egg=${this._parsePip(dependency)}`
  }

  //from `tdp_core` to `-e git+https://github.com/datavisyn/tdp_core.git`
  _parseGithub(req) {
    if (this._isNotPublishedToPip(req)) {
      return req
    }
    return `-e git+https://github.com/${toBaseName(req)}.git`
  }
  //from `-e git+https://github.com/datavisyn/tdp_core.git` to `tdp_core`
  _parsePip(req) {
    if (!this._isKnownRepo(req)) {
      return
    }
    if (this._isNotPublishedToPip(req)) {
      return req
    }
    return this._pipToNpm(req)
  }
  _pipToNpm(req) {
    let repoName;
    Object.keys(knownRepositories).forEach((r) => {
      return knownRepositories[r].forEach(element => {
        if (req.includes(element)) {
          repoName = element
        }
      })
    })
    return repoName
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////// Dependencies
  _isNotPublishedToNpm(dep) {
    return dep.includes('tdp_core') || dep.includes('tdp_ui')
  }

  _getRawVersions(dep) {
    return Promise.all(dep.map((r) => {
      return this._getDependencyTag(toBaseName(r))
        .then((v) => {
          return {key: r, version: v}
        })
    }))
  }

  async _getVersions() {
    const pkg = this.fs.readJSON(`${this.repo.cwd}/package.json`);
    const deps = Object.keys(pkg.dependencies).filter((dep) => this._isKnownRepo(dep));
    const dependencies = await this._getRawVersions(deps)
    this.dependencies = {raw: dependencies, master: this._toMaster(dependencies), develop: this._toDevelop(dependencies)}
    return this.dependencies
  }

  _toMaster(deps) {
    return deps.reduce((acc, dep) => (acc[dep.key] = this._isNotPublishedToNpm(dep.key) ? `github:${toBaseName(dep.key)}#semver:^${dep.version}` : `^${dep.version}`, acc), {})
  }

  _toDevelop(deps) {
    return deps.reduce((acc, dep) => (acc[dep.key] = `github:${toBaseName(dep.key)}#develop`, acc), {})
  }

  async _prepareReleasePackage() {
    const reqs = await this._getRequirementVersions(this._getRequirements().known)
    const master = [...this._getRequirements().foreign, ...this._getMasterRequirements(reqs)]
    const develop = [...this._getRequirements().foreign, ...this._getDevelopRequirements(reqs)]
    this.requirements = {master, develop}
    // fs.unlinkSync(this.destinationPath(this.ctx.cwd + '/requirements.txt'))//If you delete the requirements.tx and then replace it with new one .No need to resolve conflicts
    this.fs.write(this.destinationPath(this.ctx.cwd + '/requirements.txt'), master.join('\n'));

    const pkg = this.fs.readJSON(`${this.ctx.cwd}/package.json`);
    Object.keys(this.dependencies.master).forEach((dep) => {
      pkg.dependencies[dep] = this.dependencies.master[dep];
    })
    pkg.version = this.ctx.version
    // fs.unlinkSync(this.destinationPath(this.ctx.cwd + '/package.json'))//If you delete the package.json and then replace it with new one .No need to resolve conflicts
    this.fs.writeJSON(`${this.ctx.cwd}/package.json`, pkg);
    return Promise.resolve(1).then(() => new Promise((resolve) => this.fs.commit(resolve))).then(() => {
      const line = `commit -am "prepare release_${this.ctx.version}"`;
      this.log(chalk.blue(`git commit:`), `git ${line}`);
      return this._spawnOrAbort('git', ['commit', '-am', `prepare release_${this.ctx.version}`], this.ctx.cwd, this.ctx);
    });
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  _pushBranch(branch, ctx) {
    const line = `push origin ${branch}`;
    const options = {cwd: ctx.cwd, stdio: ['inherit', 'pipe', 'pipe']};
    this.log(chalk.blue(`push:`), `git ${line}`);
    return this.spawnCommandSync('git', line.split(' '), options);
  }

  writing() {
    return Promise.resolve(1)
      .then(() => this._createAccessToken())
      .then(this._mkdir.bind(this, null))
      .then(() => this._cloneRepo(this.repo.repo, this.options.branch, null))
      .then(() => this._getGitUser())
      .then(() => this._collectReleaseNotes())
      .then(() => this._getReleaseVersion())
      .then(() => this._determineVersion(this.repo))
      .then(() => this._checkoutBranch(`-b release_${this.ctx.version}`, this.ctx))
      .then((ctx) => this._createPullRequest('Release 4.0.0', "this is my new pull request", "oltionchampari-patch-1", 'master'))
      // .then(() => this._editPullRequest(this.ctx))
      .then(() => this._prepareReleasePackage())
      .then(() => this._pushBranch(`release_${this.ctx.version}`, this.ctx))
      // .then(() => this._openRelease(this.ctx))
      // .then((ctx) => this._prepareReleasePackage(ctx))
      .catch((msg) => {
        this.log(chalk.red(`Error: ${msg}`));
        return Promise.reject(msg);
      });
  }

}

module.exports = Generator;
