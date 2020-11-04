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

class Generator extends Base {
    constructor(args, options) {
        super(args, Object.assign(options, {
            skipLocalCache: true // prevents store prompts from being saved in the local `.yo-rc.json`
        }));
        this.option('test-run', {
            default: true,
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
        this.cwd = tmp.dirSync({ unsafeCleanup: true }).name;
        const repos = Object.keys(this.knownRepos);
        const tasks = new Listr(
            [
                ...repos.map((repo) => {
                    const { link, org } = this.knownRepos[repo];
                    const repoUrl = RepoUtils.toSSHRepoUrl(link);
                    const repoDir = path.join(this.cwd, repo);
                    const baseName = `${org}/${repo}`;
                    return {
                        title: repo,

                        task: async (ctx, task) => {
                            return task.newListr([
                                {
                                    title: 'clone repo ' + repo,
                                    task: async (ctx) => {
                                        await SpawnUtils.spawnPromise('git', 'clone -b develop ' + repoUrl, this.cwd);
                                        const [localVersion = decrementVersion(this.generatorVersion), type] = [
                                            AutoUpdateUtils.readConfig('localVersion', repoDir),
                                            AutoUpdateUtils.readConfig('type', repoDir)
                                        ];
                                        ctx[repo] = {};
                                        ctx[repo].localVersion = localVersion;
                                        ctx[repo].type = type;
                                    }
                                },
                                {
                                    title: 'checkout working branch',
                                    task: async (ctx, task) => {
                                        const branch = `generator_update/${ctx[repo].localVersion}_to_${this.generatorVersion}`;
                                        ctx[repo].branch = branch;
                                        task.title = 'checkout ' + branch;
                                        await SpawnUtils.spawnOrAbort('git', ['checkout', '-b', branch], repoDir, this.options.verbose);
                                    }
                                },
                                {
                                    title: 'run updates',
                                    task: async (ctx, task) => {
                                        ctx[repo].descriptions = [];
                                        return AutoUpdateUtils.autoUpdate(ctx[repo].type, ctx[repo].localVersion, this.generatorVersion, repoDir, task);
                                    }
                                },
                                {
                                    task: (ctx,) => {
                                        ctx[repo].fileChanges = SpawnUtils.spawnWithOutput('git', ['status', '--porcelain'], repoDir);
                                        if (!ctx[repo].fileChanges) {
                                            throw new Error(repo + ': No file changes, skipping');
                                        }
                                    }
                                },
                                {
                                    title: 'commit file changes',
                                    enabled: () => !this.options['test-run'],
                                    task: async (ctx) => {
                                        ctx[repo].title = `Generator updates from ${ctx[repo].localVersion} to ${this.generatorVersion}`;
                                        await SpawnUtils.spawnPromise('git', ['add', '.'], repoDir);
                                        await SpawnUtils.spawnPromise('git', ['commit', '-am', ctx[repo].title], repoDir);
                                    }
                                },
                                {
                                    title: 'push changes',
                                    enabled: () => !this.options['test-run'],
                                    task: async (ctx) => {
                                        await SpawnUtils.spawnPromise('git', ['push', 'origin', ctx[repo].branch], repoDir);
                                    }
                                },
                                {
                                    title: 'draft pull request',
                                    enabled: () => !this.options['test-run'],
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
                            ], { concurrent: false, rendererOptions: { collapseErrors: true, showErrorMessage: true, collapse: false } });
                        }
                    };
                }),
            ], { concurrent: true, exitOnError: false, rendererOptions: { showErrorMessage: false } });

        await tasks.run();
        this.errors = tasks.err[0];

        if (this.options['test-run']) {
            await this.prompt([
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
    }

    end() {
        if (this.errors) {
            const log = this.errors.errors.map((e) => e.stack).join('\n');
            fse.writeFile(this.destinationPath('error.log'), log);
        }

    }
}

module.exports = Generator;
