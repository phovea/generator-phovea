'use strict';
const Base = require('yeoman-generator');
const fse = require('fs-extra');
const AutoUpdateUtils = require('./AutoUpdateUtils');
const path = require('path');
const parse = require('csv-parse/lib/sync');
const SpawnUtils = require('../../utils/SpawnUtils');
const RepoUtils = require('../../utils/RepoUtils');
const GithubRestUtils = require('./GithubRestUtils');
const { decrementVersion } = require('../../utils/NpmUtils');
const { Listr } = require('listr2');
const tmp = require('tmp');
const { chunk } = require('lodash');
const chalk = require('chalk');

class Generator extends Base {
    constructor(args, options) {
        super(args, Object.assign(options, {
            skipLocalCache: true // prevents store prompts from being saved in the local `.yo-rc.json`
        }));
        this.option('test-run', {
            default: false,
            required: false,
            type: Boolean
        });
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
        ]).then(({ knownReposFile }) => {
            this.knownRepos = this._readKnownReposFile(knownReposFile);
            this.generatorVersion = require('../../package.json').version.replace('-SNAPSHOT', '');
        });
    }

    _readKnownReposFile(file) {
        const repoName = 'Repository name';
        const repoLink = 'Repository link';
        const owner = 'Owner';
        const type = 'Type';

        if (!fse.existsSync(file)) {
            this.env.error('Given file cannot be read: ' + file);
        }
        const records = parse(fse.readFileSync(file), {
            columns: true,
            skip_empty_lines: true
        });
        const parsedRecords = records
            .filter((r) => r[repoName] && r[repoName] !== 'lineupjs' && r[repoLink] && r[owner] && r[type] && r[type] !== '-');
        return Object.assign({}, ...parsedRecords.map((item) => (
            {
                [item[repoName]]: {
                    org: RepoUtils.getOrganization(item[repoLink]),
                    ...item
                }
            })));
    }

    _taskWraper(chunk) {
        return new Listr(
            [
                ...chunk.map((repo) => {
                    const { org } = this.knownRepos[repo];
                    const { token } = AutoUpdateUtils.getCredentials(org);
                    const repoUrl = `https://${token}@github.com/${org}/${repo}.git`;
                    const repoDir = path.join(this.cwd, repo);
                    const baseName = `${org}/${repo}`;
                    const enablePredicate = (ctx) => !this.options['test-run'] && ctx[repo] && !ctx[repo].skipNext;
                    return {
                        title: chalk.bold(repo),
                        task: async (ctx, parent) => {
                            return parent.newListr([
                                {
                                    title: 'Clone repo ' + repo,
                                    options: {
                                        persistentOutput: false,
                                        bottomBar: Infinity,
                                    },
                                    task: async () => await SpawnUtils.spawnPromise('git', 'clone -b develop ' + repoUrl, this.cwd)
                                },
                                {
                                    title: 'Check if yo-rc.json exists',
                                    options: {
                                        persistentOutput: false,
                                    },
                                    task: async (ctx) => {
                                        const [currentVersion = decrementVersion(this.generatorVersion), type] = [
                                            AutoUpdateUtils.readConfig('localVersion', repoDir),
                                            AutoUpdateUtils.readConfig('type', repoDir)
                                        ];
                                        ctx[repo] = {};
                                        ctx[repo].currentVersion = currentVersion;
                                        ctx[repo].type = type;
                                    }
                                },
                                {
                                    title: 'Checkout working branch',
                                    options: {
                                        persistentOutput: false,
                                    },
                                    task: async (ctx, task) => {
                                        const branch = `generator_update/${ctx[repo].currentVersion}_to_${this.generatorVersion}`;
                                        ctx[repo].branch = branch;
                                        task.title = 'Checkout branch ' + branch;
                                        await SpawnUtils.spawnOrAbort('git', ['checkout', '-b', branch], repoDir, this.options.verbose);
                                    }
                                },
                                {
                                    title: 'Run updates',
                                    task: async (ctx, task) => {
                                        ctx[repo].descriptions = [];
                                        return AutoUpdateUtils.autoUpdate(repo, ctx[repo].type, ctx[repo].currentVersion, this.generatorVersion, repoDir, task);
                                    }
                                },
                                {
                                    task: (ctx, task) => {
                                        ctx[repo].fileChanges = SpawnUtils.spawnWithOutput('git', ['status', '--porcelain'], repoDir);
                                        if (!ctx[repo].fileChanges) {
                                            task.title = 'No file changes detected, aborting ';
                                            ctx[repo].skipNext = true;
                                            task.skip();
                                            parent.skip();
                                        }
                                    }
                                },
                                {
                                    title: 'Commit changes',
                                    enabled: (ctx) => enablePredicate(ctx),
                                    task: async (ctx) => {
                                        ctx[repo].title = `Generator updates from ${ctx[repo].currentVersion} to ${this.generatorVersion}`;
                                        await SpawnUtils.spawnPromise('git', ['add', '.'], repoDir);
                                        await SpawnUtils.spawnPromise('git', ['commit', '-am', ctx[repo].title], repoDir);
                                    }
                                },
                                {
                                    title: 'Push changes',
                                    enabled: (ctx) => enablePredicate(ctx),
                                    task: async (ctx) => {
                                        await SpawnUtils.spawnPromise('git', ['push', repoUrl, ctx[repo].branch], repoDir);
                                    }
                                },
                                {
                                    title: 'Draft pull request',
                                    enabled: (ctx) => enablePredicate(ctx),
                                    task: async (ctx) => {
                                        const { title, branch, descriptions } = ctx[repo];
                                        const data = {
                                            title,
                                            head: branch,
                                            body: descriptions.join('\n'),
                                            base: 'develop'
                                        };
                                        const credentials = AutoUpdateUtils.chooseCredentials(org);
                                        const { number } = await GithubRestUtils.createPullRequest(baseName, data, credentials);
                                        const assignees = [SpawnUtils.spawnWithOutput('git', ['config', 'user.name'], repoDir)];
                                        await GithubRestUtils.setAssignees(baseName, number, assignees, credentials);
                                    },
                                }
                            ], { concurrent: false, rendererOptions: { collapseErrors: false, showErrorMessage: true, collapse: false } });
                        }
                    };
                }),
            ], { concurrent: true, exitOnError: false, rendererOptions: { showErrorMessage: true, collapseErrors: false } });

    }

    /**
     * Checks if the required environment variables are set in the system.
     * For each organization the `${org}_TOKEN` and `${org}_USER` are required.
     * @param {Set<string>} orgs 
     */
    _checkEnvironmentVars(orgs) {
        let missingEnvs = [];
        orgs.forEach((org) => {
            org = org.toUpperCase();
            const { token, username } = AutoUpdateUtils.getCredentials(org);
            if (!token) {
                missingEnvs.push(`${org}_TOKEN`);
            }
            if (!username) {
                missingEnvs.push(`${org}_USER`);
            }
        });

        if (missingEnvs.length) {
            this.env.error(`${chalk.red('Missing required environment variable(s):')}\n${missingEnvs.join('\n')}`);
        }
    }

    async writing() {
        this.cwd = tmp.dirSync({ unsafeCleanup: true }).name;
        const repos = Object.keys(this.knownRepos).slice(0, 10);
        const orgs = new Set(repos.map((r) => this.knownRepos[r].org));
        this._checkEnvironmentVars(orgs);

        // seperate repos in chunks to make logging more managable
        const chunkSize = 8;
        const [...chunks] = chunk(repos, chunkSize);
        const groups = chunks.map((chunk) => this._taskWraper(chunk));

        await groups.reduce(async (updateChain, group) => {
            return updateChain
                .then(() => group.run());
        }, Promise.resolve([]));

        this.errorLog = this._composeErrorLog(groups);
        if (this.options['test-run']) {
            await this._reviewChanges();
        }
    }

    /**
     * Formats all silent error messages 
     * @param {Listr[]} taskGroups 
     */
    _composeErrorLog(taskGroups) {
        const errorGroups = taskGroups.filter((taskGroup) => taskGroup.err[0]);
        if (errorGroups.length) {
            return errorGroups
                .map((group) => group.err[0].errors.map(({ stack }) => stack).join('\n'))
                .join('\n');
        }
    }

    _reviewChanges() {
        return this.prompt([
            {
                type: 'confirm',
                name: 'review',
                message: 'Review changes in vscode?',
            }]).then(({ review }) => {
                if (review) {
                    SpawnUtils.spawnSync('code', ['.'], this.cwd);
                }
            });
    }

    end() {
        if (this.errorLog) {
            this.fs.write(this.destinationPath('error.log'), this.errorLog);
        }
    }
}

module.exports = Generator;
