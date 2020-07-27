'use strict';
const Base = require('yeoman-generator');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const yeoman = require('yeoman-environment');
const {
  toHTTPRepoUrl,
  toSSHRepoUrl,
  simplifyRepoUrl
} = require('../../utils/repo');

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
      return p.repo.slice(p.repo.lastIndexOf('/') + 1).replace('.git', '');
    }
  }
  return null;
}

function downloadFileImpl(url, dest) {
  const http = require(url.startsWith('https') ? 'https' : 'http');
  console.log(chalk.blue('Download file', url));
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

  initializing() {
    this.composeWith(['phovea:_check-own-version', 'phovea:check-node-version']);
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

  _yo(generator, options, args) {
    // call yo internally
    const env = yeoman.createEnv([], {
      cwd: this.cwd
    }, this.env.adapter);
    const _args = Array.isArray(args) ? args.join(' ') : args || '';
    return new Promise((resolve, reject) => {
      try {
        this.log(`Running: yo phovea:${generator} ${_args}`);
        env.lookup(() => {
          env.run(`phovea:${generator} ${_args}`, options || {}, () => {
            // wait a second after running yo to commit the files correctly
            setTimeout(() => resolve(), 500);
          });
        });
      } catch (e) {
        console.error('Error', e, e.stack);
        reject(e);
      }
    });
  }

  _abort(msg) {
    return Promise.reject(msg ? msg : 'Step Failed: Aborting');
  }

  _spawn(cmd, argline, cwd) {
    const options = cwd === false ? {} : Object.assign({
      cwd: this.cwd,
      stdio: 'inherit' // log output and error of spawned process to host process
    }, cwd || {});

    this.log(`\nRunning: ${cmd} ${argline}\n`);
    return this.spawnCommandSync(cmd, Array.isArray(argline) ? argline : argline.split(' '), options);
  }

  _spawnOrAbort(cmd, argline, cwd) {
    const r = this._spawn(cmd, argline, cwd);
    if (failed(r)) {
      this.log(r.stderr.toString());
      return this._abort(`Failed: "${cmd} ${Array.isArray(argline) ? argline.join(' ') : argline}" - status code: ${r.status}`);
    } else if(r.stdout) {
      this.log(r.stdout.toString());
    }
    return Promise.resolve(cmd);
  }

  _cloneRepo(repo, branch, extras) {
    const repoUrl = this.cloneSSH ? toSSHRepoUrl(repo) : toHTTPRepoUrl(repo);
    return this._yo(`clone-repo`, {
      branch,
      extras: extras || '',
      cwd: this.cwd
    }, repoUrl); // repository URL as argument
  }

  _getProduct() {
    return this._cloneRepo(this.productName, this.options.branch || 'master', ' --depth 1')
      .then(() => {
        const name = this.productName.slice(this.productName.lastIndexOf('/') + 1);
        const phoveaProductJSON = `${this.cwd}/${name}/phovea_product.json`;

        if(!fs.existsSync(phoveaProductJSON)) {
          throw new Error('No phovea_product.json file found! Did you enter a valid phovea product repository?');
        }

        this.product = fs.readJSONSync(phoveaProductJSON);

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
          const defaultAppName = baseRepo.slice(baseRepo.lastIndexOf('/') + 1);
          this.defaultApp = defaultAppName;
          fs.writeJsonSync(this.destinationPath(`${this.cwd}/.yo-rc-workspace.json`), {
            modules: [],
            defaultApp: defaultAppName,
            frontendRepos: defaultApp.additional.map((repo) => repo.name),
            devRepos: [defaultAppName]
          }, {spaces: 2});
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
    this.log('Create directory: ' + dir);
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
        this.log(chalk.red('Cannot handle data type:', desc.type));
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
        this.log(chalk.red('Cannot handle data type:', desc.type));
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
    this.hasErrors = false;

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
      .then(this._yo.bind(this, 'workspace', {
        defaultApp: findDefaultApp(),
        skipNextStepsLog: true // skip "next steps" logs from yo phovea:workspace
      }))
      .then(this._customizeWorkspace.bind(this))
      .then(this._downloadDataFiles.bind(this))
      .then(() => this.options.skip.includes('install') ? null : this._spawnOrAbort('npm', 'install'))
      .then(this._downloadBackupFiles.bind(this))
      .then(() => {
        const l = this.fs.read(this.destinationPath(`${this.cwd}/docker-compose.yml`), {
          defaults: ''
        });
        if (l.trim().length > 0 && !this.options.skip.includes('build')) {
          return this._ifExecutable('docker-compose', this._spawnOrAbort.bind(this, 'docker-compose', 'build'), ' please run "docker-compose build" manually"');
        }
        return null;
      })
      .catch((msg) => {
        this.log('\r\n');
        this.log(chalk.red(msg));
        this.hasErrors = true;
      });
  }

  end() {
    if(this.hasErrors) {
      return; // skip next steps on errors
    }

    let stepCounter = 1;

    this.log('\n\nNext steps: ');

    this.log(chalk.green((stepCounter++) + '. Switch to the created directory: '), chalk.yellow(`cd ${this.cwd}`));

    if (this.options.skip.includes('install')) {
      this.log(chalk.green((stepCounter++) + '. Install npm dependencies: '), chalk.yellow('npm install'));
    }

    if (this.options.skip.includes('build')) {
      this.log(chalk.green((stepCounter++) + '. Build docker containers: '), chalk.yellow('docker-compose build'));
    }

    this.log(chalk.green((stepCounter++) + '. Open IDE (PyCharm or Visual Studio Code, Atom) and select:'), this.destinationPath(this.cwd));
    this.log(chalk.green('   In case of Visual Studio Code, the following should also work: '), chalk.yellow('code .'));
    this.log(chalk.green((stepCounter++) + '. Start server docker container in the background (-d): '), chalk.yellow('docker-compose up -d'));
    this.log(chalk.green((stepCounter++) + '. Start client application in the foreground: '), chalk.yellow('npm start'));
    this.log(chalk.green((stepCounter++) + '. Open web browser and navigate to'), chalk.yellow('http://localhost:8080'));

    this.log('\n\nUseful commands: ');

    this.log(chalk.red(' docker-compose up'), '                    ... starts the system');
    this.log(chalk.red(' docker-compose restart'), '               ... restart');
    this.log(chalk.red(' docker-compose stop'), '                  ... stop');
    this.log(chalk.red(' docker-compose build api'), '             ... rebuild api (in case of new dependencies)');
    this.log(chalk.red(' docker-compose logs -f --tail=50 api'), ' ... show the last 50 server log messages (-f to auto update)');
  }
}

module.exports = Generator;
