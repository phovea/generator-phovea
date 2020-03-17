'use strict';
const BaseRelease = require('../../utils/BaseRelease');
const Base = require('yeoman-generator');
const chalk = require('chalk');
const fs = require('fs-extra');
const fsp = require('fs-extra').promises;
const knownRepositories = require('../../knownRepositories');
const {toHTTPRepoUrl, toSSHRepoUrl, simplifyRepoUrl} = require('../../utils/repo');
var rp = require('request-promise');
const semver = require('semver');
const {parseRequirements} = require('../../utils/pip');
const logSymbols = require('log-symbols');
const {toBaseName, findBase, findName, toCWD, } = require('../../utils/release');

class Release extends BaseRelease {
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
        .catch(() => {
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
          repo: repository,
          cwd: `${this.cwd}/${toCWD(repository)}`,
          repoName: findName(repository),
          repoBase: findBase(repository),
          accessTokens: [{name: 'datavisyn-bot', token: props.datavisynToken}, {name: 'caleydo-bot', token: props.caleydoToken}] // github access_tokens in to interact with the api
        };
      })
      .catch((e) => {
        throw new Error(chalk.red(e));
      })
  }

  /**
   * Validate repo name against existing phovea/caleydo/datavisyn repositories
   * Throw error if not a known repository
   * @param {string} repository  i.e `phovea_clue` or `phovea/phovea_clue`
   */
  _validateRepository(repository) {
    this._logVerbose(chalk.cyan(`Checking if repository: ${chalk.bold(repository)} exists...`));
    return new Promise((resolve, reject) => this._isKnownRepo(findName(repository)) ? resolve(true) : reject('Repository doesn\'t exist.Please provide a valid repository name.'));
  }

  /**
   * Check if repo is a phovea/caleydo/datavisyn repository
   * @param {string} repo
   */
  _isKnownRepo(repo) {
    return Object.keys(knownRepositories).some((r) => knownRepositories[r].includes(repo) || knownRepositories[r].some((d) => repo.includes(d)));
  }

  /**
   * Decide which token to use based on repo name
   * @param {string} repo
   * @return caleydoToken or datavisynToken
   */
  _getAccessToken(repo) {
    if (findBase(repo) === 'datavisyn') {
      return this.data.accessTokens[0];
    } else if (findBase(repo) === 'phovea')
      return this.data.accessTokens[1];
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

  async _prepareDependencies() {
    const pkg = this.fs.readJSON(`${this.data.cwd}/package.json`);
    const deps = pkg.dependencies;
    if (deps && Object.keys(deps).length) {
      const known = Object.keys(deps).filter((dep) => this._isKnownRepo(dep));
      if (known) {
        const dependencies = await this._getOriginalVersions(known);
        return this.data.dependencies = {original: dependencies, master: this._toMaster(dependencies)};
      }
    }
    return Promise.resolve();
  }

  /**
   * Get the versions of the dependencies from github api
   * @param {Array} deps
   */
  _getOriginalVersions(deps) {
    return Promise.all(deps.map((r) => {
      return this._getDependencyTag(toBaseName(r))
        .then((v) => {
          return {name: r, version: v};
        })
    }))
  }

  /**
   * Get latest clue of repository
   * @param {string} dep i.e phovea_clue
   */
  _getDependencyTag(dep) {
    const token = this._getAccessToken(dep);
    const options = {
      url: `https://${token.name}:${token.token}@api.github.com/repos/${dep}/releases`,
      headers: {
        'User-Agent': 'request'
      }
    };
    //TODO package not yet released
    // this._logVerbose([chalk.cyan('Running:'), chalk.italic(`GET https://${this.data.gitUser}:****************************************@api.github.com/repos/${dep}/releases`)]);
    return rp(options).then((d) => JSON.parse(d)[0].name.replace('v', ''));
  }

  _isNotPublishedToNpm(dep) {
    const notPublished = ['tdp_core', 'tdp_ui']
    return notPublished.includes(dep);
  }

  _toMaster(deps) {
    return deps.reduce((acc, dep) => (acc[dep.name] = this._isNotPublishedToNpm(dep.name) ? `github:${toBaseName(dep.name)}#semver:^${dep.version}` : `^${dep.version}`, acc), {});
  }

  async _prepareRequirements() {
    if (fs.existsSync(`${this.data.cwd}/requirements.txt`)) {
      const reqs = parseRequirements(this.fs.read(`${this.data.cwd}/requirements.txt`)); // parsed to object requirements
      const known = Object.keys(reqs).filter((req) => this._isKnownRepo(req)); // known requirements
      if (known && known.length) {
        const others = Object.keys(reqs).filter((req) => !this._isKnownRepo(req)).map((r) => {return [r] + reqs[r]}); // requirements minus our repos
        const requirements = await this._getRequirementVersions(known);
        const RequirementsHandler = require('../../utils/RequirementsHandler');
        const masterVersions = new RequirementsHandler(requirements).master
        return this.data.requirements = {original: requirements, master: masterVersions, others};
      }
    }
    return Promise.resolve();
  }

  _isPublishedToPyPI(req) {
    const options = {
      stdio: ['inherit', 'pipe', 'pipe'] // pipe `stdout` and `stderr` to host process
    };
    const searchResult = this.spawnCommandSync('pip', ['search', req], options).stdout.toString()
    return searchResult.split('\n').filter((p) => {
      p.startsWith(req + ' (')
    })
  }

  _getRequirementVersions(req) {
    return Promise.all(req.map((r) => {
      return this._getDependencyTag(toBaseName(this._pipToNpm(r)))
        .then((v) => {
          return {name: r, version: v}
        })
    }))
  }

  // from `-e git+https://github.com/datavisyn/tdp_core.git` to `tdp_core`
  _pipToNpm(requirement) {
    const regex = /\/(?!.*\/)(.*)\.git/;
    const match = requirement.match(regex);
    if (match) {
      return match[1];
    }
    return requirement;
  }

  // get it from config json
  _isNotPublishedToPip(dependency) {
    return dependency.endsWith('tdp_core.git')
  }


  /**
   * Generate release notes from the Pull Request merged into the develop branch
   * using the `git log` command.
   */
  _collectReleaseNotes(cwd) {
    const options = {
      cwd,
      stdio: ['inherit', 'pipe', 'pipe'] // pipe `stdout` and `stderr` to host process
    };
    const lineA = 'log --merges --pretty=format:"%b';
    const lineB = 'log --merges --pretty=format:"%s';
    this._logVerbose([chalk.cyan(`Running: `), chalk.italic(`git ${lineA}`)]);
    let pullRequestsTitles = this.spawnCommandSync('git', lineA.split(' '), options).stdout.toString().split('\n');
    const latestReleaseIndex = pullRequestsTitles.findIndex((pr) => pr.includes('Release')) // find another way through git to get only latest merged.
    pullRequestsTitles = pullRequestsTitles.slice(0, latestReleaseIndex);
    this._logVerbose([chalk.cyan(`Running: `), chalk.italic(`git ${lineB}`)]);
    let pullRequestsDescriptions = this.spawnCommandSync('git', lineB.split(' '), options).stdout.toString().split('\n');
    pullRequestsDescriptions = pullRequestsDescriptions.slice(0, latestReleaseIndex);
    const pullRequestsNumbers = this._extractPullRequestsNumbers(pullRequestsDescriptions);
    this.data.releaseNotes = this._formatReleaseNotes(pullRequestsTitles, pullRequestsNumbers, this.data.repo);
  }

  /**
   * Format the Pull Request to the template `Update requirements.txt (phovea/phovea_server#22)`
   * @param {string []} pullRequestsTitles Array containing the Pull Requests title.
   * @param {string []} pullRequestsNumbers Array containing the Pull Requests descriptions.
   * @param {*} repo Current repository , i.e., phovea/phovea_server
   */
  _formatReleaseNotes(pullRequestsTitles, pullRequestsNumbers, repo) {
    const title = pullRequestsTitles.filter((title) => title.trim() && title.trim().length > 2) // remove empty strings and invalid titles
      .map((message) => message.replace('"', '')) // `git log` creates extra newline characters and quotes
    return title.map((t, i) => `* ${t} (${repo}#${pullRequestsNumbers[i]})`).join('\n')
  }

  /**
   * Extract Numbers from Pull Requests titles.
   * @param {string []} pullRequests
   */
  _extractPullRequestsNumbers(pullRequestsDescriptions) {
    return this.data.issueNumbers = pullRequestsDescriptions
      .map((description) => {
        const number = /(?:#)(\d+)/g.exec(description) // match number that comes after `#`
        return number ? number[1] : null
      })
      .filter((number) => number != null); // filter empty values
  }

  /**
   * Prompt user to edit the release notes.
   */
  _editReleaseNotes() {
    this.log(`\n${chalk.yellow.bold('Release Notes:')}\n${chalk.italic(this.data.releaseNotes)}\n`)
    return this.prompt([
      {
        type: 'editor',
        name: 'releaseNotes',
        default: this.data.releaseNotes,
        message: 'Edit Release Notes'
      }
    ]).then(({releaseNotes}) => {
      this.data.releaseNotes = releaseNotes;
    })
  }

  /**
   * Read CHANGELOG.md and merge it with the new release notes.
   */
  _writeToChangelog() {
    const changelogPath = `${this.data.cwd}/CHANGELOG.md`;
    const oldChangelog = fs.existsSync(changelogPath) ?
      this.fs.read(changelogPath) : '# Changelog';
    const mergedChangelog = oldChangelog.replace('# Changelog', `# Changelog\n\n## v${this.data.version}\n\n${this.data.releaseNotes}`);

    return Promise.resolve().then(() => fs.writeFileSync(changelogPath, mergedChangelog));

  }

  /**
   * Calculate if release is `major`,`minor`,`patch`.
   */
  async _getReleaseTag() {
    let release;
    if (this._hasMajorReleased()) {
      release = 'major';
      this.log(logSymbols.info, 'Next release:', chalk.cyan.bold(release), `(One or more dependencies latest tag is a major)`);
    } else {
      const labels = await this._getGitLabels(this.data.issueNumbers, this.data.repo);
      if (labels.length) {
        release = labels.includes('major') ? 'major' : labels.includes('minor') ? 'minor' : 'patch';
        this.log(logSymbols.info, 'Next release:', chalk.cyan.bold(release), `Computed from the labels set on PRs`);
      } else {
        throw new Error('No release labels were found on Pull Requests:\nPlease add at least one release label in one of the Pull Requests'); // labels empty throw error
      }
    }
    this.data.version = await this._determineReleaseVersion(release);
    this.data.branch = `release-${this.data.version}`
    return this
  }

  /**
   * Check if any of the known dependencies latest release is `major`.
   * Put differently check if minor and patch digits are zero ---> release is X.0.0.
   */
  _hasMajorReleased() {
    return this._hasMajorReleasedDependency() || this._hasMajorReleasedRequirement;
  }

  _hasMajorReleasedDependency() {
    if (this.data.dependencies) {
      return this.data.dependencies.original.some((dep) => semver.minor(dep.version) === 0 && semver.patch(dep.version) === 0);
    }
    return false;
  }

  _hasMajorReleasedRequirement() {
    if (this.data.requirements) {
      return this.data.requirements.original.some((req) => semver.minor(req.version) === 0 && semver.patch(req.version) === 0)
    }
    return false;
  }

  /**
  * Get the release labels of the Pull Requests numbers that have been merged into develop.
  * @param {string []} issueNumbers Array containing the Pull Requests numbers that have been merged into develop.
  * @param {string} repository Current repository, i.e., `phovea/phovea_server`
  */
  async _getGitLabels(issueNumbers, repository) {
    const token = this._getAccessToken(this.data.repoName)
    this._logVerbose(chalk.cyan('Getting Pull Requests Labels...'))
    const allLabels = await Promise.all(issueNumbers.map((n) => {
      const options = {
        url: `https://${token.name}:${token.token}@api.github.com/repos/${repository}/issues/${n}/labels`,
        headers: {
          'User-Agent': 'request'
        }
      };
      return rp(options).then((d) => JSON.parse(d))
    }))
    return this.data.releaseLabels = [].concat.apply([], allLabels)
      .filter((label) => label.name.trim().startsWith('release:'))
      .map((s) => s.name.replace('release:', '').trim())
  }

  _calculateVersion(version, release) {
    const semver = require('semver');
    return semver.inc(version, release)
  }

  /**
   * Determine release tag from release labels of the Pull Requests.
   */
  _determineReleaseVersion(release) {
    const pkg = this.fs.readJSON(`${this.data.cwd}/package.json`);
    let originalVersion = pkg.version;
    if (originalVersion.endsWith('-SNAPSHOT')) {
      originalVersion = originalVersion.slice(0, originalVersion.length - 9);
    }
    const version = this._calculateVersion(originalVersion, release)

    this.data.release = release
    return this._editReleaseVersion(version, release, originalVersion)
  }

  /**
   * Allow user to change release version.
   * @param {*} version
   * @param {*} release
   */
  _editReleaseVersion(version, release, originalVersion) {
    return this.prompt([
      {
        type: 'confirm',
        name: 'keepTag',
        message: `Next tag: ${chalk.cyan.bold(version)}`,
      }
    ]).then(({keepTag}) => {
      if (!keepTag) {
        return this.prompt([{
          type: 'list',
          name: 'newTag',
          choices: ['major', 'minor', 'patch'].filter((v) => v !== release).map((rel) => rel + ' ' + this._calculateVersion(originalVersion, rel)),
          message: `Choose next tag`,
        }]).then(({newTag}) => {
          [release, version] = newTag.split(' ')
          this.data.release = release
          return version
        })
      }
      return version
    })
  }

  /**
   * Checkout branch
   * @param {string} branch to be checked out
   * @param {string} cwd injected data
   */
  _checkoutBranch(branch, cwd) {
    const line = `checkout ${branch}`;
    this._logVerbose([chalk.cyan(`Checkout new branch:`), chalk.italic(`git ${line}`)]);
    return this._spawnOrAbort('git', line.split(' '), cwd, null);
  }

  /**
   * Resolve dependencies & requirements to master version.
   */
  async _writeDeps(dependencies, requirements, cwd) {
    if (this.data.dependencies) {
      this.log(`\n${chalk.yellow.bold('Dependencies:')}${Object.keys(dependencies.master).map((k) => '\n' + k + ': ' + chalk.cyan(dependencies.master[k]))}`)
    }
    return this.prompt([
      {
        type: 'confirm',
        name: 'update',
        when: this.data.dependencies != null,
        message: `Update versions of the known dependencies`,
      }
    ]).then(({update}) => {
      if (update) {
        this._logVerbose([chalk.cyan(`Updating versions of the known dependencies...`)]);
        return this._writeDependencies(dependencies.master, cwd);
      }
    }).then(() => {
      if (this.data.requirements) {
        this.log(`\n${chalk.yellow.bold('Requirements:')}\n ${chalk.cyan(requirements.master.join('\n'))}\n`)
      }
      return this.prompt([
        {
          type: 'confirm',
          name: 'update',
          when: this.data.requirements != null,
          message: `Update versions of the known requirements`,
        }
      ])
    }).then(({update}) => {
      if (update) {
        this._logVerbose([chalk.cyan(`Updating versions of the known requirements...`)]);
        return this._writeRequirements(requirements, cwd);
      }
    })
  }

  _commitFiles(cwd) {
    const line = `commit -am "prepare release-${this.data.version}"`;
    this._logVerbose([chalk.cyan(`Commit changes:`), chalk.italic(`git ${line}`)]);
    return this._spawnOrAbort('git', ['add', '.'], cwd, null).then(() => this._spawnOrAbort('git', ['commit', '-am', `prepare release-${this.data.version}`], cwd, null))

  }

  _writeNewVersion(cwd) {
    const pkg = this.fs.readJSON(`${cwd}/package.json`);
    pkg.version = this.data.version
    return Promise.resolve().then(() => fs.writeJsonSync(`${cwd}/package.json`, pkg, {spaces: 2}))
  }

  _writeDependencies(dependencies, cwd) {
    const pkg = this.fs.readJSON(`${cwd}/package.json`);
    Object.keys(dependencies).forEach((dep) => {
      pkg.dependencies[dep] = dependencies[dep];
    })


    return Promise.resolve().then(() => fs.writeJsonSync(`${cwd}/package.json`, pkg, {spaces: 2}))
  }

  _writeRequirements(requirements, cwd) {
    return Promise.resolve().then(() => fs.writeFileSync(this.destinationPath(cwd + '/requirements.txt'), [...requirements.master, ...requirements.others].join('\n')));
  }

  _pushBranch(branch, cwd) {
    this.data.branch = branch
    const line = `push origin ${branch}`;
    const options = {cwd, stdio: ['inherit', 'pipe', 'pipe']};
    this._logVerbose([chalk.cyan(`Push branch:`), chalk.italic(`git ${line}`)]);
    return this.spawnCommandSync('git', line.split(' '), options);
  }

  _createPullRequest(title, base, head) {
    const token = this._getAccessToken(this.data.repoName)
    const content = this.fs.read(this.templatePath('release.md'));
    this._logVerbose([chalk.cyan(`Create Pull Request:`), chalk.italic(`POST https://${token.name}:**********************@api.github.com/repos/${this.data.repo}/pulls`)])
    const postOptions = {
      method: 'POST',
      uri: `https://${token.name}:${token.token}@api.github.com/repos/${this.data.repo}/pulls`,
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
    };
    return rp(postOptions).then((d) => {
      return d.number
    })
      .then((prNumber) => this._setLabels(prNumber, token))
      .then((prNumber) => this._setAssignees(prNumber, token))
      .then((prNumber) => this._setReviewers(prNumber, token));
  }

  _setLabels(prNumber, token) {
    this._logVerbose([chalk.cyan(`Adding labels:`), chalk.italic(`POST https://${token.name}:**************************@api.github.com/repos/${this.data.repoName}/issues/${prNumber}`)])
    const patchOptions = {
      method: 'POST',
      uri: `https://${token.name}:${token.token}@api.github.com/repos/${this.data.repo}/issues/${prNumber}`,
      body: {
        labels: ['release: ' + this.data.release]
      },
      headers: {
        'User-Agent': 'request'
      },
      json: true
    }
    return rp(patchOptions).then(() => prNumber);
  }

  _setAssignees(prNumber, token) {
    this._logVerbose([chalk.cyan(`Adding Assignees:`), chalk.italic(`POST https://${token.name}:**************************@api.github.com/repos/${this.data.repoName}/issues/${prNumber}/assignees`)])
    const assigneeOptions = {
      method: 'POST',
      uri: `https://${token.name}:${token.token}@api.github.com/repos/${this.data.repo}/issues/${prNumber}/assignees`,
      body: {
        assignees: this.data.reviewers
      },
      headers: {
        'User-Agent': 'request'
      },
      json: true
    }
    return rp(assigneeOptions).then(() => prNumber);
  }

  _chooseReviewers() {
    return this.prompt([{
      type: 'checkbox',
      name: 'reviewers',
      message: chalk.cyan('Choose reviewer/s and assignee/s.'),
      choices: this.data.members
    }]).then(({reviewers}) => {
      this.log(reviewers)
      this.data.reviewers = reviewers
    });
  }

  _setReviewers(prNumber, token) {
    this._logVerbose([chalk.cyan(`Adding Reviewers:`), chalk.italic(`POST https://${token.name}:**************************@api.github.com/repos/${this.data.repo}/pulls/${prNumber}/requested_reviewers`)])
    const reviewerOptions = {
      method: 'POST',
      uri: `https://${token.name}:${token.token}@api.github.com/repos/${this.data.repo}/pulls/${prNumber}/requested_reviewers`,
      body: {
        reviewers:
          this.data.reviewers
      },
      headers: {
        'User-Agent': 'request'
      },
      json: true
    }
    return rp(reviewerOptions).then(() => prNumber);
  }

  async _getReviewersList() {
    const token = this._getAccessToken(this.data.repoName)
    const options = {
      url: `https://${token.name}:${token.token}@api.github.com/orgs/datavisyn/teams/dev/members`,
      headers: {
        'User-Agent': 'request'
      },
      role: 'admin'
    };
    return this.data.members = await rp(options).then((d) => JSON.parse(d)).then((b) => {
      return b.map((d) => d.login)
    });
  }

  writing() {
    return Promise.resolve(1)
      .then(this._mkdir.bind(this, null))
      .then(() => this._cloneRepo(this.data.repo, this.options.branch, null))
      .then(() => this._prepareDependencies())
      .then(() => this._prepareRequirements())
      .then(() => this._collectReleaseNotes(this.data.cwd))
      .then(() => this._getReleaseTag())
      .then(() => this._checkoutBranch('-b ' + this.data.branch, this.data.cwd))
      .then(() => this._editReleaseNotes())
      .then(() => this._writeToChangelog())
      .then(() => this._writeNewVersion(this.data.cwd))
      .then(() => this._writeDeps(this.data.dependencies, this.data.requirements, this.data.cwd))
      .then(() => this._commitFiles(this.data.cwd))
      .then(() => this._pushBranch(this.data.branch, this.data.cwd))
      .then(() => this._getReviewersList())
      .then(() => this._chooseReviewers())
      .then(() => this._createPullRequest(`Release ${this.data.version}`, 'master', this.data.branch))
      .catch((msg) => {
        this.log(chalk.red(`Error: ${msg}`));
        return Promise.reject(msg);
      });
  }

}

module.exports = Release;
