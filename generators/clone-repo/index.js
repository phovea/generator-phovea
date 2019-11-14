'use strict';
const Base = require('yeoman-generator');
const chalk = require('chalk');
const {
  simplifyRepoUrl
} = require('../../utils/repo');
const version = require('../../utils/version');

function failed(spawnResult) {
  return spawnResult.status !== 0;
}

/**
 * Clone a given repository and supports version ranges for git tags.
 * @see https://docs.npmjs.com/misc/semver#advanced-range-syntax
 */
class Generator extends Base {

  constructor(args, options) {
    super(args, options);

    this.argument('repository', {
      alias: 'r',
      defaults: '',
      type: String,
      required: true
    });

    // Note for Windows Powershell
    // Using caret version range like `-b '^v2.0.0'` does not work!
    // Instead you must escape the caret sign as explained in
    // https://stackoverflow.com/a/5254713/940219
    // Correct version: `-b '^^^^v2.0.0'`
    this.option('branch', {
      alias: 'b',
      defaults: 'master',
      required: false,
      type: String
    });

    // Note for Windows Powershell
    // Using `-e '--depth 1'` does not work!
    // Instead add an additional space at the beginning
    // to the argument value: `-e ' --depth 1'`
    this.option('extras', {
      alias: 'e',
      defaults: '',
      type: String
    });

    // no prompt implemented
    this.option('cwd', {
      defaults: '',
      type: String
    });

    // no prompt implemented
    this.option('dir', {
      alias: 'd',
      defaults: '',
      type: String
    });
  }

  initializing() {
    this.composeWith('phovea:check-node-version', {
      local: require.resolve('../check-node-version')
    });

    this.composeWith('phovea:_generator-version', {
      local: require.resolve('../_generator-version')
    });
  }

  prompting() {
    return this.prompt([{
      type: 'input',
      name: 'repository',
      message: 'Repository URL',
      required: true,
      default: this.args.length > 0 ? this.args[0] : undefined,
      when: this.args.length === 0,
      validate: (d) => d.length > 0
    }, {
      type: 'input',
      name: 'branch',
      message: 'Git branch or tag',
      required: true,
      default: this.options.branch,
      when: this.options.branch === '',
      validate: (d) => d.length > 0
    }, {
      type: 'input',
      name: 'extras',
      message: 'Additional git clone parameters',
      required: false,
      default: this.options.extras || undefined,
      when: this.options.extras === undefined
    }]).then((props) => {
      this.cwd = this.options.cwd || undefined;
      this.cloneDirName = (this.options.dir === '') ? this.options.dir : ` ${this.options.dir}`; // add space at the beginning
      this.options.repository = props.repository || this.args[0];
      this.options.branch = props.branch || this.options.branch;
      this.options.extras = props.extras || this.options.extras;
      this.options.extras = (this.options.extras === '') ? this.options.extras : ` ${this.options.extras}`; // add space at the beginning
    });
  }

  writing() {
    return this._cloneRepo(this.options.repository, this.options.branch, this.options.extras, this.cloneDirName);
  }

  _cloneRepo(repoUrl, branch, extras, cloneDirName) {
    if (!version.isGitCommit(branch)) {
      // modify branch name, if it is an advance version tag
      // otherwise just use the branch name as it is
      if (version.isAdvancedVersionTag(branch)) {
        this.log(chalk.white(`found branch with version range`), chalk.green(branch), chalk.white(`for`), chalk.green(repoUrl));

        const line = `ls-remote --tags ${repoUrl}`;
        this.log(chalk.white(`fetching possible version tags:`), `git ${line}`);
        const r = this._spawn('git', line.split(/ +/));

        if (failed(r)) {
          this.log(chalk.red(`failed to fetch list of tags from git repository`), `status code: ${r.status}`);
          this.log(r.stderr.toString());
          return this._abort(`failed to fetch list of tags from git repository - status code: ${r.status}`);
        }

        const gitLog = r.stdout.toString();
        const gitVersions = version.extractVersionsFromGitLog(gitLog);
        this.log(chalk.white(`found the following version tags: `), gitVersions);

        const highestVersion = version.findHighestVersion(gitVersions, branch);
        if (!highestVersion) {
          this.log(chalk.red(`failed to find git version tag for given version range`));
          return this._abort(`failed to find git version tag for given version range`);
        }

        this.log(chalk.white(`use version tag`), chalk.green(highestVersion), chalk.white(`as branch name`));
        branch = highestVersion;
      }

      const line = `clone -b ${branch}${extras || ''} ${repoUrl}${cloneDirName}`;
      this.log(chalk.white(`clone repository:`), `git ${line}`);
      return this._spawnOrAbort('git', line.split(/ +/));
    }
    // clone a specific commit
    const line = `clone ${extras || ''} ${repoUrl}${cloneDirName}`;
    this.log(chalk.white(`clone repository:`), `git ${line}`);
    return this._spawnOrAbort('git', line.split(/ +/)).then(() => {
      const line = `checkout ${branch}`;
      this.log(chalk.white(`checkout commit:`), `git ${line}`);
      let repoName = simplifyRepoUrl(repoUrl);
      repoName = repoName.slice(repoName.lastIndexOf('/') + 1);
      return this._spawnOrAbort('git', line.split(/ +/), {
        cwd: `${this.cwd}/${repoName}`
      });
    });
  }

  _abort(msg) {
    return Promise.reject(msg ? msg : 'Step Failed: Aborting');
  }

  _spawn(cmd, argline, cwd) {
    const options = cwd === false ? {} : Object.assign({
      cwd: this.cwd,
      stdio: ['inherit', 'pipe', 'pipe'] // pipe `stdout` and `stderr` to host process
    }, cwd || {});
    return this.spawnCommandSync(cmd, Array.isArray(argline) ? argline : argline.split(' '), options);
  }

  _spawnOrAbort(cmd, argline, cwd) {
    const r = this._spawn(cmd, argline, cwd);
    if (failed(r)) {
      this.log(r.stderr.toString());
      return this._abort(`failed: "${cmd} ${Array.isArray(argline) ? argline.join(' ') : argline}" - status code: ${r.status}`);
    }
    return Promise.resolve(r);
  }

}

module.exports = Generator;
