'use strict';
const Base = require('yeoman-generator').Base;
const chalk = require('chalk');
const fs = require('fs-extra');
const {parseRequirements} = require('../../utils/pip');
const {toHTTPRepoUrl, toSSHRepoUrl, simplifyRepoUrl} = require('../../utils/repo');

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
      const reposToRelease = [props.repository || this.args[0]].concat(this.args.slice(1));
      this.repos = reposToRelease.map(toBaseName).map((d) => ({cwd: `${this.cwd}/${toCWD(d)}`, repo: d, name: toCWD(d)}));
    });
  }

  _abort(msg) {
    return Promise.reject(msg ? msg : 'Step Failed: Aborting');
  }

  _spawn(cmd, argline, cwd) {
    const options = cwd === false ? {} : {cwd: cwd || this.cwd};
    return this.spawnCommandSync(cmd, Array.isArray(argline) ? argline : argline.split(' '), options);
  }

  _spawnOrAbort(cmd, argline, cwd, returnValue) {
    const r = this._spawn(cmd, argline, cwd);
    returnValue = returnValue || cmd;
    if (failed(r)) {
      this.log(r);
      return this._abort('failed: ' + cmd + ' - status code: ' + r.status);
    }
    return Promise.resolve(returnValue);
  }

  _cloneRepo(repo, branch, extras) {
    const repoUrl = this.cloneSSH ? toSSHRepoUrl(repo) : toHTTPRepoUrl(repo);
    const line = `clone -b ${branch}${extras || ''} ${repoUrl}`;
    this.log(chalk.blue(`clone repository:`), `git ${line}`);
    return this._spawnOrAbort('git', line.split(' '));
  }

  _mkdir(dir) {
    dir = dir || this.cwd;
    this.log('create directory: ' + dir);
    return new Promise((resolve) => fs.ensureDir(dir, resolve));
  }

  _determineVersions(ctx) {
    const semver = require('semver');
    const pkg = this.fs.readJSON(`${ctx.cwd}/package.json`);
    let version = pkg.version;
    if (version.endsWith('-SNAPSHOT')) {
      version = version.slice(0, version.length - 9);
    }
    if (this.options.major) {
      ctx.version = semver.inc(version, 'major');
    } else if (this.options.minor) {
      ctx.version = semver.inc(version, 'minor');
    } else if (pkg.version.endsWith('-SNAPSHOT')) {
      ctx.version = version;
    } else {
      ctx.version = semver.inc(version, 'patch');
    }

    ctx.private = pkg.private === true;
    ctx.nextDevVersion = semver.inc(ctx.version, 'patch') + '-SNAPSHOT';
    return Promise.resolve(ctx);
  }

  _checkoutBranch(branch, ctx) {
    const line = `checkout ${branch}`;
    this.log(chalk.blue(`checkout ${branch}:`), `git ${line}`);
    return this._spawnOrAbort('git', line.split(' '), ctx.cwd, ctx);
  }

  _tag(ctx) {
    const line = `tag v${ctx.version}`;
    this.log(chalk.blue(`tag version:`), `git ${line}`);
    return this._spawnOrAbort('git', line.split(' '), ctx.cwd, ctx);
  }

  _prepareReleasePackage(ctx) {
    const semver = require('semver');
    const pkg = this.fs.readJSON(`${ctx.cwd}/package.json`);
    pkg.version = ctx.version;

    const dependenciesToIgnores = (this.options.ignore || '').split(',');

    ctx.dependencies = {};
    Object.keys(pkg.dependencies || {}).forEach((dep) => {
      const depVersion = pkg.dependencies[dep];
      let version = depVersion;
      if (dependenciesToIgnores.some((d) => dep.startsWith(d))) {
        return;
      }
      if (depVersion.endsWith('-SHAPSHOT')) {
        version = depVersion.slice(0, depVersion.length - 9);
        pkg.dependencies[dep] = version;
        ctx.dependencies[dep] = semver.inc(version, 'patch') + '-SNAPSHOT';
      } else if (depVersion.startsWith('github:') || depVersion.startsWith('bitbucket:')) {
        ctx.dependencies[dep] = depVersion;
        // 2 strategies if it is local use the one in the current setup (has to be before) else ask npm
        const local = this.repos.find((d) => d.name === dep);
        if (local) {
          version = local.private ? `${depVersion.split('#')[0]}#v${local.version}` : local.version;
          this.log(`resolved ${dep} to local ${version}`);
        } else {
          const output = this.spawnCommandSync('npm', ['info', dep, 'version'], {stdio: 'pipe'});
          version = String(output.stdout).trim();
          this.log(`resolved ${dep} to npm ${version}`);
        }
        pkg.dependencies[dep] = version;
      }
    });
    this.fs.writeJSON(`${ctx.cwd}/package.json`, pkg);

    let p = Promise.resolve(1);

    if (this.fs.exists(`${ctx.cwd}/requirements.txt`)) {
      ctx.requirements = {};
      const req = parseRequirements(this.fs.read(`${ctx.cwd}/requirements.txt`));
      p = Promise.all(Object.keys(req).map((dep) => {
        if (dependenciesToIgnores.some((d) => dep.includes(d))) {
          return null;
        }
        const depVersion = req[dep];
        ctx.requirements[dep] = depVersion;
        let version = depVersion;
        if (depVersion.endsWith('-SNAPSHOT')) {
          version = depVersion.slice(0, depVersion.length - 9);
          req[dep] = version;
          ctx.requirements[dep] = semver.inc(version, 'patch') + '-SNAPSHOT';
        } else if (dep.startsWith('-e git+http')) {
          ctx.requirements[dep] = depVersion;
          // 2 strategies if it is local use the one in the current setup (has to be before) else ask npm
          const repo = dep.match(/-e git\+https?:\/\/([^/]+)\/([\w\d-_/]+)\.git/)[2];  // remove prefix and suffix (.git)
          const key = toCWD(repo);
          const local = this.repos.find((d) => d.name === key);
          if (local && local.private) {
            req[dep] = `@v${local.version}#${version.split('#')[1]}`;
          } else {
            delete req[dep];
            ctx.requirements[key] = ''; // mark to be deleted
            if (local) {
              version = local.version;
              this.log(`resolved ${key} to local ${version}`);
              req[key] = '==' + version;
            } else {
              return new Promise((resolve) => {
                const request = require('request');
                console.log(`https://pypi.python.org/pypi/${key}/json`);
                request(`https://pypi.python.org/pypi/${key}/json`, (error, response, data) => resolve(data));
              }).then((data) => {
                const infos = JSON.parse(data);
                const versions = Object.keys(infos.releases).sort(semver.compare);
                console.log(versions);
                version = versions[versions.length - 1];
                this.log(`resolved ${key} to pip ${version}`);
                req[key] = '==' + version;
              });
            }
          }
        }
        return null;
      })).then(() => {
        this.fs.write(`${ctx.cwd}/requirements.txt`, Object.keys(req).map((pi) => pi + req[pi]).join('\n'));
      });
    }

    return p.then(() => new Promise((resolve) => this.fs.commit(resolve))).then(() => {
      const line = `commit -am "prepare release_${ctx.version}"`;
      this.log(chalk.blue(`git commit:`), `git ${line}`);
      return this._spawnOrAbort('git', ['commit', '-am', `prepare release_${ctx.version}`], ctx.cwd, ctx);
    });
  }

  _preareNextDevPackage(ctx) {
    const pkg = this.fs.readJSON(`${ctx.cwd}/package.json`);
    pkg.version = ctx.nextDevVersion;
    //
    Object.keys(ctx.dependencies).forEach((dep) => {
      pkg.dependencies[dep] = ctx.dependencies[dep];
    });
    this.fs.writeJSON(`${ctx.cwd}/package.json`, pkg);
    if (ctx.requirements) {
      const req = parseRequirements(this.fs.read(`${ctx.cwd}/requirements.txt`));
      Object.keys(ctx.requirements).forEach((dep) => {
        const depVersion = req[dep];
        if (depVersion && depVersion !== '') {
          req[dep] = depVersion;
        } else {
          delete req[dep];
        }
      });
      this.fs.write(`${ctx.cwd}/requirements.txt`, Object.keys(req).map((pi) => pi + req[pi]).join('\n'));
    }
    return new Promise((resolve) => this.fs.commit(resolve)).then(() => {
      const line = `commit -am "prepare next development version ${ctx.nextDevVersion}"`;
      this.log(chalk.blue(`git commit:`), `git ${line}`);
      return this._spawnOrAbort('git', ['commit', '-am', `prepare next development version ${ctx.nextDevVersion}`], ctx.cwd, ctx);
    });
  }

  _fetch(ctx) {
    const line = `fetch origin`;
    this.log(chalk.blue(`push:`), `git ${line}`);
    return this._spawnOrAbort('git', line.split(' '), ctx.cwd, ctx);
  }

  _merge(branch, ctx) {
    const line = `merge ${branch}`;
    this.log(chalk.blue(`merge:`), `git ${line}`);
    return this._spawnOrAbort('git', line.split(' '), ctx.cwd, ctx);
  }

  _pushBranch(branch, tags, ctx) {
    const line = `push origin${tags ? ' --tags' : ''} ${branch}`;
    this.log(chalk.blue(`push:`), `git ${line}`);
    return this._spawnOrAbort('git', line.split(' '), ctx.cwd, ctx);
  }

  _createPullRequest(ctx) {
    const opn = require('opn');
    const base = simplifyRepoUrl(ctx.repo);
    const url = `https://github.com/${base}/compare/release_${ctx.version}?expand=1`;
    return opn(url, {
      wait: false
    }).then(() => ctx);
  }

  _waitForConfirmation(msg, ctx) {
    return this.prompt({
      type: 'confirm',
      name: 'confirm',
      message: msg,
      default: false
    }).then((props) => {
      if (!props.confirm) {
        return this._waitForConfirmation(msg, ctx);
      }
      return ctx;
    });
  }

  _cleanUp(cwd) {
    cwd = cwd || this.cwd;
    return new Promise((resolve) => {
      fs.remove(cwd, resolve);
    });
  }

  _openReleasePage(ctx) {
    const opn = require('opn');
    const base = simplifyRepoUrl(ctx.repo);
    const url = `https://github.com/${base}/releases/tag/v${ctx.version}`;
    return opn(url, {
      wait: false
    }).then(() => ctx);
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
      .then(this._mkdir.bind(this, null))
      .then(() => Promise.all(this.repos.map((repo) => this._cloneRepo(repo.repo, this.options.branch))))
      .then(() => this._reorder())
      .then((orderedRepos) => {
        let p = Promise.resolve(1);
        console.log(orderedRepos);
        orderedRepos.forEach((repo) => {
          const ctx = repo;
          p = p.then(() => this._determineVersions(ctx))
            .then((ctx) => this._checkoutBranch(`-b release_${ctx.version}`, ctx))
            .then(this._prepareReleasePackage.bind(this))
            .then((ctx) => this._pushBranch(`release_${ctx.version}`, false, ctx))
            .then(this._createPullRequest.bind(this))
            .then(this._waitForConfirmation.bind(this, 'Merged the pull request?'))
            .then(this._fetch.bind(this))
            .then(this._checkoutBranch.bind(this, '-t origin/master'))
            .then(this._tag.bind(this))
            .then(this._checkoutBranch.bind(this, this.options.branch))
            .then(this._merge.bind(this, 'origin/master'))
            .then(this._preareNextDevPackage.bind(this))
            .then(this._pushBranch.bind(this, this.options.branch, true))
            .then(this._openReleasePage.bind(this))
            .then(this._waitForConfirmation.bind(this, 'Travis finished successfully for the build and updated the release?'));
        });
        return p;
      })
      .then(this._cleanUp.bind(this, this.cwd))
      .catch((msg) => {
        this.log(chalk.red(`Error: ${msg}`));
        return Promise.reject(msg);
      });
  }
}

module.exports = Generator;
