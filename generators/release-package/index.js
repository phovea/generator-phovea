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
const logSymbols = require('log-symbols');
const {toBaseName, findBase, findName, toCWD, failed} = require('../../utils/release')
const RequirementsManager = require('../../utils/RequirementsManager');

//datavisyn_access_token         32d14aec0ec1fcaa956d168e7f3bec4a7d16e6dc
//caleydo_access_token           1e70171e3c013b148f120a9c61de342ee7260f88
//oltionchampari access token    36551f28e98f4c6ee64d1fec660af6bdcea10649
class Generator extends Base {

  constructor(args, options) {
    super(args, options);
    this.option('ssh', {
      alias: 's',
      defaults: false,
      type: Boolean
    });
    this.option('verbose', {
      defaults: false,
      type: Boolean
    })
    this.option('branch', {
      defaults: 'develop',
      type: String
    });
    this.argument('repo', {
      required: false
    });
  }

  initializing() {
    // this.composeWith(['phovea:check-node-version', 'phovea:_check-own-version'])
    this.log(chalk.cyan.bold('Welcome to the release party. Sit back and relax!'))
    //verify when `yo phovea:prepare-release repoName` that repoName is a known repo
    if (this.args[0]) {
      return this._validateRepository(this._args[0])
        .then(() => {this.log(logSymbols.success, 'Repository verified')})
        .catch((e) => {
          throw new Error(chalk.red('Repository name doesn\'t exist.'))
        })
    }
  }

  prompting() {
    this.log(chalk.bold(logSymbols.info, `The ${chalk.underline('caleydo-bot')} and ${chalk.underline('datavsiyn-bot')} access tokens can be found on keeweb.`))
    return this.prompt([{
      type: 'input',
      name: 'repository',
      message: 'Repository',
      default: this.args.length > 0 ? this.args[0] : undefined,
      when: this.args.length === 0,
      validate: (d) => this._isKnownRepo(findName(d))
    },
    {
      type: "password",
      name: "datavisynToken",
      message: `Enter the github ${chalk.underline('datavisyn-bot')} access token`,
      required: true,
      store: true,
      mask: true,
      validate: ((d) => d.length === 40)
    },
    {
      type: "password",
      name: "caleydoToken",
      message: `Enter the github ${chalk.underline('caleydo-bot')} access token`,
      required: true,
      store: true,
      mask: true,
      validate: ((d) => d.length === 40)
    }, {
      type: 'confirm',
      name: 'cloneSSH',
      message: 'SSH clone',
      store: true,
      default: this.options.ssh,
      when: !this.options.ssh
    }
    ])
      .then((props) => {
        this.repository = toBaseName(props.repository || this.args[0]);
        this.cloneSSH = props.cloneSSH || this.options.ssh;
        this.cwd = toCWD(this.repository);
        this.repo = {cwd: `${this.cwd}/${toCWD(this.repository)}`, repo: this.repository, name: toCWD(this.repository)};
        return this.accessToken = {datavisyn: props.datavisynToken, caleydo: props.caleydoToken}//github access_tokens in order to interact with the api
      })
      .then((accessToken) => {
        this.username = this._getGitUser()
        return this._validateTokens([accessToken.caleydo, accessToken.datavisyn], this.username)
      }).then(() => {this.log(logSymbols.success, 'Tokens verified')})
      .catch((e) => {
        throw new Error(chalk.red('The tokens are incorrect'))
      })
  }

