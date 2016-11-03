'use strict';
const Base = require('yeoman-generator').Base;
const chalk = require('chalk');
const known = require('../../utils/known');

function toPhoveaName(name) {
  return name.replace(/^caleydo_/, 'phovea_');
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

    this.argument('repo', {
      required: false
    });
  }

  prompting() {
    return this.prompt([{
      type: 'input',
      name: 'repo',
      message: 'Repository',
      default: this.args.length > 0 ? this.args[0] : 'caleydo_core',
      when: this.args.length === 0
    }, {
      type: 'confirm',
      name: 'cloneSSH',
      message: 'SSH clone',
      store: true,
      default: this.options.ssh,
      when: !this.options.ssh
    }]).then((props) => {
      this.repo = props.repo || this.args[0];
      this.cwd = toPhoveaName(this.repo);
      this.cloneSSH = props.cloneSSH || this.options.ssh;
    });
  }

  _promptLoop(message, task, step) {
    // repeats the message till yes was selected
    if (typeof task === 'number') {
      step = task;
      task = null;
    }
    return this.prompt({
      type: 'confirm',
      name: 'confirm',
      message: message,
      default: false
    }).then((props) => {
      return props.confirm ? step : (task ? task(step): this._promptLoop(message, step));
    });
  }

  _spawn(cmd, argline) {
    return failed(this.spawnCommandSync(cmd, Array.isArray(argline) ? argline : argline.split(' '), {
      cwd: this.cwd
    }));
  }

  _abort() {
    return Promise.reject('Step Failed: Aborting')
  }

  _cloneRepo(step) {
    // clone
    const repoUrl = this.cloneSSH ? `git@github.com/Caleydo/${this.repo}.git` : `https://github.com/Caleydo/${this.repo}.git`;
    this.log(chalk.blue(`${step++}. clone repository: `), `git clone ${repoUrl} ${this.cwd}`);
    if (failed(this.spawnCommandSync('git', ['clone', repoUrl, this.cwd]))) {
      return this._abort();
    }
    this.log(chalk.blue(`${step++}. switch to migrate branch: `), `git checkout -b migrate`);
    if (!this._spawn('git', 'checkout -b migrate')) {
      return this._abort();
    }
    return step;
  }

  _migrate(step) {
    this.log(chalk.blue(`${step++}. migrate structure: `), 'yo phovea:migrate');
    if (!this._spawn('yo', 'phovea:migrate')) {
      return this._abort();
    }
    return step;
  }

  _migrateSource(step) {
    this.log(chalk.blue(`${step++}. migrate source code: `), 'yo phovea:migrate-source');
    if (!this._spawn('yo', 'phovea:migrate-source')) {
      return this._abort();
    }
    return step;
  }

  _commit(message, step) {
    this.log(chalk.blue(`${step++}. commit all changes: `), `git add --all && git commit -m "${message}"`);
    if (!this._spawn('git', 'add --all')) {
      return this._abort();
    }
    if (!this._spawn('git', ['commit', '-m', message])) {
      return this._abort();
    }
    return step;
  }

  _installNPM(step) {
    this.log(chalk.blue(`${step++}. run npm install: `), `npm install`);
    if (!this._spawn('npm', 'install')) {
      return this._abort();
    }
    return step;
  }

  _runScript(script, step) {
    this.log(chalk.blue(`${step++}. ${script} plugin: `), `npm run ${script}`);
    if (!this._spawn('npm', ['run', script])) {
      return this._abort();
    }
    return step;
  }

  _build(step) {
    return this._runScript('build', step);
  }

  _compile(step) {
    return this._runScript('compile', step);
  }

  _lint(step) {
    return this._runScript('lint', step);
  }

  _(step) {
    this.log(chalk.blue(`${step++}. build plugin: `), `npm run build`);
    if (!this._spawn('npm', 'run install')) {
      return this._abort();
    }
    return step;
  }

  _resolveType() {
    const options = this.fs.readJSON(this.destinationPath(`${this.cwd}/.yo-rc.json`), { })['generator-phovea'];
    return options ? options.type : 'unknown';
  }

  _retry(task, step) {
    return new Promise((resolve, reject) => {
      task(step)
        .then(resolve)
        .catch(() => {
          this.prompt({
          type: 'confirm',
          name: 'retry',
          message: chalk.red('Last Step Failed')+' Retry',
          default: true
        }).then((props) => {
          return props.retry ? this._retry(task, step) : reject('No Retry');
        });
      })
    });
  }

  _testWeb(step) {
    return Promise.resolve(step)
      .then(this._installNPM.bind(this))
      .then(this._retry(this._compile.bind(this)))
      .then(this._retry(this._lint.bind(this)))
      .then(this._retry(this._build.bind(this)));
  }

  _testServer(step) {
    // TODO
    return Promise.resolve(step);
  }

  writing() {
    return Promise.resolve(1)
      .then(this._cloneRepo.bind(this))
      .then(this._migrate.bind(this))
      .then(this._promptLoop.bind(this, chalk.red('Have you checked migration made sense?')))
      .then(this._commit.bind(this, 'yo phovea:migrate'))
      .then(this._migrateSource.bind(this))
      .then(this._promptLoop.bind(this, chalk.red('Have you checked source code migration made sense?')))
      .then(this._commit.bind(this, 'yo phovea:migrate-source'))
      .then((step) => {
        const type = this._resolveType();
        if (known.plugin.isTypeHybrid(type)) {
          return this._testWeb.then(this._testServer.bind(this));
        } else if (known.plugin.isTypeWeb(type)) {
          return this._testWeb(step);
        } else if (known.plugin.isTypeServer(type)) {
          return this._testServer(step);
        }
        return Promise.reject(`Unknown type: ${type} - Aborting`);
      })
      .catch((msg) => this.log(chalk.red(`Error: ${msg}`)))
  }
}

module.exports = Generator;
