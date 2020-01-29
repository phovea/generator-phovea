
'use strict';
const BaseRelease = require('../../utils/BaseRelease');
const chalk = require('chalk');
// const knownRepositories = require('../../knownRepositories');
// const {toHTTPRepoUrl, toSSHRepoUrl, simplifyRepoUrl} = require('../../utils/repo');
// const opn = require('opn');
var rp = require('request-promise');
// const semver = require('semver');
// const {parseRequirements} = require('../../utils/pip');
const logSymbols = require('log-symbols');
// const {toBaseName, findBase, findName, toCWD, failed} = require('../../utils/release');


class Generator extends BaseRelease {
  constructor(args, options) {
    super(args, options)
    this.data = options.data
  }

  _publishToNpm() {
    //Context is inside the docker container
    //`cd /phovea`
    //`npm install`
    //`npm run build:web`
    //`npm login` Open question: Where do we we keep the npm login in circleci
    // `npm publish`
  }
  _publishToPip() {
    //Context is inside the docker container
    //`cd /phovea`
    //`sudo pip install -r requirements.txt && sudo pip install -r requirements_dev.txt && sudo pip install twine`
    //`npm run dist:python`
    //Ensure only two files are in the dist directory (*.whl and *.tar.gz)
    //Ensure that both files contain the new version number
    //`twine upload --repository-url https://upload.pypi.org/legacy/ dist/*`
    //`Login with caleydo-bot` Open question: Where do we we keep the npm login in circleci
    // `npm publish`
  }

  _publish() {
    //separate generators are gonna publish to npm or pip
    // const publishTo = this.data.publish
    // if (publishTo) {
    //   if (publishTo.npm) {
    //     this._publishToNpm()
    //   } else if (publishTo.pip) {
    //     this._publishToPip()
    //   }
    // } else {
    //   this._logVerbose(chalk.cyan(`Skipping publishing to Pip and npm`))
    // }
  }
  _createRelease() {
    this._logVerbose([chalk.cyan(`Drafting github release v${this.data.version} `), chalk.italic(`GET https://${this.data.gitUser}:**************************@api.github.com/repos/${this.data.repo}/releases`)]);
    const postOptions = {
      method: 'POST',
      uri: `https://${this.data.gitUser}:${this.data.accessToken.current}@api.github.com/repos/${this.data.repo}/releases`,
      body: {
        tag_name: 'vssss' + this.data.version,
        name: 'vssss' + this.data.version,
        body: this.data.changelog,
      },
      headers: {
        'User-Agent': 'request'
      },
      json: true
    }
    return rp(postOptions)
  }

  _checkoutBranch(branch, data) {
    const line = `checkout ${branch}`;
    this._logVerbose([chalk.cyan(`Checkout ${branch}:`), chalk.italic(`git ${line}`)]);
    return this._spawnOrAbort('git', line.split(' '), data.cwd, data);
  }

  _merge(branch, data) {
    const line = `merge ${branch}`;
    this._logVerbose([chalk.cyan(`Merge ${branch}:`), chalk.italic(`git ${line}`)]);
    return this._spawnOrAbort('git', line.split(' '), data.cwd, data);
  }

  _prepareNextDevPackage(data) {
    const pkg = this.fs.readJSON(`${data.cwd}/package.json`);
    pkg.version = data.nextDevVersion;

    Object.keys(data.dependencies.develop).forEach((dep) => {
      this.log(data.dependencies)
      pkg.dependencies[dep] = data.dependencies.develop[dep];
    });
    this.fs.writeJSON(`${data.cwd}/package.json`, pkg);

    if (data.requirements) {
      this.log(data.requirements)
      this.fs.write(this.destinationPath(data.cwd + '/requirements.txt'), this.data.requirements.develop.join('\n'));
    }

    return new Promise((resolve) => this.fs.commit(resolve)).then(() => {
      const line = `commit -am "prepare next develop version ${chalk.cyan.bold(data.nextDevVersion)}"`;
      this._logVerbose([chalk.cyan(`Commit changes:`), chalk.italic(`git ${line}`)]);
      return this._spawnOrAbort('git', ['commit', '-am', `prepare next development version ${data.nextDevVersion}`], data.cwd, data);
    });
  }
  _pushBranch(branch, ctx) {
    const line = `push origin ${branch}`;
    const options = {cwd: ctx.cwd, stdio: ['inherit', 'pipe', 'pipe']};
    this._logVerbose([chalk.cyan(`Push branch:`), chalk.italic(`git ${line}`)]);
    return this.spawnCommandSync('git', line.split(' '), options);
  }

  writing() {
    Promise.resolve(1)
      // .then(() => this._publish())//TODO
      // .then(() => this._createRelease())//Done!
      .then(() => this._checkoutBranch('-t origin/master', this.data))
      .then(() => this._checkoutBranch('develop', this.data))
      .then(() => this._merge('origin/master', this.data))
      .then(() => this._prepareNextDevPackage(this.data))
      .then(() => this._pushBranch('develop', this.data))
    //.then(()=>this._pushToDevelop())
  }
}

module.exports = Generator;