  _logVerbose(logMessage, isVerbose = this.options.verbose) {
    if (isVerbose) {
      if (Array.isArray(logMessage)) {
        this.log(...logMessage)
      } else {
        this.log(logMessage)
      }
    }
  }
  /**
   * Validate repo name against existing phovea/caleydo/datavisyn repositories
   * Throw error if not a known repository
   * @param {string} repository  i.e `phovea_clue` or `phovea/phovea_clue`
   */
  _validateRepository(repository) {
    this._logVerbose(chalk.cyan(`Checking if repository: ${chalk.bold(repository)} exists...`));
    return new Promise((resolve, reject) => this._isKnownRepo(findName(repository)) ? resolve(true) : reject('Repository doesn\'t exist.Please provide a valid repository name.'))
  }
  /**
   * Verify access tokens against github api
   * @param {Array} tokens datavisyn/caleydo access tokens
   */
  _validateTokens(tokens, username) {
    this._logVerbose(chalk.cyan('Verifying tokens...'))
    return Promise.all(tokens.map((token) => {
      this._logVerbose([chalk.cyan('Running...'), chalk.italic(`GET https://${username}:${token}@api.github.com/user`)])
      const options = {
        url: `https://${username}:${token}@api.github.com/user`,
        headers: {
          'User-Agent': 'request'
        }
      };
      return rp(options).then((d) => JSON.parse(d))
    }))
  }

  /**
   * Decide which token to use based on repo name
   * @param {string} repo
   * @return caleydoToken or datavisynToken
   */
  _getAccessToken(repo) {
    return findBase(repo) === 'caleydo' ? this.accessToken.caleydo : this.accessToken.datavisyn
  }

  /**
   * Creates a new directory in current directory
   * @param {string} dir name of the directory to be created
   */
  _mkdir(dir) {
    dir = dir || this.cwd;
    this._logVerbose([chalk.cyan('Creating directory: '), chalk.italic(dir)]);
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
    this._logVerbose([chalk.cyan(`Cloning repository:`), chalk.italic(`git ${line}`)]);
    return this._spawnOrAbort('git', line.split(' '));
  }
  /**
   * Get username to send api calls to github
   * TODO refactor users to caleydo_bot datavisyn_bot
   */
  _getGitUser() {
    const options = {
      stdio: ['inherit', 'pipe', 'pipe'] // pipe `stdout` and `stderr` to host process
    };
    //  this._logVerbose(chalk.blue('Running git config', 'user.name'))
    this.username = this.spawnCommandSync('git', ['config', 'user.name'], options).stdout.toString().replace('\n', '')
    return this.username
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
    return Promise.reject(logSymbols.error, msg ? msg : 'Step Failed: Aborting');
  }

