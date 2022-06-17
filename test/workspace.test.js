'use strict';
const path = require('path');
const assert = require('yeoman-assert');
const helpers = require('yeoman-test');
const fse = require('fs-extra');
const {template} = require('lodash');
const dependencies = require('./test-utils/generator-dependencies');

/**
 * Get the path to the templates of a specific subgenerator.
 * @param {string} subgenerator 
 * @param {string} file 
 */
const templatePath = (subgenerator, file) => path.join(__dirname, `../generators/${subgenerator}/templates/${file}`);

const expectedFiles = [
    '.idea/misc.xml',
    '.idea/remote-mappings.xml',
    '.idea/vcs.xml',
    '.idea/workspace.xml',
    '.idea/encodings.xml',
    '.idea/jsLibraryMappings.xml',
    '.idea/modules.xml',
    '.idea/typescript-compiler.xml',
    '.idea/watcherTasks.xml',
    '.idea/codeStyles/codeStyleConfig.xml',
    '.idea/codeStyles/Project.xml',
    '.idea/inspectionProfiles/profiles_settings.xml',
    '.vscode/settings.json',
    '.dockerignore',
    '.yo-rc-workspace.json',
    'config.json',
    'docker_packages.txt',
    'docker_script.sh',
    'docker-backup',
    'docker-backup.cmd',
    'docker-compose-debug',
    'docker-compose-debug.yml',
    'forEach',
    'docker-compose.yml',
    'forEach.cmd',
    'package.json',
    'phovea_registry.js',
    'requirements_dev.txt',
    'requirements.txt',
    'withinEnv',
    'withinEnv.cmd',
    'config/webpack.dev.js',
    'config/webpack.prod.js',
    'workspace.scss'
];

describe('Run yo phovea:init-lib, yo phovea:init-app and yo:phovea:workspace sequentially', () => {
    const cwd = process.cwd();
    let workingDirectory;
    let workspace;

    const libPlugin = 'lib_plugin';
    const appPlugin = 'app_plugin';

    const defaults = {
        name: 'phovea_workspace',
        version: '0.0.1',
        description: 'helper package'
    };

    const watch_content = {"all:copy": {
        "patterns": [
          "./app_plugin/src"
        ],
        "extensions": "html,scss,css",
        "quiet": false,
        "legacyWatch": true,
        "delay": 2500,
        "runOnChangeOnly": true
      }
    };

    const pkg = JSON.parse(template(JSON.stringify(fse.readJSONSync(templatePath('workspace', 'package.tmpl.json'))))(
        {wsName: defaults.name, wsVersion: defaults.version, wsDescription: defaults.description}));

    beforeAll(async () => {

        // Run yo phovea:init-lib
        await helpers
            .run(path.join(__dirname, '../generators/init-lib'))
            .withGenerators(dependencies.INIT_LIB)
            .inTmpDir((dir) => {
                workingDirectory = dir;
                fse.mkdirSync(`./${libPlugin}`);
                process.chdir(path.join(dir, libPlugin));
            });

        // Run yo:phovea:init-app
        await helpers
            .run(path.join(__dirname, '../generators/init-app'))
            .withGenerators(dependencies.INIT_APP)
            .withPrompts({
                app: 'appName'
            })
            .inTmpDir(() => {
                process.chdir(workingDirectory);
                fse.mkdirSync(`./${appPlugin}`);
                process.chdir(path.join(workingDirectory, appPlugin));
            });

        // Run yo phovea:workspace
        await helpers
            .run(path.join(__dirname, '../generators/workspace'))
            .withGenerators(dependencies.COMMON)
            .inTmpDir(() => {
                workspace = workingDirectory.replace('/tmp/', '');
                process.chdir(workingDirectory);
            });
    });

    // Switch back the cwd
    afterAll(() => {
        process.chdir(cwd);
    });

    it('generates expected workspace files', () => {
        assert.file(expectedFiles);
    });

    it('generates expected <workspace>.iml file', () => {
        assert.file(`.idea/${workspace}.iml`);
    });

    it(`adds correct entries in ".idea/vcs.xml"`, () => {
        const libEntry = `<mapping directory="$PROJECT_DIR$/${libPlugin}" vcs="Git" />`;
        const appEntry = `<mapping directory="$PROJECT_DIR$/${appPlugin}" vcs="Git" />`;
        assert.fileContent(`.idea/vcs.xml`, libEntry);
        assert.fileContent(`.idea/vcs.xml`, appEntry);
    });

    it(`adds correct entries in ".idea/<workspace>.iml"`, () => {
        const libEntry = `<sourceFolder url="file://$MODULE_DIR$/${libPlugin}" isTestSource="false" />`;
        const appEntry = `<sourceFolder url="file://$MODULE_DIR$/${appPlugin}" isTestSource="false" />`;
        assert.fileContent(`.idea/${workspace}.iml`, libEntry);
        assert.fileContent(`.idea/${workspace}.iml`, appEntry);
    });

    it(`imports all workspace plugins in "phovea_registry.js"`, () => {
        const libEntry = `import '${libPlugin}/phovea_registry.js';`;
        const appEntry = `import '${appPlugin}/phovea_registry.js';`;
        assert.fileContent(`phovea_registry.js`, libEntry);
        assert.fileContent(`phovea_registry.js`, appEntry);
    });

    it('generates workspace "package.json" with correct property "name"', () => {
        assert.jsonFileContent('package.json', {name: pkg.name});
    });

    it('generates workspace "package.json" with correct property "version"', () => {
        assert.jsonFileContent('package.json', {version: pkg.version});
    });

    it('generates workspace "package.json" with correct property "description"', () => {
        assert.jsonFileContent('package.json', {description: pkg.description});
    });

    it('generates workspace "package.json" with `watch` property', () => {
        assert.jsonFileContent('package.json', {watch: watch_content});
    });

    it('generates workspace "package.json" with the correct scripts', () => {
        assert.jsonFileContent('package.json', {scripts: pkg.scripts});
    });
});
