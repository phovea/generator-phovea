'use strict';
const Base = require('yeoman-generator');
const fse = require('fs-extra');
const AutoUpdateUtils = require('./AutoUpdateUtils');
const path = require('path');
const parse = require('csv-parse/lib/sync');
const WorkspaceUtils = require('../../utils/WorkspaceUtils');
const tmp = require('tmp');
const NpmUtils = require('../../utils/NpmUtils');
const SpawnUtils = require('../../utils/SpawnUtils');
const GithubRestUtils = require('./GithubRestUtils');
const RepoUtils = require('../../utils/RepoUtils');

class Generator extends Base {
    constructor(args, options) {
        super(args, Object.assign(options, {
            skipLocalCache: true // prevents store prompts from being saved in the local `.yo-rc.json`
        }));
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
            },
            {
                type: "password",
                name: "githubToken",
                message: `Enter github token`,
                store: true,
                mask: true,
            } // TODO prompts for PR title 
        ]).then(({knownReposFile, githubToken}) => {

            this.githubToken = githubToken;
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

    async default() {
        this.cwd = tmp.dirSync({unsafeCleanup: true}).name;
        Object.keys(this.knownRepos).forEach(async (repo) => {
            const currentCwd = path.join(this.cwd, repo);
            const {link, org} = this.knownRepos[repo];
            const baseName = `${org}/${repo}`;
            await WorkspaceUtils.cloneRepo(link, 'develop', null, '', this.cwd);
            const config = fse.readJSONSync(path.join(this.cwd, repo, '.yo-rc.json'));
            const {localVersion = NpmUtils.decrementVersionByOne(this.generatorVersion), type} = config['generator-phovea'];
            const branch = `generator_update/${localVersion}_to_${this.generatorVersion}`;

            await SpawnUtils.spawnOrAbort('git', ['checkout', '-b', branch], currentCwd, false);

            await AutoUpdateUtils.autoUpdate(type, localVersion, this.generatorVersion, currentCwd);
            const fileChanges = SpawnUtils.spawnSync('git', ['diff', '--name-only'], currentCwd, false).stdout.toString().trim();
            if (fileChanges) {
                const title = `Generator updates from version ${localVersion} to ${this.generatorVersion}`;
                await SpawnUtils.spawnOrAbort('git', ['commit', '-am', title], currentCwd, false);

                await SpawnUtils.spawnOrAbort('git', ['push', 'origin', branch], currentCwd, false);

                const credentials = {
                    username: 'oltionchampari',
                    token: '************************************',
                };
                const data = {
                    title, // TODO get title from prompt
                    head: branch,
                    body: `Description`, // TODO add description to the PR body
                    base: 'develop'
                };
                const {number} = await GithubRestUtils.createPullRequest(baseName, data, credentials);
                const assignees = [SpawnUtils.spawnSync('git', ['config', 'user.name']).stdout.toString().trim()];
                await GithubRestUtils.setAssignees(baseName, number, assignees, credentials);
            }
            // TODO propper error handling 
            // do not interrupt execution if one repo fails 

        });
    }


    writing() {
        // create error/execution log 
    }
}

module.exports = Generator;
