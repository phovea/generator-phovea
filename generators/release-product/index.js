'use strict';
const BaseRelease = require('../../utils/BaseRelease');
const Base = require('yeoman-generator');
const _ = require('lodash');
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
class ReleaseProduct extends BaseRelease {

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
      return this._validateRepository(this.args[0])
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
        const repository = toBaseName(props.repository || this.args[0]);
        this.cloneSSH = props.cloneSSH || this.options.ssh;
        this.cwd = toCWD(repository);
        return this.data = {
          isProduct: findName(repository).includes('_product'),
          repo: repository,
          cwd: `${this.cwd}/${toCWD(repository)}`,
          repoName: findName(repository),
          repoBase: findBase(repository),
          accessToken: {datavisyn: props.datavisynToken, caleydo: props.caleydoToken}//github access_tokens in order to interact with the api
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

  _getPullRequestCount() {
    const line = 'rev-list --min-parents=2 develop --count'
    const count = this._spawn('git', line, this.data.cwd).stdout
    return count ? count.toString() : 0
  }

  _getPullRequestNumbers() {
    if (!this._getPullRequestCount()) {
      this.log(logSymbols.warning, chalk.yellow('There is no merged pull requests merged in develop branch'))
      return;
    }
    const line = 'log --merges --pretty=format:"%s'
    this._logVerbose([chalk.cyan(`Running: `), chalk.italic(`git ${line}`)]);
    const pullRequestNumbers = this._spawn('git', line, this.data.cwd).stdout.toString().split('\n')
    return this.prNumbers = pullRequestNumbers.map((n) => {
      const prNumber = n.match(/#(\d+)/g)///match `#number`
      return prNumber ? prNumber[0].replace('#', '') : null
    })
      .filter((t) => t != null)
  }

  /**
   * from all the tags get only the ones that are greater than the current ones
   * @param {array} lModules
   * @param {array} sModules
   */
  _filterLatestTags(lModules, sModules) {
    return sModules.map((mod) => {
      return {
        name: mod.name, tags: mod.tags.filter((tag, i) => {
          return tag.name, semver.clean(tag.tag_name) && semver.gt(tag.tag_name, semver.minVersion(lModules.find((l) => l.name === mod.name).version))
        })
      }
    })
  }

  async _isInitialRelease(repo) {
    const tags = await this._getDependencyTag(repo)
    return tags.length === 0
  }
  /**
   * Get release notes of dependencies and copy them
   */
  async _collectReleaseNotes() {
    if (this.isInitialRelease) {
      return this.changelog = '### Initial Release'
    }
    const modulesAndTags = this._filterLatestTags(this.data.modules.local, this.data.modules.master)
    return this.changelog = modulesAndTags.map((mod) => {
      const tagsBody = mod.tags.map((t) => {
        this.log('yoooo', t.body)
        return `\n* [${t.tag_name}](https://github.com/${toBaseName(mod.name)}/releases/tag/${t.tag_name})\n${t.body.split('\n').map((b) => {
          const prNumber = b.match(/#(\d+)/g)
          const prPath = toBaseName(mod.name) + prNumber
          const rep = b.includes(prPath) ? '' : prPath
          return '   ' + b.replace(prNumber, rep)
        }).join('\n')
          }`
      }).join()
      return `\n### ${mod.name}\n ${tagsBody}`
    }).join()
  }

  /**
   * Calculate if release is `major`,`minor`,`patch`
   */
  async _getReleaseTag() {
    const hasMajorDependency = this._majorReleasedDependency([...this.data.modules.master])
    const changeInDependencyCount = this.isInitialRelease || this.data.modules.local.length !== this.data.modules.raw.length
    const labels = await this._getGitLabels(this.prNumbers, this.data.repo)//TODO labels empty throw error
    let release;
    if (hasMajorDependency || changeInDependencyCount) {
      release = 'major'
      this.log(logSymbols.info, 'Next version:', chalk.cyan.bold(release), hasMajorDependency ? `(One or more dependencies latest tag is a major)` : `One or more plugins were added or removed from phovea_product.json`);
    } else {
      release = labels.includes('major') ? 'major' : labels.includes('minor') ? 'minor' : 'patch'
      this.log(logSymbols.info, 'Next version:', chalk.cyan.bold(release), `Computed from the labels set on PRs`);
    }
    return this.data.release = release;
  }
  /**
   * Check if  phovea/caleydo/datavisyn dependencies latest release is `major`
   */
  _majorReleasedDependency(dependencies) {
    //check if minor and patch digits are zero ---> release is X.0.0
    return dependencies.some((dep) => semver.minor(dep.version) === 0 && semver.patch(dep.version) === 0)
  }


  _isNotPublishedToNpm(dep) {
    return dep.includes('tdp_core') || dep.includes('tdp_ui')
  }

  _toMaster(deps) {
    return deps.reduce((acc, dep) => (acc[dep.name] = this._isNotPublishedToNpm(dep.name) ? `github: ${toBaseName(dep.name)
      } #semver:^ ${dep.version} ` : ` ^ ${dep.version} `, acc), {})
  }
  _toDevelop(deps) {
    return deps.reduce((acc, dep) => (acc[dep.name] = `github: ${toBaseName(dep.name)} #develop`, acc), {})
  }
  /**
   * Get the versions of the dependencies from github api
   * @param {Array} dep
   */
  _getOriginalVersions(deps) {
    return Promise.all(deps.map((r) => {
      return this._getDependencyTag(toBaseName(r))
        .then((v) => {
          return {name: r, version: v[0].name.replace('v', ''), tags: v}
        })
    }))
  }

  /**
   * Get labels of the pull requests in the current branch
   * @param {*} issueNumbers
   * @param {*} repository
   */
  async _getGitLabels(issueNumbers, repository) {
    let labels = await Promise.all(issueNumbers.map((n) => {
      const options = {
        url: `https://${this.data.gitUser}:${this._getAccessToken(repository)}@api.github.com/repos/${repository}/issues/${n}/labels`,
        headers: {
          'User-Agent': 'request'
        }
      };
      return rp(options).then((d) => JSON.parse(d))
    }));

    if (labels) {
      return [].concat.apply([], labels).filter((label) => label.name.includes('release:')).map((s) => s.name.replace('release:', '').trim())

    }
    this._logVerbose(logSymbols.warning, chalk.yellow(`Amount of pull requests merged is 0`));
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
    return rp(options).then((d) => {
      return JSON.parse(d)
    })
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
    if (this.isInitialRelease) {
      this.data.version = version
    }
    else if (this.data.release === 'major') {
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


  /**
   * Check if repo is a phovea/caleydo/datavisyn repository
   * @param {string} repo
   */
  _isKnownRepo(repo) {
    return Object.keys(knownRepositories).some((r) => knownRepositories[r].includes(findName(repo)))
  }

  async _prepareProductDependencies() {
    const modules = this._readModules()
    if (modules && modules.length) {
      const latestTags = await this._getOriginalVersions(modules.map((m) => m.name))//get from github the latest release
      return this.data.modules = {raw: modules, develop: this._toDevelop(latestTags), master: latestTags}
    }
    throw new Error(`No dependencies found`)
  }


  async _readMasterVersions() {
    this.isInitialRelease = await this._isInitialRelease(this.data.repo)
    if (this.isInitialRelease) {
      return
    }
    await this._checkoutBranch('master', this.data)
    const modules = this._readModules()
    await this._checkoutBranch('develop', this.data)
    if (modules && modules.length) {
      return this.data.modules.local = modules
    }
    throw new Error(`No dependencies found`)
  }

  _readModules() {
    if (fs.existsSync(`${this.data.cwd}/phovea_product.json`) && fs.existsSync(`${this.data.cwd}/package.json`)) {
      const plugins = this.fs.readJSON(`${this.data.cwd}/phovea_product.json`)
      const pkg = this.fs.readJSON(`${this.data.cwd}/package.json`);

      let modules = Object.keys(pkg.dependencies).map((dep) => {return {name: dep, version: pkg.dependencies[dep]}});

      plugins.forEach((plugin) => {
        if (plugin.repo !== this.data.repo) {
          modules.push({name: plugin.repo, version: plugin.branch})
        }
        modules = [...modules, ...plugin.additional.map((dep) => {return {name: dep.name, version: dep.branch}})].filter((m) => this._isKnownRepo(m.name));
      })
      const uniq = new Set(modules.map(e => JSON.stringify(e)));
      return Array.from(uniq).map(e => JSON.parse(e))
    }
    throw new Error(`phovea_product.json or package.json not found`)
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


  _writePhoveaProduct(php, modules, data) {

    php.forEach((lib) => {
      if (lib.repo === data.repo) {
        lib.branch = data.version
      } else {
        lib.branch = modules.find((d) => findName(d.name) === findName(lib.repo)).version
      }
      lib.additional.forEach((pl) => pl.branch = modules.find((d) => findName(d.name) === pl.name).version)
    })
    return php
  }
  _writeDependencies() {
    const cwd = this.data.cwd
    const version = this.data.version;
    const pkg = this.fs.readJSON(`${cwd}/package.json`);
    const phProduct = this.fs.readJSON(`${cwd}/phovea_product.json`);
    const masterDeps = this.data.modules.master;

    const masterPhoveaProduct = this._writePhoveaProduct(phProduct, masterDeps, this.data)

    Object.keys(pkg.dependencies).forEach((dep) => {
      pkg.dependencies[dep] = masterDeps[dep];
    })
    pkg.version = version
    // fs.unlinkSync(this.destinationPath(this.ctx.cwd + '/package.json'))//If you delete the package.json and then replace it with new one .No need to resolve conflicts
    this.fs.writeJSON(`${cwd}/package.json`, pkg)
    this.fs.writeJSON(`${cwd}/phovea_product.json`, masterPhoveaProduct)
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

  _createPullRequest(title, content, base, head, data) {
    this._logVerbose([chalk.cyan(`Create Pull Request:`), chalk.italic(`POST https://${data.gitUser}:**********************@api.github.com/repos/${data.repo}/pulls`)])
    const postOptions = {
      method: 'POST',
      uri: `https://${data.gitUser}:${data.accessToken.current}@api.github.com/repos/${data.repo}/pulls`,
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
        this._logVerbose([chalk.cyan(`Adding labels:`), chalk.italic(`POST https://${data.gitUser}:**************************@api.github.com/repos/${data.repoName}/issues/${prNumber}`)])
        const patchOptions = {
          method: 'POST',
          uri: `https://${data.gitUser}:${data.accessToken.current}@api.github.com/repos/${data.repo}/issues/${prNumber}`,
          body: {
            labels: ['release: ' + data.release]
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

  _getReleaseTemplate() {
    return fs.readFileSync(this.templatePath('releaseTemplate.md')).toString()
  }

  writing() {
    return Promise.resolve(1)
      .then(this._mkdir.bind(this, null))
      .then(() => this._cloneRepo(this.data.repo, this.options.branch, null))
      .then(() => this._prepareProductDependencies())
      .then(() => this._readMasterVersions())
      .then(() => this._getPullRequestNumbers())
      .then(() => this._getReleaseTag())
      .then(() => this._determineReleaseVersion())
      .then(() => this._collectReleaseNotes())
      .then(() => this._checkoutBranch(`-b release_${this.data.version}`, this.data))
      .then(() => this._writeDependencies())
      .then(() => this._pushBranch(`release_${this.data.version}`, this.data))
      .then(() => this._getReleaseTemplate())
      .then(() => this._createPullRequest(`Release ${this.data.version}`, this._getReleaseTemplate(), 'master', this.data.branch, this.data))
      .catch((msg) => {
        this.log(chalk.red(`Error: ${msg}`));
        return Promise.reject(msg);
      });
  }
}

module.exports = ReleaseProduct;
