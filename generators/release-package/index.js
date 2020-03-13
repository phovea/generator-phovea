'use strict';
const BaseRelease = require('../../utils/BaseRelease');
const Base = require('yeoman-generator');
const chalk = require('chalk');
const fs = require('fs-extra');
const knownRepositories = require('../../knownRepositories');
const {toHTTPRepoUrl, toSSHRepoUrl, simplifyRepoUrl} = require('../../utils/repo');
const opn = require('opn');
var rp = require('request-promise');
const semver = require('semver');
const {parseRequirements} = require('../../utils/pip');
const logSymbols = require('log-symbols');
const {toBaseName, findBase, findName, toCWD, failed} = require('../../utils/release');

class ReleaseData extends BaseRelease {
  /**
   *
   * @param {string []} args The repository to be released. Can be accessed later with `this.options.repo`.
   * @param {object} options Are provided when calling the generator, i.e., `yo phovea:prepare-release --ssh`.
   * Available options include:
   * `--ssh`: Use ssh to interact with github.
   * `--verbose`: Set the information logging to verbose.
   */
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
    this.log(chalk.cyan.bold('Welcome to the release generator'));

    // verify that provided repo is a known repo.
    if (this.args[0]) {
      return this._validateRepository(this.args[0])
        .then(() => {this.log(logSymbols.success, 'Repository verified')})
        .catch((e) => {
          throw new Error(chalk.red('Repository name doesn\'t exist.'));
        });
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
        const repository = toBaseName(props.repository || this.args[0]);
        this.cloneSSH = props.cloneSSH || this.options.ssh;
        this.cwd = toCWD(repository);
        return this.data = {
          isProduct: findName(repository).includes('_product'),
          repo: repository,
          cwd: `${this.cwd}/${toCWD(repository)}`,
          repoName: findName(repository),
          repoBase: findBase(repository),
          accessToken: {datavisyn: props.datavisynToken, caleydo: props.caleydoToken} // github access_tokens in to interact with the api
        };
      })
      .then((data) => {
        this.data.gitUser = this._getGitUser();
        this.data.accessToken.current = this._getAccessToken(this.data.repo)
        return this._validateTokens([data.accessToken.caleydo, data.accessToken.datavisyn], this.data.gitUser)
      }).then(() => {this.log(logSymbols.success, 'Tokens verified')})
      .catch((e) => {
        throw new Error(chalk.red(e))
      })
  }

  // _determineWhereToPublish() {
  //   return fs.existsSync(this.destinationPath(`${this.data.cwd}/.yo-rc.json`)) ? this.fs.readJSON(`${this.data.cwd}/.yo-rc.json`).publish : null;
  // }

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
    return findBase(repo) === 'oltionchampari' ? this.data.accessToken.caleydo : this.data.accessToken.datavisyn
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
    return this.spawnCommandSync('git', ['config', 'user.name'], options).stdout.toString().replace('\n', '')
  }

  /**
   * Collect release notes from PR title and number
   * Format: `* Updated README.md #22`
   */
  _collectReleaseNotes() {
    if (this.isProduct) {

    } else {
      const options = {
        cwd: 'dummy_repo/dummy_repo',
        stdio: ['inherit', 'pipe', 'pipe'] // pipe `stdout` and `stderr` to host process
      };

      const lineA = 'log --merges --pretty=format:"%b'
      const lineB = 'log --merges --pretty=format:"%s'
      this._logVerbose([chalk.cyan(`Running: `), chalk.italic(`git ${lineA}`)]);
      const logBody = this.spawnCommandSync('git', lineA.split(' '), options).stdout.toString().split('\n')

      this._logVerbose([chalk.cyan(`Running: `), chalk.italic(`git ${lineB}`)]);
      const pullRequestNumber = this.spawnCommandSync('git', lineB.split(' '), options).stdout.toString().split('\n')

      this.data.changelog = this._formatReleaseNotes(logBody, pullRequestNumber, this.data.repo)
      this.log(`\n${chalk.yellow.bold('Release Notes:')}\n${chalk.italic(this.data.changelog)}\n`)
    }
  }

  _formatReleaseNotes(body, pr, repo) {
    const title = body
      .filter((message) => message && message.length > 2)
      .map((message) => message.replace('"', ''))////git log creates extra newline characters and quotes
    const number = pr
      .map((n) => {
        const prNumber = n.match(/#(\d+)/g)///match `#number`
        return prNumber ? prNumber[0] : null
      })
      .filter((t) => t != null)
    return title.map((t, i) => `* ${t} (${repo}${number[i]})`).join('\n')
  }

  writing() {
    return Promise.resolve(1)
      .then(this._mkdir.bind(this, null))
      .then(() => this._cloneRepo(this.data.repo, this.options.branch, null))
      .then(() => this._determineWhereToPublish())
      .then(() => this._prepareDependencies())
      .then(() => this._prepareRequirements())
      .then(() => this._collectReleaseNotes())
      .then(() => this._getReleaseTag())
      .then(() => this._determineReleaseVersion())
      // .then(() => this.options.final ? this.composeWith('phovea:finalize-release', {
      //   data: this.data,
      //   verbose: this.options.verbose
      // }) : this.composeWith('phovea:release-hybrid', {
      //   data: this.data,
      //   verbose: this.options.verbose
      // }))
      .catch((msg) => {
        this.log(chalk.red(`Error: ${msg}`));
        return Promise.reject(msg);
      });
  }


  /**
   * Calculate if release is `major`,`minor`,`patch`
   */
  async _getReleaseTag() {
    const hasMajorDependency = this._majorReleasedDependency()
    let release;
    if (hasMajorDependency) {
      release = 'major'
      this.log(logSymbols.info, 'Next version:', chalk.cyan.bold(release), `(One or more dependencies latest tag is a major)`);
    } else {
      const labels = await this._getGitLabels([82], 'datavisyn/festival')//TODO labels empty throw error
      release = labels.includes('major') ? 'major' : labels.includes('minor') ? 'minor' : 'patch'
      this.log(logSymbols.info, 'Next version:', chalk.cyan.bold(release), `Computed from the labels set on PRs`);
    }

    return this.data.release = release;
  }
  /**
   * Check if  phovea/caleydo/datavisyn dependencies latest release is `major`
   */
  _majorReleasedDependency() {
    //check if minor and patch digits are zero ---> release is X.0.0
    return this.data.dependencies.original.some((dep) => semver.minor(dep.version) === 0 && semver.patch(dep.version) === 0)
  }


  async _prepareDependencies() {
    const pkg = this.fs.readJSON(`${this.data.cwd}/package.json`);
    const deps = Object.keys(pkg.dependencies).filter((dep) => this._isKnownRepo(dep));
    const dependencies = await this._getOriginalVersions(deps)
    this.log({original: dependencies, master: this._toMaster(dependencies), develop: this._toDevelop(dependencies)})
  }


  /**
   * Get the versions of the dependencies from github api
   * @param {Array} dep
   */
  _getOriginalVersions(deps) {
    return Promise.all(deps.map((r) => {
      return this._getDependencyTag(toBaseName(r))
        .then((v) => {
          return {name: r, version: v}
        })
    }))
  }

  /**
   * Get labels of the pull requests in the current branch
   * @param {*} issueNumbers
   * @param {*} repository
   */
  async _getGitLabels(issueNumbers, repository) {

    this.data.labels = await Promise.all(issueNumbers.map((n) => {
      const options = {
        url: `https://${this.data.gitUser}:${this._getAccessToken(repository)}@api.github.com/repos/${repository}/issues/${n}/labels`,
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
      url: `https://${this.data.gitUser}:${this._getAccessToken(dep)}@api.github.com/repos/${dep}/releases`,
      headers: {
        'User-Agent': 'request'
      }
    };
    //TODO package not yet released
    // this._logVerbose([chalk.cyan('Running:'), chalk.italic(`GET https://${this.data.gitUser}:****************************************@api.github.com/repos/${dep}/releases`)]);
    return rp(options).then((d) => JSON.parse(d)[0].name.replace('v', ''));
  }

  /**
   * determine release number
   * prepare next dev version
   * @param {*} ctx
   */
  _determineReleaseVersion() {
    const semver = require('semver');
    const pkg = this.fs.readJSON(`${this.data.cwd}/package.json`);
    let version = pkg.version;
    if (version.endsWith('-SNAPSHOT')) {
      version = version.slice(0, version.length - 9);
    }
    if (this.data.release === 'major') {
      this.data.version = semver.inc(version, 'major');
    } else if (this.data.release === 'minor') {
      this.data.version = semver.inc(version, 'minor');
    } else {
      this.data.version = semver.inc(version, 'patch');
    }
    this.data.private = pkg.private === true;
    this.data.nextDevVersion = semver.inc(this.data.version, 'patch') + '-SNAPSHOT';
    this.data.branch = `release_${this.data.version}`
    this.log(logSymbols.info, 'Next tag:', chalk.cyan.bold(this.data.version));
    return Promise.resolve(this.data);
  }

  async _prepareRequirements() {
    if (!fs.existsSync(`${this.data.cwd}/requirements.txt`)) {
      return;
    }
    const reqs = parseRequirements(this.fs.read(`${this.data.cwd}/requirements.txt`)); //parsed to object requirements
    const known = Object.keys(reqs).filter((req) => this._isKnownRepo(req)); // known requirements
    const others = Object.keys(reqs).filter((req) => !this._isKnownRepo(req)).map((r) => {return [r] + ':' + reqs[r]}); // requirements minus our repos
    const requirements = await this._getRequirementVersions(known);

    const master = [...others, ...this._getMasterRequirements(requirements)];
    const develop = [...others, ...this._getDevelopRequirements(requirements)];
    this.log({master, develop})
    this.data.requirements = {master, develop};
    // fs.unlinkSync(this.destinationPath(this.data.cwd + '/requirements.txt'))//If you delete the requirements.tx and then replace it with new one .No need to resolve conflicts
  }

  /**
   * Get latest release tag from github of a requirement.
   * @param {string} req Requirement entry in requirement.txt.
   */
  _getRequirementVersions(req) {
    return Promise.all(req.map((r) => {
      return this._getDependencyTag(toBaseName(this._pipToNpm(r)))
        .then((v) => {
          return {name: r, version: v}
        })
    }))
  }

/**
 * Prepare requirements to be committed to master branch.
 * @param {array} req Requirements
 */
  _getMasterRequirements(req) {
    return req.map((r) => {
      return r.name.startsWith('-e') && r.name.endsWith('.git') && this._isNotPublishedToPip(r.name) ?
        `${r.name}:@v${r.version}@egg=${this._pipToNpm(r.name)}` :
         `${this._pipToNpm(r.name)}>=${parseInt(r.version.charAt(0))}.0.0,<${parseInt(r.version.charAt(0)) + 1}.0.0`
    })
  }

 /**
  * Prepare develop versions of requirements to commit on new develop branch.
  * @param {array} req
  */
  _getDevelopRequirements(req) {
    return req.map((r) => r.name.startsWith('-e') && r.name.endsWith('.git') ?
      `${r.name}:@develop@egg=${this._pipToNpm(r.name)}` : `-e git+https://github.com/${toBaseName(r.name)}.git:@develop@egg=${r.name}`)
  }

  /**
   * Turn `-e git+https://github.com/datavisyn/tdp_core.git` --> `tdp_core`
   * @param {string} req Requirement
   */
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

  // TODO get it from yo-rc.json
  _isNotPublishedToPip(dependency) {
    return dependency.endsWith('tdp_core.git')
  }

  _computeMasterUnPublished(dependency, version) {
    return `@v${version}@egg=${this._pipToNpm(dependency)}`
  }

 /**
  *  Turn 4.0.0 to >=4.0.0,<5.0.0
  * @param {string} version
  */
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

  // from `tdp_core` to `-e git+https://github.com/datavisyn/tdp_core.git`
  _parseGithub(req) {
    if (this._isNotPublishedToPip(req)) {
      return req
    }
    return `-e git+https://github.com/${toBaseName(this._parsePip(req))}.git`
  }
  // from `-e git+https://github.com/datavisyn/tdp_core.git` to `tdp_core`
  _parsePip(req) {
    if (!this._isKnownRepo(req)) {
      return
    }
    if (this._isNotPublishedToPip(req)) {
      return req
    }
    return this._pipToNpm(req)
  }
}

module.exports = ReleaseData;
