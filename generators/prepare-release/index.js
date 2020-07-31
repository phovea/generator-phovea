'use strict';
const Base = require('yeoman-generator');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const parse = require('csv-parse/lib/sync')
const resolve = path.resolve;
const {parseRequirements} = require('../../utils/pip');
const {toHTTPRepoUrl, toSSHRepoUrl, simplifyRepoUrl} = require('../../utils/repo');
var rp = require('request-promise');
const test = true;

function toBaseName(name) {
  if (name.includes('/')) {
    return name;
  }
  return `Caleydo/${name}`;
}

function failed(spawnResult) {
  return spawnResult.status !== 0;
}

function topologicalSort(nodes) {
  const lookup = new Map();
  const graph = nodes.map((d) => {
    const n = {name: d.name, outgoing: d.edges, incoming: [], data: d.data};
    lookup.set(d.name, n);
    return n;
  });
  graph.forEach((n) => {
    n.outgoing = n.outgoing.map((e) => lookup.get(e));
    n.outgoing.forEach((m) => m.incoming.push(n));
  });

  // Kahn' algorithm see wikipedia
  const l = [];
  const s = graph.filter((d) => d.outgoing.length === 0);
  while (s.length > 0) {
    const n = s.shift();
    l.push(n);
    n.incoming.forEach((m) => {
      // remove edge
      m.outgoing.splice(m.outgoing.indexOf(n), 1);
      if (m.outgoing.length === 0) {
        s.push(m);
      }
    });
  }
  return l.map((n) => n.data);
}

class Generator extends Base {

  constructor(args, options) {
    super(args, options);

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
    this.option('ignore', {
      defaults: '',
      type: String
    });
    this.option('branch', {
      defaults: 'develop',
      type: String
    });
    this.option('ssh', {
      alias: 's',
      defaults: false,
      type: Boolean
    });

    this.argument('repo', {
      required: false
    });
  }

  initializing() {
    this.composeWith(['phovea:_check-own-version', 'phovea:check-node-version']);
  }

  prompting() {
    return this.prompt([{
      type: 'input',
      name: 'repository',
      message: 'Repository',
      default: this.args.length > 0 ? this.args[0] : 'phovea_clue',
      when: this.args.length === 0,
      validate: (d) => d.length > 0
    }, {
      type: 'confirm',
      name: 'cloneSSH',
      message: 'SSH clone',
      store: true,
      default: this.options.ssh,
      when: !this.options.ssh
    },
    {
      type: 'input',
      name: 'knownReposFile',
      message: 'files of known repos',
      default: this.args.length > 0 ? this.args[1] : '/workspaces/releases/repositories.csv',
      required: true,
      when: this.args.length === 0,
      validate: (d) => d.length > 0
    },
    {
      type: 'input',
      name: 'releaseType',
      message: 'release type [major|minor|patch]',
      default: this.options.releaseType || 'patch',
      required: true,
      when: !this.options.releaseType,
      validate: (d) => ['major', 'minor','patch'].indexOf(d) >= 0
    }]).then((props) => {
      this.releaseType = props.releaseType;
      this.repository = props.repository || this.args[0];
      this.knownRepos = this._getKnownRepoFile(props.knownReposFile, this.repository);
      this.repository = this.knownRepos[this.repository];
      console.log(this.knownRepos);
      console.log(this.repository);
      this.cloneSSH = props.cloneSSH || this.options.ssh;
      this.rootCwd = this.repository.name;
      this.repositoryCwd =  this.repository.name + '/' +  this.repository.name;
      this.dependenciesToIgnores = this.options.ignore ? this.options.ignore.split(',') : [];
      console.log(this.rootCwd);
      console.log(this.repositoryCwd);
     });
  }

  _getKnownRepoFile(file, repo) {
    if(!fs.existsSync(file)) {
      throw new Error('Given file cannot be read: ' + file);
    }
    const records = parse(fs.readFileSync(file), {
      columns: true,
      skip_empty_lines: true
    });
    const knownRepos = Object.assign({}, ...records.map((item) => ({[item.name]: item})));
    if(!knownRepos || !knownRepos[repo]){
      throw new Error('Given repository ' + repo + ' is not part of the known repos');
    }
    if(!knownRepos[repo].name || !knownRepos[repo].version || !knownRepos[repo].owner || !knownRepos[repo].link){
      throw new Error('The known repo file has the wrong format. It should have the following format: name | version | owner | link | pip | npm');
    }
    Object.entries(knownRepos).forEach((d) => {
      if(d[1].version) {
        d[1].version = d[1].version.replace('v','');
      }
    });
    return knownRepos;
  }

