'use strict';
const Base = require('yeoman-generator').Base;
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const yeoman = require('yeoman-environment');
const {toHTTPRepoUrl, toSSHRepoUrl, simplifyRepoUrl} = require('../../utils/repo');

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
    return null;
  }
  for (let p of product) {
    if (p.type === 'web') {
      return p.repo.slice(p.repo.lastIndexOf('/') + 1);
    }
  }
  return null;
}

function downloadFileImpl(url, dest) {
  const http = require(url.startsWith('https') ? 'https' : 'http');
  console.log(chalk.blue('download file', url));
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    http.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', reject);
  });
}

function downloadDataUrl(url, dest) {
  if (!url.startsWith('http')) {
    url = `https://s3.eu-central-1.amazonaws.com/phovea-data-packages/${url}`;
  }
  return downloadFileImpl(url, dest);
}

function downloadBackupUrl(url, dest) {
  if (!url.startsWith('http')) {
    url = `https://s3.eu-central-1.amazonaws.com/phovea-volume-backups/${url}`;
  }
  return downloadFileImpl(url, dest);
}

function toDownloadName(url) {
  if (!url.startsWith('http')) {
    return url;
  }
  return url.substring(url.lastIndexOf('/') + 1);
}

class Generator extends Base {

  constructor(args, options) {
    super(args, options);

    this.option('ssh', {
      alias: 's',
      defaults: false,
      type: Boolean
    });

    this.option('branch', {
      alias: 'b',
      defaults: 'master',
      type: String
    });

    this.option('skip', {
      defaults: '',
      type: String
    });

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

  _yo(generator, options) {
    // call yo internally
    const env = yeoman.createEnv([], {
      cwd: this.cwd
    }, this.env.adapter);
    env.register(require.resolve('../' + generator), 'phovea:' + generator);
    return new Promise((resolve, reject) => {
      try {
        this.log('running yo phovea:' + generator);
        env.run('phovea:' + generator, options || {}, () => {
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
    const options = cwd === false ? {} : Object.assign({cwd: this.cwd}, cwd || {});
    return this.spawnCommandSync(cmd, Array.isArray(argline) ? argline : argline.split(' '), options);
  }

  _spawnOrAbort(cmd, argline, cwd) {
    const r = this._spawn(cmd, argline, cwd);
    if (failed(r)) {
      this.log(r);
      return this._abort(`failed: "${cmd} ${argline.join(' ')}" - status code: ${r.status}`);
    }
    return Promise.resolve(cmd);
  }

  _cloneRepo(repo, branch, extras) {
    const repoUrl = this.cloneSSH ? toSSHRepoUrl(repo) : toHTTPRepoUrl(repo);
    if (!/^[0-9a-f]+$/gi.test(branch)) {
      // regular branch
      const line = `clone -b ${branch}${extras || ''} ${repoUrl}`;
      this.log(chalk.blue(`clone repository:`), `git ${line}`);
      return this._spawnOrAbort('git', line.split(/ +/));
    }
    // clone a specific commit
    const line = `clone ${extras || ''} ${repoUrl}`;
    this.log(chalk.blue(`clone repository:`), `git ${line}`);
    return this._spawnOrAbort('git', line.split(/ +/)).then(() => {
      const line = `checkout ${branch}`;
      this.log(chalk.blue(`checkout commit:`), `git ${line}`);
      return this._spawnOrAbort('git', line.split(/ +/));
    });
  }

  _getProduct() {
    return this._cloneRepo(this.productName, this.options.branch || 'master', ' --depth 1')
      .then(() => {
        const name = this.productName.slice(this.productName.lastIndexOf('/') + 1);
        this.product = fs.readJSONSync(`${this.cwd}/${name}/phovea_product.json`);

        // pass through the docker overrides
        for (const file of ['docker-compose-patch.yaml', 'docker-compose-patch.yml']) {
          if (fs.existsSync(`${this.cwd}/${name}/${file}`)) {
            fs.copySync(`${this.cwd}/${name}/${file}`, this.destinationPath(`${this.cwd}/${file}`));
          }
        }
        if (fs.existsSync(`${this.cwd}/${name}/docker_script.sh`)) {
          fs.copySync(`${this.cwd}/${name}/docker_script.sh`, this.destinationPath(`${this.cwd}/docker_script_patch.sh`));
        }
        // generic copy helper
        if (fs.existsSync(`${this.cwd}/${name}/ws`)) {
          fs.copySync(`${this.cwd}/${name}/ws`, this.destinationPath(`${this.cwd}`));
        }

        const defaultApp = this.product.find((v) => v.type === 'web');
        if (defaultApp) {
          const baseRepo = simplifyRepoUrl(defaultApp.repo);
          fs.writeJsonSync(this.destinationPath(`${this.cwd}/.yo-rc-workspace.json`), {
            modules: [],
            defaultApp: baseRepo.slice(baseRepo.lastIndexOf('/') + 1)
          });
        }

        return this.product;
      }).then((product) => {
        const name = this.productName.slice(this.productName.lastIndexOf('/') + 1);
        // clean up again
        fs.removeSync(`${this.cwd}/${name}`);
        return product;
      });
  }

  _mkdir(dir) {
    dir = dir || this.cwd;
    this.log('create directory: ' + dir);
    return new Promise((resolve) => fs.ensureDir(dir, resolve));
  }

  _customizeWorkspace() {
    const defaultApp = findDefaultApp(this.product);
    if (defaultApp) {
      this.fs.copyTpl(this.templatePath('start_defaultapp.tmpl.xml'), this.destinationPath(`${this.cwd}/.idea/runConfigurations/start_${defaultApp}.xml`), {
        defaultApp: defaultApp
      });
      this.fs.copyTpl(this.templatePath('lint_defaultapp.tmpl.xml'), this.destinationPath(`${this.cwd}/.idea/runConfigurations/lint_${defaultApp}.xml`), {
        defaultApp: defaultApp
      });
    }
  }

  _downloadDataFile(desc, destDir) {
    if (typeof desc === 'string') {
      desc = {
        type: 'url',
        url: desc
      };
    }
    switch (desc.type) {
      case 'url':
        return downloadDataUrl(desc.url, path.join(destDir, toDownloadName(desc.url)));
      default:
        this.log(chalk.red('cannot handle data type:', desc.type));
        return null;
    }
  }

  _downloadBackupFile(desc, destDir) {
    if (typeof desc === 'string') {
      desc = {
        type: 'url',
        url: desc
      };
    }
    switch (desc.type) {
      case 'url':
        return downloadBackupUrl(desc.url, path.join(destDir, toDownloadName(desc.url)));
      default:
        this.log(chalk.red('cannot handle data type:', desc.type));
        return null;
    }
  }

  _downloadDataFiles() {
    const data = [];
    this.product.forEach((p) => {
      if (p.data) {
        data.push(...p.data);
      }
    });
    if (data.length === 0) {
      return Promise.resolve(null);
    }
    return this._mkdir(this.cwd + '/_data')
      .then(() => Promise.all(data.map((d) => this._downloadDataFile(d, this.cwd + '/_data'))));
  }

  _downloadBackupFiles() {
    const data = [];
    this.product.forEach((p) => {
      if (p.backup) {
        data.push(...p.backup);
      }
    });
    if (data.length === 0) {
      return Promise.resolve(null);
    }
    return this._mkdir(this.cwd + '/_backup')
      .then(() => Promise.all(data.map((d) => this._downloadBackupFile(d, this.cwd + '/_backup'))))
      .then(this._ifExecutable.bind(this, 'docker-compose', this._spawnOrAbort.bind(this, './docker-backup', 'restore'), 'please execute: "./docker-backup restore" manually'));
  }

  _ifExecutable(cmd, ifExists, extraMessage = '') {
    const paths = process.env.PATH.split(path.delimiter);
    const pathExt = (process.env.PATHEXT || '').split(path.delimiter);

    const findIt = () => {
      for (const p of paths) {
        for (const ext of pathExt) {
          const fullPath = `${p}${path.sep}${cmd}${ext}`;
          if (fs.existsSync(fullPath)) {
            this.log(`found ${cmd} at ${fullPath}`);
            return true;
          }
        }
      }
      return false;
    };

    if (!findIt()) {
      this.log(chalk.red(`Error: ${cmd} not found${extraMessage}`));
      return Promise.resolve(null);
    }
    return ifExists();
  }

  writing() {
    return Promise.resolve(1)
      .then(this._mkdir.bind(this, null))
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
      .then(this._yo.bind(this, 'workspace', {defaultApp: findDefaultApp()}))
      .then(this._customizeWorkspace.bind(this))
      .then(this._downloadDataFiles.bind(this))
      .then(() => this.options.skip.includes('install') ? null : this._spawnOrAbort('npm', 'install'))
      .then(this._downloadBackupFiles.bind(this))
      .then(() => {
        const l = this.fs.read(this.destinationPath(`${this.cwd}/docker-compose.yml`), {defaults: ''});
        if (l.trim().length > 0 && !this.options.skip.includes('build')) {
          return this._ifExecutable('docker-compose', this._spawnOrAbort.bind(this, 'docker-compose', 'build'), ' please run "docker-compose build" manually"');
        }
        return null;
      })
      .catch((msg) => {
        this.log(chalk.red(`Error: ${msg}`));
        return Promise.reject(msg);
      });
  }

  end() {
    this.log('\n\nnext steps: ');
    this.log(chalk.yellow(` cd ${this.cwd}`));
    this.log(chalk.green(' Open PyCharm and select:'), this.destinationPath(this.cwd));
    this.log(chalk.yellow(' docker-compose up -d'));
    this.log(chalk.yellow(` npm run start:${findDefaultApp(this.product)}`));
  }
}

module.exports = Generator;