  /**
   * Collect release notes from PR title and number
   *
   * Format: `*Updated README.md #22`
   */
  _collectReleaseNotes() {
    const options = {
      cwd: 'dummy_repo/dummy_repo',
      stdio: ['inherit', 'pipe', 'pipe'] // pipe `stdout` and `stderr` to host process
    };
    const lineA = 'log --merges --pretty=format:"%b'
    const lineB = 'log --merges --pretty=format:"%s'
    this._logVerbose([chalk.cyan(`Running: `), chalk.italic(`git ${lineA}`)]);
    const logBody = this.spawnCommandSync('git', lineA.split(' '), options).stdout.toString().split('\n')
    this._logVerbose([chalk.cyan(`Running: `), chalk.italic(`git ${lineB}`)]);
    const pullRequestNumber = this.spawnCommandSync('git', lineB.split(' '), options).stdout.toString().split('\n').map((n) => n.match(/#\S {1}/g)[0]);
    this.changelog = logBody.map((l, i) => '*' + l.replace('"', '') + ' ' + pullRequestNumber[i]).join('\n');
    this.log(`\n${chalk.yellow.bold('Release Notes:')}\n${chalk.italic(this.changelog)}\n`)
  }

  /**
   * Calculate if release is `major`,`minor`,`patch`
   */
  async _getReleaseVersion() {
    const hasMajorDependency = await this._majorReleasedDependency()
    if (hasMajorDependency) {
      this.release = 'major'
      this.log(logSymbols.info, 'Next version:', chalk.cyan.bold(this.release), `(One or more dependencies latest tag is a major)`);
    } else {
      const labels = await this._getGitLabels([82], 'datavisyn/festival')//TODO labels empty throw error
      this.release = labels.includes('major') ? 'major' : labels.includes('minor') ? 'minor' : 'patch'
      this.log(logSymbols.info, 'Next version:', chalk.cyan.bold(this.release), `Computed from the labels set on PRs`);
    }
    return this.release
  }
  /**
   * Check if  phovea/caleydo/datavisyn dependencies latest release is `major`
   */
  async _majorReleasedDependency() {
    const dependencies = await this._getVersions()
    //check if minor and patch digits are zero ---> release is X.0.0
    return dependencies.original.some((dep) => semver.minor(dep.version) === 0 && semver.patch(dep.version) === 0)
  }


  async _getVersions() {
    const pkg = this.fs.readJSON(`${this.repo.cwd}/package.json`);
    const deps = Object.keys(pkg.dependencies).filter((dep) => this._isKnownRepo(dep));
    const dependencies = await this._getOriginalVersions(deps)
    this.dependencies = {original: dependencies, master: this._toMaster(dependencies), develop: this._toDevelop(dependencies)}
    return this.dependencies
  }

  /**
   * Get the versions of the dependencies from github api
   * @param {Array} dep
   */
  _getOriginalVersions(deps) {
    return Promise.all(deps.map((r) => {
      return this._getDependencyTag(toBaseName(r))
        .then((v) => {
          return {key: r, version: v}
        })
    }))
  }

  /**
   * Get labels of the pull requests in the current branch
   * @param {*} issueNumbers
   * @param {*} repository
   */
  async _getGitLabels(issueNumbers, repository) {

    const labels = await Promise.all(issueNumbers.map(n => {
      const options = {
        url: `https://${this.username}:${this._getAccessToken(repository)}@api.github.com/repos/${repository}/issues/${n}/labels`,
        headers: {
          'User-Agent': 'request'
        }
      };
      return rp(options).then((d) => JSON.parse(d).filter((f) => f.name.includes('release:')))
    }))
    const b = [].concat.apply([], labels.map((l) => l.map((s) => s.name.replace('release: ', ''))))
    return b
  }

  /**
   * Get latest clue of repository
   * @param {string} dep i.e phovea_clue
   */
  _getDependencyTag(dep) {
    const options = {
      url: `https://${this.username}:${this._getAccessToken(dep)}@api.github.com/repos/${dep}/releases`,
      headers: {
        'User-Agent': 'request'
      }
    };
    //TODO package not yet released
    // this._logVerbose([chalk.cyan('Running:'), chalk.italic(`GET https://${this.username}:****************************************@api.github.com/repos/${dep}/releases`)]);
    return rp(options).then((d) => JSON.parse(d)[0].name.replace('v', ''));
  }

  /**
   *
   * @param {string} branch to be checked out
   * @param {} ctx injected data
   */
  _checkoutBranch(branch, ctx) {
    const line = `checkout ${branch}`;
    this._logVerbose([chalk.cyan(`Checkout new branch:`), chalk.italic(`git ${line}`)]);
    return this._spawnOrAbort('git', line.split(' '), ctx.cwd, ctx);
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
    this.log(chalk.blue('Creating new PR...'))
    const postOptions = {
      method: 'POST',
      uri: `https://${this.username}:${this._getAccessToken(this.repository)}@api.github.com/repos/${this.repository}/pulls`,
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
          uri: `https://${this.username}:${this._getAccessToken(this.repository)}@api.github.com/repos/${this.repository}/issues/${prNumber}`,
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
    this.branch = `release_${this.ctx.version}`
    this.log(logSymbols.info, 'Next tag:', chalk.cyan.bold(this.ctx.version));
    return Promise.resolve(ctx);
  }

  /**
   * Check if repo is a phovea/caleydo/datavisyn repository
   * @param {string} repo
   */
  _isKnownRepo(repo) {
    return Object.keys(knownRepositories).some((r) => knownRepositories[r].includes(repo) || knownRepositories[r].some((d) => repo.includes(d)))
  }

  /////////////////////////////////////////////////////////////////////// REQUIREMENTS

  async _prepareReleasePackage() {
    const requirements = parseRequirements(fs.read(`${this.ctx.cwd}/requirements.txt`))//parsed to object requirements
    const reqManager = new RequirementsManager(requirements)
    await this.
    this.log(reqManager.getRequirements())
    // const reqs = await this._getRequirementVersions(this._getRequirements().known)
    // const master = [...this._getRequirements().foreign, ...this._getMasterRequirements(reqs)]
    // const develop = [...this._getRequirements().foreign, ...this._getDevelopRequirements(reqs)]
    // this.requirements = {master, develop}
    // // fs.unlinkSync(this.destinationPath(this.ctx.cwd + '/requirements.txt'))//If you delete the requirements.tx and then replace it with new one .No need to resolve conflicts
    // this.fs.write(this.destinationPath(this.ctx.cwd + '/requirements.txt'), master.join('\n'));

    // const pkg = this.fs.readJSON(`${this.ctx.cwd}/package.json`);
    // Object.keys(this.dependencies.master).forEach((dep) => {
    //   pkg.dependencies[dep] = this.dependencies.master[dep];
    // })
    // pkg.version = this.ctx.version
    // // fs.unlinkSync(this.destinationPath(this.ctx.cwd + '/package.json'))//If you delete the package.json and then replace it with new one .No need to resolve conflicts
    // this.fs.writeJSON(`${this.ctx.cwd}/package.json`, pkg);
    // return Promise.resolve(1).then(() => new Promise((resolve) => this.fs.commit(resolve))).then(() => {
    //   const line = `commit -am "prepare release_${this.ctx.version}"`;
    //   this._logVerbose([chalk.cyan(`Commit changes:`), chalk.italic(`git ${line}`)]);
    //   return this._spawnOrAbort('git', ['commit', '-am', `prepare release_${this.ctx.version}`], this.ctx.cwd, this.ctx);
    // });
  }

  _getRequirementVersions(req) {
    return Promise.all(req.map((r) => {
      return this._getDependencyTag(toBaseName(this._pipToNpm(r)))
        .then((v) => {
          return {req: r, ver: v}
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

  _toMaster(deps) {
    return deps.reduce((acc, dep) => (acc[dep.key] = this._isNotPublishedToNpm(dep.key) ? `github:${toBaseName(dep.key)}#semver:^${dep.version}` : `^${dep.version}`, acc), {})
  }

  _toDevelop(deps) {
    return deps.reduce((acc, dep) => (acc[dep.key] = `github:${toBaseName(dep.key)}#develop`, acc), {})
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  _pushBranch(branch, ctx) {
    const line = `push origin ${branch}`;
    const options = {cwd: ctx.cwd, stdio: ['inherit', 'pipe', 'pipe']};
    this._logVerbose([chalk.cyan(`Push branch:`), chalk.italic(`git ${line}`)]);
    return this.spawnCommandSync('git', line.split(' '), options);
  }

  writing() {
    return Promise.resolve(1)
      .then(this._mkdir.bind(this, null))
      .then(() => this._cloneRepo(this.repo.repo, this.options.branch, null))
      .then(() => this._collectReleaseNotes())
      .then(() => this._getReleaseVersion())
      .then(() => this._determineVersion(this.repo))
      .then(() => this._checkoutBranch(`-b release_${this.ctx.version}`, this.ctx))
      .then(() => this._prepareReleasePackage())
    //   .then(() => this._pushBranch(`release_${this.ctx.version}`, this.ctx))
    //   .then(() => this._createPullRequest(`Release ${this.ctx.version}`, 'this.prContent', 'master', this.branch))
    //   // .then(() => this._editPullRequest(this.ctx))
    //   // .then(() => this._openRelease(this.ctx))
    //   // .then((ctx) => this._prepareReleasePackage(ctx))
    //   .catch((msg) => {
    //     this.log(chalk.red(`Error: ${msg}`));
    //     return Promise.reject(msg);
    //   });
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

  // _openRelease(ctx) {
  // console.log(this.username, this._getGitUser())
  // const base = simplifyRepoUrl(ctx.repo);
  // const url = `https://github.com/oltionchampari/dummy_repo/releases/edit/v6.0.0`;
  // return opn(url, {
  //   wait: false
  // }).then(() => ctx);
  // }
}

module.exports = Generator;
