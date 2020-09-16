
'use strict';
const path = require('path');
const helpers = require('yeoman-test');
const rimraf = require('rimraf');
const GeneratorUtils = require('../utils/GeneratorUtils');
const WorkspaceUtils = require('../utils/WorkspaceUtils');
const assert = require('yeoman-assert');
const fs = require('fs-extra');
const RepoUtils = require('../utils/RepoUtils');
const {yo} = require('../utils/GeneratorUtils');

/**
 * Directory name to run the generator
 */
const target = '../phovea_workpsace';

/**
 * Sub-generators called with the setup-workspace sub-generator.
 */
const GENERATOR_DEPENDENCIES = [
    '../generators/workspace',
    '../generators/_check-own-version',
    '../generators/check-node-version',
    '../generators/clone-repo',
];
const product = 'org/dummy_product';

const setupWorkspace = () => helpers
    .run(path.join(__dirname, '../generators/setup-workspace'))
    .inDir(path.join(__dirname, target), () => null)
    .withArguments([product])
    .withOptions({ssh: true, branch: 'develop'})
    .withGenerators(GENERATOR_DEPENDENCIES);


describe('generator setup-workspace', () => {
    const phoveaProduct = fs.readJSONSync(path.join(__dirname, `templates/phovea_product_dummy.json`));
    beforeAll(() => {
        WorkspaceUtils.cloneRepo = jest.fn()
            .mockImplementationOnce((repo, branch, extras, dir, cwd) => fs.writeJson(cwd + '/phovea_product.json', phoveaProduct)) // first call
            .mockImplementation(() => Promise.resolve(null)); // just resolve promise after the firts call

        GeneratorUtils.yo = jest.fn();
        return setupWorkspace();
    });

    afterAll(() => {
        rimraf.sync(path.join(__dirname, target));
    });

    it('calls WorkspaceUtils.cloneRepo(...args) 13 times (1 product + 12 plugins)', () => {
        expect(WorkspaceUtils.cloneRepo.mock.calls.length).toBe(13);
    });


    it('clones product by calling `WorkspaceUtils.cloneRepo(...args)` with the correct args', () => {
        const cloneRepoArgs = WorkspaceUtils.cloneRepo.mock.calls;

        const productRepo = cloneRepoArgs[0][0];
        expect(productRepo).toBe(product);

        const branch = cloneRepoArgs[0][1];
        expect(branch).toBe('develop');

        const extra = cloneRepoArgs[0][2];
        expect(extra).toBe(null);

        const target = cloneRepoArgs[0][3];
        const currentDir = '.';
        expect(target).toBe(currentDir);

        const cwd = cloneRepoArgs[0][4];
        expect(cwd).toBe('dummy');

        const ssh = cloneRepoArgs[0][5];
        expect(ssh).toBe(true);
    });

    it('clones all plugins by calling `WorkspaceUtils.cloneRepo(...args)` with the correct args', () => {
        const cloneRepoArgs = WorkspaceUtils.cloneRepo.mock.calls;
        RepoUtils.parsePhoveaProduct(phoveaProduct).forEach((plugin, i) => {
            const index = i + 1; // skip the product cloning call
            const name = cloneRepoArgs[index][0];
            expect(name).toBe(plugin.repo);

            const branch = cloneRepoArgs[index][1];
            expect(branch).toBe(plugin.branch);

            const extra = cloneRepoArgs[index][2];
            expect(extra).toBe(null);

            const target = cloneRepoArgs[index][3];
            expect(target).toBe('');

            const cwd = cloneRepoArgs[index][4];
            expect(cwd).toBe('dummy');

            const ssh = cloneRepoArgs[index][5];
            expect(ssh).toBe(true);
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

    it('calls GeneratorUtils.yo(..args) with the correct arguments', () => {
        const yoArgs = GeneratorUtils.yo.mock.calls;
        expect(yoArgs.length).toBe(1);
        const cmd = yoArgs[0][0];
        expect(cmd).toBe('workspace');

        const options = yoArgs[0][1];
        expect(options).toMatchObject({'defaultApp': 'ordino_public', 'skipNextStepsLog': true});
    });


});
