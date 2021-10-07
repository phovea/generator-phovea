
'use strict';
const path = require('path');
const helpers = require('yeoman-test');
const rimraf = require('rimraf');
const dependencies = require('./test-utils/generator-dependencies');

const target = '../update';
const dummyToken = '********************';

// describe('auto-update generator runs sequentially', () => {

//     const knownReposFile = 'repositories.csv';
//     const tmpDir = 'tmp/tmp-xxxxx';
//     const pluginType = 'lib-slib';

//     const records = parse(fse.readFileSync(path.join(__dirname, './test-utils/templates/repositories.csv')), {
//         columns: true,
//         skip_empty_lines: true
//     });

//     beforeAll(async () => {
//         // mocks
//         WorkspaceUtils.cloneRepo = jest.fn()
//             .mockImplementationOnce((_repo, _branch, _extras, _dir, cwd) => {
//                 const dirs = records.map(({name}) => path.join(cwd, name));
//                 dirs.forEach((dir) => {

//                     fse.mkdirSync(dir, {recursive: true});
//                     fse.writeJSONSync(dir + '/.yo-rc.json', {
//                         "generator-phovea": {
//                             type: pluginType
//                         }
//                     });
//                 });
//                 return Promise.resolve(null);
//             })
//             .mockImplementation(() => Promise.resolve(null));
//         tmp.dirSync = jest.fn(() => ({name: tmpDir}));
//         SpawnUtils.spawnOrAbort = jest.fn();
//         AutoUpdateUtils.autoUpdate = jest.fn();
//         SpawnUtils.spawnSync = jest.fn((_cmd, argline) => {
//             if (argline[0] === 'config') {
//                 return {stdout: 'dummy_user'};
//             }
//             return {stdout: 'package.json'};

//         });
//         GithubRestUtils.createPullRequest = jest.fn(() => Promise.resolve({number: 5}));
//         GithubRestUtils.setAssignees = jest.fn(() => Promise.resolve(null));
//         return helpers
//             .run(path.join(__dirname, '../generators/auto-update'))
//             .withGenerators(dependencies.COMMON)
//             .withPrompts({
//                 githubToken: dummyToken,
//                 knownReposFile: 'repositories.csv'
//             })
//             .inTmpDir((dir) => {
//                 fse.copyFileSync(path.join(__dirname, './test-utils/templates/repositories.csv'), path.join(dir, knownReposFile));
//             });
//     });

//     it('clones all repos with the correct args (calls `cloneRepo()`)', () => {
//         const calls = WorkspaceUtils.cloneRepo.mock.calls;
//         expect(calls.length).toBe(records.length);

//         records.forEach((record, i) => {
//             const args = calls[i];
//             expect(args).toMatchObject([record.link, 'develop', null, '', tmpDir]);
//         });
//     });

//     it('checks out update branch for each repository (calls `spawnOrAbort()`)', () => {
//         records.forEach((record, i) => {
//             const args = SpawnUtils.spawnOrAbort.mock.calls[i];
//             const branch = `generator_update/${NpmUtils.decrementVersionByOne(targetVersion)}_to_${targetVersion}`;
//             const cwd = `${tmpDir}/${record.name}`;
//             expect(args).toMatchObject(['git', ['checkout', '-b', branch], cwd, false]);
//         });
//     });

//     it('runs the updates for each repository (calls `autoUpdate()`)', () => {
//         const calls = AutoUpdateUtils.autoUpdate.mock.calls;
//         expect(calls.length).toBe(records.length);
//         records.forEach((record, i) => {
//             const args = calls[i];
//             const localVersion = NpmUtils.decrementVersionByOne(targetVersion);
//             const cwd = `${tmpDir}/${record.name}`;
//             expect(args).toMatchObject([pluginType, localVersion, targetVersion, cwd]);
//         });
//     });

//     it('checks for each repository if any file changes were made (calls `spawnSync()`)', () => {
//         const calls = SpawnUtils.spawnSync.mock.calls;
//         records.forEach((record, i) => {
//             const args = calls[i];
//             const cwd = `${tmpDir}/${record.name}`;
//             expect(args).toMatchObject(['git', ['diff', '--name-only'], cwd, false]);
//         });
//     });

//     it('commits changes for each repository if any file changes were made (calls `spawnOrAbort()`)', () => {
//         const calls = SpawnUtils.spawnOrAbort.mock.calls;
//         records.forEach((record, i) => {
//             const localVersion = NpmUtils.decrementVersionByOne(targetVersion);
//             const title = `Generator updates from version ${localVersion} to ${targetVersion}`;
//             const args = calls[records.length + i];
//             const cwd = `${tmpDir}/${record.name}`;
//             expect(args).toMatchObject(['git', ['commit', '-am', title], cwd, false]);
//         });
//     });

//     it('pushes branch for each repository (calls `spawnOrAbort()`)', () => {
//         const calls = SpawnUtils.spawnOrAbort.mock.calls;
//         records.forEach((record, i) => {
//             const localVersion = NpmUtils.decrementVersionByOne(targetVersion);
//             const branch = `generator_update/${localVersion}_to_${targetVersion}`;
//             const args = calls[records.length * 2 + i];
//             const cwd = `${tmpDir}/${record.name}`;
//             expect(args).toMatchObject(['git', ['push', 'origin', branch], cwd, false]);
//         });
//     });

//     it('creates pull request for each repository (calls `createPullRequest()`)', () => {
//         const calls = GithubRestUtils.createPullRequest.mock.calls;
//         expect(calls.length).toBe(records.length);

//         records.forEach((record, i) => {

//             const args = calls[i];
//             const credentials = {
//                 username: 'oltionchampari',
//                 token: '************************************',
//             };
//             const localVersion = NpmUtils.decrementVersionByOne(targetVersion);
//             const title = `Generator updates from version ${localVersion} to ${targetVersion}`;
//             const branch = `generator_update/${localVersion}_to_${targetVersion}`;
//             const data = {
//                 title,
//                 head: branch,
//                 body: `Description`,
//                 base: 'develop'
//             };
//             const baseName = `${RepoUtils.getOrganization(record.link)}/${record.name}`;
//             expect(args).toMatchObject([baseName, data, credentials]);
//         });
//     });

//     it('adds assignee to pull request (calls `setAssignees()`)', () => {
//         const calls = GithubRestUtils.setAssignees.mock.calls;
//         expect(calls.length).toBe(records.length);

//         records.forEach((record, i) => {

//             const args = calls[i];
//             const credentials = {
//                 username: 'oltionchampari',
//                 token: '************************************',
//             };
//             const baseName = `${RepoUtils.getOrganization(record.link)}/${record.name}`;
//             expect(args).toMatchObject([baseName, 5, ['dummy_user'], credentials]);
//         });
//     });

// });


describe('auto-update generator fails', () => {

    afterAll(() => {
        rimraf.sync(path.join(__dirname, target));
    });


    it('throws error if `knownReposFile` does not exist', async () => {
        await helpers
            .run(path.join(__dirname, '../generators/auto-update'))
            .inDir(path.join(__dirname, target), () => null)
            .withGenerators(dependencies.COMMON)
            .withPrompts({
                githubToken: dummyToken
            })
            .catch((e) => {
                expect(e.message.includes('Given file cannot be read: ' + '/workspaces/releases/repositories.csv')).toBeTruthy();
            });
    });

});

// TODO test when update fails for a repo