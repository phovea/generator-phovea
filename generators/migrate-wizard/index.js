'use strict';
const Base = require('yeoman-generator').Base;
const chalk = require('chalk');
const known = require('../../utils/known');
const yeoman = require('yeoman-environment');

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

    this.option('reset', {
      alias: 'r',
      defaults: false,
      type: Boolean
    });

    this.argument('repo', {
      required: false
    });
  }

  initializing() {
    this.state = this.fs.readJSON(this.destinationPath('migrate-state.json'), {});
  }

  end() {
    this.fs.extendJSON(this.destinationPath('migrate-state.json'), {
      [this.cwd]: this.lastStep
    });
  }

  prompting() {
    return this.prompt([{
      type: 'input',
      name: 'repo',
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
      this.repo = props.repo || this.args[0];
      this.cwd = toPhoveaName(this.repo);
      this.cloneSSH = props.cloneSSH || this.options.ssh;

      this.lastStep = this.options.reset ? 0 : (this.state[this.cwd] || 0);
    });
  }

  _promptLoop(message, step) {
    // repeats the message till yes was selected
    return this.prompt({
      type: 'confirm',
      name: 'confirm',
      message: message,
      default: false
    }).then((props) => {
      return props.confirm ? step+1 : this._promptLoop(message, step);
    });
  }

  _spawn(cmd, argline, cwd) {
    const options = cwd === false ? {} : {cwd: this.cwd};
    return this.spawnCommandSync(cmd, Array.isArray(argline) ? argline : argline.split(' '), options);
  }

  _spawnOrAbort(next, cmd, argline, cwd) {
    const r = this._spawn(cmd, argline, cwd);
    if (failed(r)) {
      this.log(r);
      return this._abort('failed: ' + cmd);
    }
    return next;
  }

  _yo(next, generator) {
    // call yo internally
    const env = yeoman.createEnv([], {
      cwd: this.cwd
    }, this.env.adapter);
    env.register(require.resolve('../' + generator), 'phovea:' + generator);
    return new Promise((resolve, reject) => {
      try {
        this.log('running yo phovea:' + generator);
        env.run('phovea:' + generator, (result) => {
          this.log(result);
          resolve(next);
        });
      } catch (e) {
        console.error('error', e, e.stack);
        reject(e);
      }
    });
  }

  _abort(msg) {
    return Promise.reject(msg ? msg : 'Step Failed: Aborting');
  }

  _cloneRepo(step) {
    const repoUrl = this.cloneSSH ? `git@github.com:Caleydo/${this.repo}.git` : `https://github.com/Caleydo/${this.repo}.git`;
    this.log(chalk.blue(`${step++}. clone repository:`), `git clone ${repoUrl} ${this.cwd}`);
    return this._spawnOrAbort(step, 'git', ['clone', repoUrl, this.cwd], false);
  }

  _switchBranch(step) {
    this.log(chalk.blue(`${step++}. switch to migrate branch: `), `git checkout -b migrate`);
    return this._spawnOrAbort(step, 'git', 'checkout -b migrate');
  }

  _migrate(step) {
    this.log(chalk.blue(`${step++}. migrate structure:`), 'yo phovea:migrate');
    return this._yo(step, 'migrate');
  }

  _migrateSource(step) {
    this.log(chalk.blue(`${step++}. migrate source code:`), 'yo phovea:migrate-source');
    return this._yo(step, 'migrate-source');
  }

  _add(step) {
    this.log(chalk.blue(`${step++}. add all changes:`), `git add --all`);
    return this._spawnOrAbort(step, 'git', 'add --all');
  }

  _commit(message, step) {
    this.log(chalk.blue(`${step++}. commit all changes:`), `git commit -m "${message}"`);
    // http://stackoverflow.com/questions/5139290/how-to-check-if-theres-nothing-to-be-committed-in-the-current-branch
    if (failed(this._spawn('git', 'diff --cached --exit-code'))) {
      return this._spawnOrAbort(step, 'git', ['commit', '-m', message]);
    }
    this.log('nothing to commit');
    return step;
  }

  _installNPMPackages(step) {
    this.log(chalk.blue(`${step++}. run npm install:`), `npm install`);
    return this._spawnOrAbort(step, 'npm', 'install');
  }

  _runScript(script, step) {
    this.log(chalk.blue(`${step++}. ${script} plugin:`), `npm run ${script}`);
    return this._spawnOrAbort(step, 'npm', ['run', script]);
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

  _resolveType() {
    const options = this.fs.readJSON(this.destinationPath(`${this.cwd}/.yo-rc.json`), {})['generator-phovea'];
    return options ? options.type : 'unknown';
  }

  _retry(task, step) {
    return new Promise((resolve, reject) => {
      Promise.resolve(task(step))
        .then(resolve)
        .catch(() => {
          this.prompt({
            type: 'confirm',
            name: 'retry',
            message: chalk.red('Last Step Failed') + ' Retry',
            default: true
          }).then((props) => {
            return props.retry ? this._retry(task, step) : reject('No Retry');
          });
        });
    });
  }

  _testWeb(step) {
    const skipDone = (task) => this._skipDone.bind(this, task);
    const retry = (task) => this._retry.bind(this, task);

    return Promise.resolve(step)
      .then(skipDone(this._installNPMPackages.bind(this)))
      .then(skipDone(retry(this._compile.bind(this))))
      .then(skipDone(retry(this._lint.bind(this))))
      .then(retry(this._build.bind(this)));
  }

  _testServer(step) {
    // TODO
    return Promise.resolve(step);
  }

  _skipDone(task, step) {
    if (this.lastStep >= step) {
      this.log(chalk.blue(`${step++}. skip`));
      return Promise.resolve(step++);
    }
    return Promise.resolve(task(step)).then((nstep) => {
      this.lastStep = step;
      return nstep;
    });
  }

  writing() {
    const skipDone = (task) => this._skipDone.bind(this, task);

    return Promise.resolve(1)
      .then(skipDone(this._cloneRepo.bind(this)))
      .then(skipDone(this._switchBranch.bind(this)))
      .then(skipDone(this._migrate.bind(this)))
      .then(skipDone(this._promptLoop.bind(this, chalk.red('Have you checked migration made sense?'))))
      .then(skipDone(this._add.bind(this)))
      .then(skipDone(this._commit.bind(this, 'yo phovea:migrate')))
      .then(skipDone(this._migrateSource.bind(this)))
      .then(skipDone(this._promptLoop.bind(this, chalk.red('Have you checked source code migration made sense?'))))
      .then(skipDone(this._add.bind(this)))
      .then(skipDone(this._commit.bind(this, 'yo phovea:migrate-source')))
      .then((step) => {
        const type = this._resolveType();
        // need to wrap since it guesses it is a module
        if (known.plugin.isTypeHybrid({type})) {
          return this._testWeb.then(this._testServer.bind(this));
        } else if (known.plugin.isTypeWeb({type})) {
          return this._testWeb(step);
        } else if (known.plugin.isTypeServer({type})) {
          return this._testServer(step);
        }
        return Promise.reject(`Unknown type: ${type} - Aborting`);
      })
      .catch((msg) => this.log(chalk.red(`Error: ${msg}`)));
  }
}

module.exports = Generator;