  _abort(msg) {
    return Promise.reject(msg ? msg : 'Step Failed: Aborting');
  }

  _spawn(cmd, argline, cwd) {
    const options = cwd === false ? {} : {cwd: cwd || this.rootCwd};
    return this.spawnCommandSync(cmd, Array.isArray(argline) ? argline : argline.split(' '), options);
  }

  _spawnOrAbort(cmd, argline, cwd) {
    const r = this._spawn(cmd, argline, cwd);
    if (failed(r)) {
      this.log(r);
      return this._abort('failed: ' + cmd + ' - status code: ' + r.status);
    }
    return Promise.resolve();
  }

  _cloneRepo(repo, branch, extras) {
    const repoUrl = this.cloneSSH ? toSSHRepoUrl(repo) : toHTTPRepoUrl(repo);
    const line = `clone -b ${branch}${extras || ''} ${repoUrl}`;
    this.log(chalk.blue(`clone repository:`), `git ${line}`);
    return this._spawnOrAbort('git', line.split(' '));
  }

  _mkdir(dir) {
    dir = dir || this.rootCwd;
    this.log('create directory: ' + dir);
    return new Promise((resolve) => fs.ensureDir(dir, resolve));
  }

  _determineVersions() {
    const semver = require('semver');
    const pkg = this.fs.readJSON(`./${this.repositoryCwd}/package.json`);
    let version = pkg.version;
    if (version.endsWith('-SNAPSHOT')) {
      version = version.slice(0, version.length - 9);
    }
    this.version = semver.inc(version, this.releaseType);
    this.private = pkg.private === true;
    this.nextDevVersion = semver.inc(this.version, 'patch') + '-SNAPSHOT';
    this.releaseBranch = `release-${this.version}`;
    console.log('determined version: ' + this.version + '; private: ' + this.version + '; nextDevVersion: ' + this.nextDevVersion);
  }

  _checkoutBranch(branch) {
    if(!branch) {
      branch = '-b ' + this.releaseBranch;
    } 
    const line = `checkout ${branch}`;
    this.log(chalk.blue(`checkout -b ${branch}:`), `git ${line}`);
    return this._spawnOrAbort('git', line.split(' '), this.repositoryCwd);
  }

  _tag() {
    const line = `tag v${this.version}`;
    this.log(chalk.blue(`tag version:`), `git ${line}`);
    return this._spawnOrAbort('git', line.split(' '), this.repositoryCwd);
  }

