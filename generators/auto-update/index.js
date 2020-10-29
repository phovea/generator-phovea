'use strict';
const Base = require('yeoman-generator');
const fse = require('fs-extra');
const AutoUpdateUtils = require('./AutoUpdateUtils');
const path = require('path');
const parse = require('csv-parse/lib/sync');
const WorkspaceUtils = require('../../utils/WorkspaceUtils');
const tmp = require('tmp');
const SpawnUtils = require('../../utils/SpawnUtils');
const RepoUtils = require('../../utils/RepoUtils');
const GithubRestUtils = require('./GithubRestUtils');

const {decrementVersion} = require('../../utils/NpmUtils');
const ora = require('ora');

class Generator extends Base {
    constructor(args, options) {
        super(args, Object.assign(options, {
            skipLocalCache: true // prevents store prompts from being saved in the local `.yo-rc.json`
        }));

        // this.option('verbose', {
        //     defaults: false,
        //     required: false,
        //     type: Boolean
        // });
        this.spinner = ora();
    }

    initializing() {
        this.composeWith(['phovea:_check-own-version', 'phovea:check-node-version']);
    }

    async prompting() {
        return this.prompt([
            {
                type: 'input',
                name: 'knownReposFile',
                message: 'Path to the known repos file',
                default: '/workspaces/releases/repositories.csv',
                required: true,
                store: true,
                when: this.args.length === 0,
                validate: (d) => d.trim().length > 0
            }
        ]).then(({knownReposFile}) => {
            this.knownRepos = this._readKnownReposFile(knownReposFile);
            this.generatorVersion = require('../../package.json').version.replace('-SNAPSHOT', '');
        });
    }

    _readKnownReposFile(file) {
        if (!fse.existsSync(file)) {
            this.env.error('Given file cannot be read: ' + file);
        }
        const records = parse(fse.readFileSync(file), {
            columns: true,
            skip_empty_lines: true
        });
        return Object.assign({}, ...records.map((item) => (
            {
                [item.name]: {
                    org: RepoUtils.getOrganization(item.link),
                    ...item
                }
            })));
    }

    async writing() {
        this.cwd = this.destinationPath();
        const repos = Object.keys(this.knownRepos);
        const logFile = await Promise.allSettled(repos.map(async (repo) => {
            this.spinner.stop();
            const repoDir = path.join(this.cwd, repo);
            const {link, org} = this.knownRepos[repo];
            const baseName = `${org}/${repo}`;

            // readToken depeneding on organization
            await WorkspaceUtils.cloneRepo(link, 'develop', null, '', this.cwd);

            const [localVersion = decrementVersion(this.generatorVersion), type] = [
                AutoUpdateUtils.readConfig('localVersion', repoDir),
                AutoUpdateUtils.readConfig('type', repoDir)
            ];

            const branch = `generator_update/${localVersion}_to_${this.generatorVersion}`;
            await SpawnUtils.spawnOrAbort('git', ['checkout', '-b', branch], repoDir, this.options.verbose);

            const description = await AutoUpdateUtils.autoUpdate(type, localVersion, this.generatorVersion, repoDir);
            const fileChanges = SpawnUtils.spawnWithOutput('git', ['status', '--porcelain'], repoDir);

            if (fileChanges) {
                const title = `Generator updates from ${localVersion} to ${this.generatorVersion}`;
                this.spinner.start(`${repo}: Commiting files`);
                await SpawnUtils.spawnOrAbort('git', ['add', '.'], repoDir, this.options.verbose);
                await SpawnUtils.spawnOrAbort('git', ['commit', '-am', title], repoDir, this.options.verbose);
                this.spinner.succeed();
                this.spinner.start(`${repo}: Pushing files\n`);
                await SpawnUtils.spawnOrAbort('git', ['push', 'origin', branch], repoDir, this.options.verbose);
                this.spinner.succeed();


                const data = {
                    title,
                    head: branch,
                    body: description.join('\n'),
                    base: 'develop'
                };

                const credentials = AutoUpdateUtils.chooseCredentials(org);
                this.spinner.start(`${repo}: Drafting pull request`);
                const {number} = await GithubRestUtils.createPullRequest(baseName, data, credentials);
                const assignees = [SpawnUtils.spawnWithOutput('git', ['config', 'user.name'], repoDir)];
                await GithubRestUtils.setAssignees(baseName, number, assignees, credentials);
                this.spinner.succeed();
            }
            return description;
        }));

        logFile.map((log, index) => {
            if (log.reason instanceof Error) {
                log.reason = log.reason.toString();
            }
            log.repo = repos[index];
            return log;
        });
        this.spinner.stop();
        return this.logFile = logFile;
    }

    end() {
        this.fs.writeJSON(this.destinationPath('log.json'), this.logFile);
    }
}

module.exports = Generator;
