'use strict';
const Base = require('yeoman-generator').Base;
const chalk = require('chalk');
const yeoman = require('yeoman-environment');

function toBaseName(name) {
  if (name.includes('/')) {
    return name;
  }
  return `Caleydo/${name}`;
}

function failed(spawnResult) {
  return spawnResult.status !== 0;
}

function toCWD(basename) {
  let match = basename.match(/.*\/(.*)/)[1];
  if (match.endsWith('_product')) {
    match = match.slice(0, -8);
  }
  return match;
}

function findDefaultApp(product) {
  if (!product) {
    return '???';
  }
  for (let p of product) {
    if (p.type === 'web') {
      return p.repo.slice(p.repo.lastIndexOf('/') + 1);
    }
  }
  return '???';
}

class Generator extends Base {

  constructor(args, options) {
    super(args, options);

    this.argument('product', {
      required: true
    });
  }

  prompting() {
    return this.prompt([{
      type: 'input',
      name: 'productName',
      message: 'Product',
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
      this.productName = toBaseName(props.productName || this.args[0]);
      this.cwd = toCWD(this.productName);
      this.cloneSSH = props.cloneSSH || this.options.ssh;
    });
  }

  _yo(generator) {
    // call yo internally
    const env = yeoman.createEnv([], {
      cwd: this.cwd
    }, this.env.adapter);
    env.register(require.resolve('../' + generator), 'phovea:' + generator);
    return new Promise((resolve, reject) => {
      try {
        this.log('running yo phovea:' + generator);
        env.run('phovea:' + generator, () => {
          // wait a second after running yo to commit the files correctly
          setTimeout(() => resolve(), 500);
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

  _spawn(cmd, argline, cwd) {
    const options = cwd === false ? {} : {cwd: this.cwd};
    return this.spawnCommandSync(cmd, Array.isArray(argline) ? argline : argline.split(' '), options);
  }

  _spawnOrAbort(cmd, argline, cwd) {
    const r = this._spawn(cmd, argline, cwd);
    if (failed(r)) {
      this.log(r);
      return this._abort('failed: ' + cmd + ' - status code: ' + r.status);
    }
    return Promise.resolve(cmd);
  }

  _cloneRepo(repo, branch, extras) {
    const repoUrl = this.cloneSSH ? `git@github.com:${repo}.git` : `https://github.com/${repo}.git`;
    const line = `clone -b ${branch}${extras || ''} ${repoUrl}`;
    this.log(chalk.blue(`clone repository:`), `git ${line}`);
    return this._spawnOrAbort('git', line.split(' '));
  }

  _getProduct() {
    return this._cloneRepo(this.productName, 'master', ' --depth 1')
      .then(() => {
        const name = this.productName.slice(this.productName.lastIndexOf('/') + 1);
        this.product = this.fs.readJSON(this.destinationPath(`${this.cwd}/${name}/phovea_product.json`));
        return this.product;
      }).then((product) => {
        const name = this.productName.slice(this.productName.lastIndexOf('/') + 1);
        // clean up again
        this.fs.delete(this.destinationPath(`${this.cwd}/${name}`));
        return product;
      });
  }

  _mkdir() {
    return this._spawn('mkdir', this.cwd, false);
  }

  _customizeWorkspace() {
    this.fs.copyTpl(this.templatePath('workspace.tmpl.xml'), this.destinationPath(`${this.cwd}/.idea/workspace.xml`), {
      defaultApp: findDefaultApp(this.product)
    });
  }

  writing() {
    return Promise.resolve(1)
      .then(this._mkdir.bind(this))
      .then(this._getProduct.bind(this))
      .then((product) => {
        const names = new Set();
        const repos = [];
        product.forEach((p) => {
          const repo = p.repo || 'phovea/' + p.name;
          if (!names.has(repo)) {
            names.add(repo);
            repos.push({
              repo,
              branch: p.branch || 'master'
            });
          }
          (p.additional || []).forEach((pi) => {
            const repo = pi.repo || 'phovea/' + pi.name;
            if (!names.has(repo)) {
              names.add(repo);
              repos.push({
                repo,
                branch: pi.branch || 'master'
              });
            }
          });
        });
        return repos;
      })
      .then((repos) => Promise.all(repos.map((r) => this._cloneRepo(r.repo, r.branch))))
      .then(this._yo.bind(this, 'workspace'))
      .then(this._customizeWorkspace.bind(this))
      .then(this._spawnOrAbort.bind(this, 'npm', 'install'))
      .then(this._spawnOrAbort.bind(this, 'docker-compose', 'build'))
      .catch((msg) => {
        this.log(chalk.red(`Error: ${msg}`));
        return Promise.reject(msg);
      });
  }

  end() {
    this.log('\n\nnext steps: ');
    this.log(chalk.green(' Open PyCharm and select:'), this.destinationPath(this.cwd));
    this.log(chalk.yellow(' docker-compose up -d'));
    this.log(chalk.yellow(` npm run start:${findDefaultApp(this.product)}`));
  }
}

module.exports = Generator;