  _prepareReleasePackage() {
    const pkg = this.fs.readJSON(`./${this.repositoryCwd}/package.json`);
    pkg.version = this.version;
    this.dependencies = {};
    Object.keys(pkg.dependencies || {}).forEach((dep) => {
      if (this.dependenciesToIgnores.some((d) => dep.startsWith(d))) {
        return;
      }
      if(dep in this.knownRepos){
        this.dependencies[dep] = pkg.dependencies[dep];
        pkg.dependencies[dep] = this._getDependencyVersion(pkg.dependencies[dep], this.knownRepos[dep]);
        console.log('change dependencies[' + dep + ']: ' + this.knownRepos[dep].version );
      }
    });
    Object.keys(pkg.optionalDependencies || {}).forEach((dep) => {
      if (this.dependenciesToIgnores.some((d) => dep.startsWith(d))) {
        return;
      }
      if(dep in this.knownRepos){
        this.dependencies[dep] = pkg.optionalDependencies[dep];
        pkg.optionalDependencies[dep] = this._getDependencyVersion(pkg.optionalDependencies[dep], this.knownRepos[dep]);
        console.log('change optionalDependencies[' + dep + ']: ' + this.knownRepos[dep].version );
      }
    });
    this.fs.writeJSON(`${this.repositoryCwd}/package.json`, pkg);

    let p = Promise.resolve(1);

    if (fs.existsSync(`${this.repositoryCwd}/requirements.txt`)) {
      this.requirements = {};
      const req = parseRequirements(this.fs.read(`${this.repositoryCwd}/requirements.txt`));
      Object.keys(req).map((d) => {
        let dep = d;
        if (dep.startsWith('-e git+http')) {
          // 2 strategies if it is local use the one in the current setup (has to be before) else ask npm
          dep = dep.match(/-e git\+https?:\/\/([^/]+)\/([\w\d-_/]+)\.git/)[2];  // remove prefix and suffix (.git)
          dep = dep.indexOf('/') > 0 ? dep.substring(dep.lastIndexOf('/')+1): dep;
        }
        if (this.dependenciesToIgnores.some((d) => dep.includes(d))) {
          return null;
        }
        if(this.knownRepos[dep]){
          this.requirements[dep] = d;
          req[dep] = this._getPipRangeVersion(d + req[d], this.knownRepos[dep]);
          console.log('change requirement[' + dep + ']: ' + req[dep] );
        
          if(d.startsWith('-e git+http')){
            delete req[d];
          }
        }
      });
      this.fs.write(`${this.repositoryCwd}/requirements.txt`, Object.keys(req).map((pi) => req[pi].startsWith('-e git+http') ? req[pi] : (pi + req[pi])).join('\n'));
    }
    return p.then(() => new Promise((resolve) => this.fs.commit(resolve))).then(() => {
      const line = `commit -am "prepare release_${this.version}"`;
      this.log(chalk.blue(`git commit:`), `git ${line}`);
      return this._spawnOrAbort('git', ['commit', '-am', `prepare release_${this.version}`], this.repositoryCwd);
    });
  }
  _getDependencyVersion(developVersion, repo) {
    return repo.npm ? '^' + repo.version : developVersion.replace('#develop', '#semver:^' + repo.version);
  }
  _getPipRangeVersion(developVersion, repo) {
    return repo.pip ? `>=${repo.version},<${Number(repo.version.substring(0, repo.version.indexOf('.'))) + 1}.0.0`: developVersion.replace('@develop', '@'+repo.version);
  }
  _prepareNextDevPackage() {
    const pkg = this.fs.readJSON(`${this.repositoryCwd}/package.json`);
    pkg.version = this.nextDevVersion;
    //
    if(this.dependencies){
      if(pkg.dependencies) {
        Object.keys(this.dependencies || {}).forEach((dep) => {
          console.log(dep);
          if(dep in pkg.dependencies){
            pkg.dependencies[dep] = this.dependencies[dep];
            console.log('change dependencies[' + dep + ']: ' + pkg.dependencies[dep] );
          }
        });
      }
      if(pkg.optionalDependencies) {
        Object.keys(this.dependencies || {}).forEach((dep) => {
          if(dep in pkg.optionalDependencies){
            pkg.optionalDependencies[dep] = this.dependencies[dep];
            console.log('change optional dependencies[' + dep + ']: ' + pkg.optionalDependencies[dep] );
          }
        });
      }
    }
    this.fs.writeJSON(`${this.repositoryCwd}/package.json`, pkg);
    if (this.requirements) {
      const req = parseRequirements(this.fs.read(`${this.repositoryCwd}/requirements.txt`));
      Object.keys(this.requirements).forEach((dep) => {
        if (req[dep]) {
          req[dep] = this.requirements[dep] + '@develop#egg=' + dep;
          console.log('change requirement[' + dep + ']: ' + req[dep] );
        } 
      });
      Object.keys(req).forEach((dep) => {
        if (dep.startsWith('-e git+http')) {
          req[dep] = dep + '@develop#egg=' + req[dep].substring(req[dep].indexOf('egg=')+ 4);
          console.log('change requirement[' + dep + ']: ' + req[dep] );
        } 
      });
      this.fs.write(`${this.repositoryCwd}/requirements.txt`, Object.keys(req).map((pi) => req[pi].startsWith('-e git+http') ? req[pi] : (pi + req[pi])).join('\n'));
    }
    return new Promise((resolve) => this.fs.commit(resolve)).then(() => {
      const line = `commit -am "prepare next development version ${this.nextDevVersion}"`;
      this.log(chalk.blue(`git commit:`), `git ${line}`);
      return this._spawnOrAbort('git', ['commit', '-am', `prepare next development version ${this.nextDevVersion}`], this.repositoryCwd);
    });
  }

