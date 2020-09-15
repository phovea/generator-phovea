'use strict';
const Base = require('yeoman-generator');
const chalk = require('chalk');
const RepoUtils = require('../../utils/RepoUtils');
const NpmUtils = require('../../utils/NpmUtils');
const SpawnUtils = require('../../utils/SpawnUtils');

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
    this.composeWith(['phovea:_check-own-version', 'phovea:check-node-version']);
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
    if (!NpmUtils.isGitCommit(branch)) {
      // modify branch name, if it is an advance version tag
      // otherwise just use the branch name as it is
      if (NpmUtils.isAdvancedVersionTag(branch)) {
        this.log(chalk.white(`found branch with version range`), chalk.green(branch), chalk.white(`for`), chalk.green(repoUrl));

        const line = `ls-remote --tags ${repoUrl}`;
        this.log(chalk.white(`fetching possible version tags:`), `git ${line}`);
        const r = SpawnUtils.spawn('git', line.split(/ +/), this.cwd);

        if (SpawnUtils.failed(r)) {
          this.log(chalk.red(`failed to fetch list of tags from git repository`), `status code: ${r.status}`);
          this.log(r.stderr.toString());
          return SpawnUtils.abort(`failed to fetch list of tags from git repository - status code: ${r.status}`);
        }

        const gitLog = r.stdout.toString();
        const gitVersions = NpmUtils.extractVersionsFromGitLog(gitLog);
        this.log(chalk.white(`found the following version tags: `), gitVersions);

        const highestVersion = NpmUtils.findHighestVersion(gitVersions, branch);
        if (!highestVersion) {
          this.log(chalk.red(`failed to find git version tag for given version range`));
          return SpawnUtils.abort(`failed to find git version tag for given version range`);
        }

        this.log(chalk.white(`use version tag`), chalk.green(highestVersion), chalk.white(`as branch name`));
        branch = highestVersion;
      }

      const line = `clone -b ${branch}${extras || ''} ${repoUrl}${cloneDirName}`;
      this.log(chalk.white(`clone repository:`), `git ${line}`);
      return SpawnUtils.spawnOrAbort('git', line.split(/ +/), this.cwd);
    }
    // clone a specific commit
    const line = `clone ${extras || ''} ${repoUrl}${cloneDirName}`;
    this.log(chalk.white(`clone repository:`), `git ${line}`);
    return SpawnUtils.spawnOrAbort('git', line.split(/ +/), this.cwd).then(() => {
      const line = `checkout ${branch}`;
      this.log(chalk.white(`checkout commit:`), `git ${line}`);
      let repoName = RepoUtils.simplifyRepoUrl(repoUrl);
      repoName = repoName.slice(repoName.lastIndexOf('/') + 1);
      return SpawnUtils.spawnOrAbort('git', line.split(/ +/), {
        cwd: `${this.cwd}/${repoName}`
      });
    });
  }

}

module.exports = Generator;
