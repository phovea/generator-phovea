'use strict';
const Base = require('yeoman-generator').Base;
const chalk = require('chalk');


function toBaseName(name) {
  if (name.includes('/')) {
    return name;
  }
  return `Caleydo/${name}`;
}

function toProductFile(basename) {
  return `https://rawgit.com/${basename}/master/phovea_product.js`
}

function toCWD(basename) {
  const match = basename.match(/.*\/(.*)(_product)?/)[1];
  console.log(basename, match);
  return match
}


class Generator extends Base {

  constructor(args, options) {
    super(args, options);

    this.argument('product', {
      required: true
    });
  }

  initializing() {
    const base = toBaseName(this.args[0]);
    this.props = {
      base,
      productFile: toProductFile(base)
    };
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

      this.lastStep = this.options.reset ? 0 : (this.state[this.cwd] || 0);
    });
  }

  _getProduct() {
    const https = require('https');
    const productFile = toProductFile(this.productName);
    return new Promise((resolve) => {
      https.get(productFile, (res) => {
        res.on('data', (data) => {
          this.product = vm.runInThisContext(data, 'product_file.js');
          resolve(this.product);
        });
      });
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
      // this.log(r);
      return this._abort('failed: ' + cmd + ' - status code: ' + r.status);
    }
  }

  _cloneRepo(repo, branch) {
    const repoUrl = this.cloneSSH ? `git@github.com:${repo}.git` : `https://github.com/${repo}.git`;
    this.log(chalk.blue(`clone repository:`), `git clone -b ${branch} ${repoUrl}`);
    return this._spawnOrAbort('git', ['clone', '-b', branch, repoUrl]);
  }

  _mkdir() {
    return this._spawnOrAbort('mkdir', this.cwd, false);
  }

  writing() {
    return Promise.resolve(1)
      .then(this._mkdir.bind(this))
      .then(this._getProduct().bind(this))
      .then((product) => {
        const repos = [];
        product.forEach((p) => {
          repos.push({
            repo: p.repo || 'phovea/' + p.name,
            branch: p.branch || 'master',
          });
          (p.additional || []).forEach((pi) => {
            repos.push({
              repo: pi.repo || 'phovea/' + pi.name,
              branch: pi.branch || 'master',
            });
          })
        });
        return repos;
      })
      .then((repos) => Promise.all(repos.map((r) => this._cloneRepo(r.repo, r.branch))))
      .then(this._yo.bind('workspace'))
      .catch((msg) => this.log(chalk.red(`Error: ${msg}`)));
  }
}

module.exports = Generator;