  _fetch() {
    const line = `fetch origin`;
    this.log(chalk.blue(`push:`), `git ${line}`);
    return this._spawnOrAbort('git', line.split(' '), this.repositoryCwd);
  }

  _merge(branch) {
    const line = `merge ${branch}`;
    this.log(chalk.blue(`merge:`), `git ${line}`);
    return this._spawnOrAbort('git', line.split(' '), this.repositoryCwd);
  }

  _pushBranch(release, tags) {
    let branch = 'develop';
    if(release) {
      branch = this.releaseBranch;
    }
    const line = `push origin${tags ? ' --tags' : ''} ${branch}`;
    this.log(chalk.blue(`push:`), `git ${line}`);
    if(test) {
      return Promise.resolve();
    }
    return this._spawnOrAbort('git', line.split(' '), this.repositoryCwd);
  }

  _createPullRequestOld() {
    const open = require('open');
    const url = `${this.repository.link}/compare/${this.releaseBranch}?expand=1`;
    console.log('Please add the following for the generated pull request:');
    console.log('********************************************************');
    console.log(this.releaseNotes);
    console.log('********************************************************');
    return test ? Promise.resolve() : open(url, {
      wait: false
    }).then(() => this);
  }

  _waitForConfirmation(msg) {
    return this.prompt({
      type: 'confirm',
      name: 'confirm',
      message: msg,
      default: false
    }).then((props) => {
      if (!props.confirm) {
        return this._waitForConfirmation(msg);
      }
    });
  }

  _cleanUp(cwd) {
    cwd = cwd || this.rootCwd;
    console.log('cleanUp: ' + cwd);
    return new Promise((resolve) => {
      fs.remove(cwd, resolve);
    });
  }

  _openReleasePage() {
    console.log('Please add the following release notes:' );
    console.log(this.releaseNotes);
    const open = require('open');
    const url = `${this.repository.link}/releases/tag/v${this.version}`;
    return open(url, {
      wait: false
    });
  }

  _reorder() {
    const pkgs = this.repos.map((d) => {
      const pkg = this.fs.readJSON(`${d.cwd}/package.json`);
      return {
        name: pkg.name,
        modules: Object.keys(Object.assign(pkg.dependencies || {}, pkg.optionalDependencies || {}))
      };
    });
    console.log(pkgs);
    const names = new Set(pkgs.map((d) => d.name));
    const dependencies = pkgs.map((d, i) => {
      const deps = (d.modules || []).filter((dep) => names.has(dep));
      return {
        name: d.name,
        edges: deps,
        data: this.repos[i]
      };
    });
    console.log(dependencies);
    return topologicalSort(dependencies);
  }

  writing() {
    return Promise.resolve(1)
      .then(this._cleanUp.bind(this, null))
      .then(this._mkdir.bind(this, null))
      .then(this._cloneRepo.bind(this, this.repository.link, 'develop'))
      .then(this._determineVersions.bind(this, null))
      .then(this._checkoutBranch.bind(this, null))
      .then(this._prepareReleasePackage.bind(this))
      .then(this._waitForConfirmation.bind(this, 'Please check, if the changes for the release branch is correct'))
      //check if everything is correct
      .then(this._pushBranch.bind(this, true, false))
      .then(this._collectReleaseNotes.bind(this))
      .then(this._mergeReleaseTemplate.bind(this))
      .then(this._createPullRequestOld.bind(this))
      .then(this._waitForConfirmation.bind(this, 'Did you merge the pull request after checking that CircleCI was successful?'))
      .then(this._waitForConfirmation.bind(this, 'Please publish the repository if needed'))
      .then(this._fetch.bind(this))
      .then(this._checkoutBranch.bind(this, '-t origin/master'))
      .then(this._tag.bind(this))
      .then(this._checkoutBranch.bind(this, 'develop'))
      .then(this._merge.bind(this, 'origin/master'))
      .then(this._prepareNextDevPackage.bind(this))
      .then(this._waitForConfirmation.bind(this, 'Please check, if the changes for the develop branch is correct'))
      .then(this._pushBranch.bind(this, false, true))
      .then(this._openReleasePage.bind(this))
      .then(this._waitForConfirmation.bind(this, 'CircleCI finished successfully for the build and updated the release?'))
      .then(this._cleanUp.bind(this, this.cwd))
      .catch((msg) => {
        this.log(chalk.red(`Error: ${msg}`));
        return Promise.reject(msg);
      });
  }
  /**
   * Spawn command and return the output. `This.spawnCommandSync()` doesn't return output by default.
   * @param {string} command Command to execute, i.e, `git`.
   * @param {string[]} flags Flags to run the command with, i.e, `['checkout','develop']`
   */
  _spawnOnHost(command, flags) {
    const options = {
      stdio: ['inherit', 'pipe', 'pipe'], // pipe `stdout` and `stderr` to host process,
      cwd: this.repositoryCwd
    };
    return this.spawnCommandSync(command, flags, options).stdout.toString().trim(); // git log returns extra spaces
  }


