
'use strict';
const path = require('path');
const helpers = require('yeoman-test');
const rimraf = require('rimraf');
const GeneratorUtils = require('../utils/GeneratorUtils');
const WorkspaceUtils = require('../utils/WorkspaceUtils');
const assert = require('yeoman-assert');
const fs = require('fs-extra');
const RepoUtils = require('../utils/RepoUtils');
const TestUtils = require('./test-utils/TestUtils');
const SpawnUtils = require('../utils/SpawnUtils');
const {template} = require('lodash');
const dependencies = require('./test-utils/generator-dependencies');

/**
 * Directory name to run the generator
 */
const target = '../phovea_workpsace';

const product = 'org/dummy_product';

const setupWorkspace = () => helpers
    .run(path.join(__dirname, '../generators/setup-workspace'))
    .inDir(path.join(__dirname, target), () => null)
    .withArguments([product])
    .withOptions({ssh: true, branch: 'develop'})
    .withGenerators(dependencies.SETUP_WORKSPACE);


describe('generator setup-workspace', () => {
    const phoveaProduct = require(`./test-utils/templates/phovea_product_dummy.json`);
    beforeAll(() => {
        // mock the clone-repo function
        WorkspaceUtils.cloneRepo = jest.fn()
            // first call
            .mockImplementationOnce((repo, branch, extras, dir, cwd) => {
                fs.mkdirSync('dummy/templates/api/deploy/api', {recursive: true});
                fs.writeFileSync('dummy/templates/api/deploy/api/Dockerfile', 'dummy_content');

                fs.mkdirSync('dummy/templates/web/deploy/web', {recursive: true});
                fs.writeFileSync('dummy/templates/web/deploy/web/Dockerfile', 'dummy_content');
                fs.writeJSON(cwd + '/package.json', {});
                return fs.writeJSON(cwd + '/phovea_product.json', phoveaProduct);
            })
            .mockImplementation(() => Promise.resolve(null)); // just resolve promise after the firts call

        GeneratorUtils.yo = jest.fn();
        SpawnUtils.spawnOrAbort = jest.fn();
        return setupWorkspace();
    });

    // afterAll(() => {
    //     rimraf.sync(path.join(__dirname, target));
    // });

    it('calls WorkspaceUtils.cloneRepo(...args) 13 times (1 product + 12 plugins)', () => {
        expect(WorkspaceUtils.cloneRepo.mock.calls.length).toBe(13);
    });

    it('clones product by calling `WorkspaceUtils.cloneRepo(...args)` with the correct args', () => {
        const [productRepo, branch, extra, target, cwd, ssh] = WorkspaceUtils.cloneRepo.mock.calls[0];
        expect([productRepo, branch, extra, target, cwd, ssh]).toStrictEqual([product, 'develop', null, '.', 'dummy', true]);
    });

    it('clones all plugins by calling `WorkspaceUtils.cloneRepo(...args)` with the correct args', () => {
        const cloneRepoArgs = WorkspaceUtils.cloneRepo.mock.calls;
        RepoUtils.parsePhoveaProduct(phoveaProduct).forEach((plugin, i) => {
            const index = i + 1; // skip the product cloning call
            const [name, branch, extra, target, cwd, ssh] = cloneRepoArgs[index];
            expect([name, branch, extra, target, cwd, ssh]).toStrictEqual([plugin.repo, plugin.branch, null, '', 'dummy', true]);
        });
    });

    it('creates valid `.yo-rc-workspace.json`', () => {
        const content = {
            'modules': [],
            'defaultApp': 'ordino_public',
            'frontendRepos': [
                'phovea_core',
                'phovea_ui',
                'phovea_clue',
                'phovea_security_flask',
                'tdp_core',
                'ordino',
                'tdp_gene',
                'tdp_publicdb'
            ],
            'devRepos': [
                'ordino_public'
            ]
        };

        assert.file('dummy/.yo-rc-workspace.json');
        assert.jsonFileContent('dummy/.yo-rc-workspace.json', content);
    });

    it('calls `yo phovea:workspace` with the correct arguments', () => {
        const yoArguments = GeneratorUtils.yo.mock.calls;
        expect(yoArguments.length).toBe(1);
        const [generator, options, args, cwd] = yoArguments[0];
        expect([generator, options, args, cwd]).toStrictEqual(['workspace', {'defaultApp': 'ordino_public', 'skipNextStepsLog': true, 'updateWorkspaceScss': true}, null, 'dummy']);
    });

    it('copies `.idea` template files', () => {
        let fileContent = template(fs.readFileSync(TestUtils.templatePath('setup-workspace', 'start_defaultapp.tmpl.xml')))({defaultApp: 'ordino_public'});
        assert.file('dummy/.idea/runConfigurations/start_ordino_public.xml');
        assert.fileContent('dummy/.idea/runConfigurations/start_ordino_public.xml', fileContent);

        fileContent = template(fs.readFileSync(TestUtils.templatePath('setup-workspace', 'lint_defaultapp.tmpl.xml')))({defaultApp: 'ordino_public'});
        assert.file('dummy/.idea/runConfigurations/lint_ordino_public.xml');
        assert.fileContent('dummy/.idea/runConfigurations/lint_ordino_public.xml', fileContent);
    });

    it('copies products\' template files into the workspace', () => {
        assert.file('dummy/deploy/api/Dockerfile');
        assert.file('dummy/deploy/web/Dockerfile');
    });

    it('calls `SpawnUtils.spawnOrAbort(...args)` with correct args', () => {
        const [cmd, args, cwd, verbose] = SpawnUtils.spawnOrAbort.mock.calls[0];
        expect([cmd, args, cwd, verbose]).toStrictEqual(['npm', 'install', 'dummy', true]);
    });
});