  /**
   * Generate release notes from the Pull Request merged into the develop branch
   * using the `git log` command.
   */
  _collectReleaseNotes() {
    const pullRequestsDescriptions = this._spawnOnHost('git', ['log', 'origin/master..develop', '--merges', '--pretty=format:"%s']).split('\n');
    const pullRequestsTitles = this._spawnOnHost('git', ['log', 'origin/master..develop', '--merges', '--pretty=format:"%b']).split('\n');
    const pullRequestsNumbers = this._extractPullRequestsNumbers(pullRequestsDescriptions);
    this.releaseNotes = this._formatReleaseNotes(pullRequestsTitles, pullRequestsNumbers);
    return Promise.resolve();
  }

  /**
   * Format the Pull Request to the template `Update requirements.txt (phovea/phovea_server#22)`
   * @param {string []} pullRequestsTitles Array containing the Pull Requests title.
   * @param {string []} pullRequestsNumbers Array containing the Pull Requests descriptions.
   * @param {*} repo Current repository , i.e., phovea/phovea_server
   */
  _formatReleaseNotes(pullRequestsTitles, pullRequestsNumbers) {
    const title = pullRequestsTitles.filter((title) => title.trim() && title.trim().length > 2) // remove empty strings and invalid titles
      .map((message) => message.replace('"', '')); // `git log` creates extra newline characters and quotes
    return title.map((t, i) => `* ${t} (${this.repository.name}#${pullRequestsNumbers[i]})`).join('\n');
  }


  /**
   * Extract pull requests numbers.
   * @param {string []} pullRequestsDescriptions
   */
  _extractPullRequestsNumbers(pullRequestsDescriptions) {
    return this.issueNumbers = pullRequestsDescriptions
      .map((description) => {
        const number = /(?:#)(\d+)/g.exec(description); // match number that comes after `#`
        return number ? number[1] : null;
      })
      .filter((number) => number != null); // filter empty values if any
  }

  /**
    * Read `release.md` template and append release notes to it.
    */
  _mergeReleaseTemplate() {
    const releaseTemplate = this.fs.read(this.templatePath(`release.md`));
    this.releaseNotes = releaseTemplate.replace('*List of addressed issues and PRs since the last release*', this.releaseNotes);
   }

  _createPullRequest() {
    this.log(chalk.bold('Drafting Pull Request...'));
    const postOptions = {
      method: 'POST',
      uri: `${this.repository.link.replace('github.com', 'api.github.com/repos').replace('/phovea/', '/')}/pulls`,
      body: {
        title: 'Release ' + this.version,
        head: this.releaseBranch,
        body: this.releaseNotes,
        base: 'master'
      },
      headers: {
        'User-Agent': 'request'
      },
      json: true
    };
    this.log(postOptions);
    return rp(postOptions).then((d) => {
      return d.number;
    })
    /* .then((prNumber) => this._setLabels(prNumber))
     .then((prNumber) => this._setAssignees(prNumber));*/
  }

}

module.exports = Generator;
