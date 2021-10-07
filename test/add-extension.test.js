
'use strict';
const path = require('path');
const assert = require('yeoman-assert');
const helpers = require('yeoman-test');
const fse = require('fs-extra');
const TestUtils = require('./test-utils/TestUtils');
const {template} = require('lodash');
const dependencies = require('./test-utils/generator-dependencies');
const {basetype} = require('../base/config');

describe('add a web extension to a web library', () => {
    const tdpViewTmpl = template(fse.readFileSync(TestUtils.templatePath('add-extension', 'tdpView.tmpl.ts')))({moduleName: 'CustomView'});

    const prompts = {
        type: 'tdpView',
        id: 'view_id',
        module: 'CustomView',
        extras: `
        idType=MYIDTYPE
        load=true
        config.database=MyDB
        `
    };

    beforeAll(async () => {
        let workingDirectory;
        // initialize a dummy web library
        await helpers
            .run(path.join(__dirname, '../generators/init-lib'))
            .withGenerators(dependencies.INIT_LIB)
            .inTmpDir((dir) => {
                workingDirectory = dir;
            });

        // run yo phovea:add-extension in the same directory
        await helpers
            .run(path.join(__dirname, '../generators/add-extension'))
            .withGenerators(dependencies.COMMON)
            .inTmpDir(() => {
                process.chdir(workingDirectory);
            })
            .withPrompts(prompts);
    });

    it('generates module', () => {
        assert.file('src/CustomView.ts');
    });

    it('generated module uses the correct template', () => {
        assert.fileContent('src/CustomView.ts', tdpViewTmpl);
    });

    it('registers the view in phovea.ts', () => {
        const config = `registry.push('tdpView', 'view_id', () => import('./CustomView'), {\n   'idType': 'MYIDTYPE',\n   'load': true,\n   'config': {\n    'database': 'MyDB'\n   }\n  });`;
        assert.fileContent('src/phovea.ts', config);
    });
});

describe('add a python extension to a python plugin', () => {
    const prompts = {
        type: 'tdp-sql-definition',
        id: 'my_id',
        module: 'custom',
        extras: `
        autoUpgrade=false
        `
    };
    beforeAll(async () => {
        let workingDirectory;
        // Initialize a dummy python library
        await helpers
            .run(path.join(__dirname, '../generators/init-slib'))
            .withGenerators(dependencies.INIT_SLIB)
            .inTmpDir((dir) => {
                workingDirectory = dir;
            })
            .withPrompts({name: 'server_plugin'});

        // Run yo phovea:add-extension in the same directory
        await helpers
            .run(path.join(__dirname, '../generators/add-extension'))
            .withGenerators(dependencies.COMMON)
            .inTmpDir(() => {
                process.chdir(workingDirectory);
            })
            .withPrompts(prompts);
    });

    it('generates module', () => {
        assert.file('server_plugin/custom.py');
    });

    it('registers extension in __init__.py', () => {
        const config = `registry.append('tdp-sql-definition', 'my_id', 'server_plugin.custom', {\n     'autoUpgrade': False\n    })`;
        assert.fileContent('server_plugin/__init__.py', config);
    });
});

describe('add a web extension to a hybrid plugin', () => {
    const prompts = {
        basetype: basetype.WEB,
        type: 'tdpScore',
        id: 'score_id',
        module: 'SingleScore',
    };
    beforeAll(async () => {
        let workingDirectory;
        // Initialize a dummy hybrid plugin
        await helpers
            .run(path.join(__dirname, '../generators/init-lib-slib'))
            .withGenerators(dependencies.INIT_LIB_SLIB)
            .inTmpDir((dir) => {
                workingDirectory = dir;
            })
            .withPrompts({name: 'hybrid_plugin'});

        // Run yo phovea:add-extension in the same directory
        await helpers
            .run(path.join(__dirname, '../generators/add-extension'))
            .withGenerators(dependencies.COMMON)
            .inTmpDir(() => {
                process.chdir(workingDirectory);
            })
            .withPrompts(prompts);
    });
    it('generates score module', () => {
        assert.file('src/SingleScore.ts');
    });

    it('registers the score in phovea.ts', () => {
        const config = `registry.push('tdpScore', 'score_id', () => import('./SingleScore'), {});`;
        assert.fileContent('src/phovea.ts', config);
    });
});

describe('add a web extension from the workspace', () => {
    const cwd = process.cwd();
    const libPlugin = 'libPLugin';
    const prompts = {
        basetype: basetype.WEB,
        type: 'tdpScore',
        id: 'score_id',
        module: 'SingleScore',
        plugin: libPlugin
    };
    beforeAll(async () => {
        let workingDirectory;
        // Initialize a dummy lib plugin
        await helpers
            .run(path.join(__dirname, '../generators/init-lib'))
            .withGenerators(dependencies.INIT_LIB)
            .inTmpDir((dir) => {
                workingDirectory = dir;
                // simulate a workspace
                fse.writeFileSync('.yo-rc-workspace.json', '');
                fse.mkdirSync(`./${libPlugin}`);
                process.chdir(path.join(dir, libPlugin));
            })
            .withPrompts({name: 'plugin'});

        // Run yo phovea:add-extension in the same directory
        await helpers
            .run(path.join(__dirname, '../generators/add-extension'))
            .withGenerators(dependencies.COMMON)
            .inTmpDir(() => {
                process.chdir(workingDirectory);
            })
            .withPrompts(prompts);
    });

    // Switch back the cwd
    afterAll(() => {
        process.chdir(cwd);
    });

    it('generates score module inside the plugin directory', () => {
        assert.file(libPlugin + '/src/SingleScore.ts');
    });

    it('registers the score in phovea.ts inside the plugin directory', () => {
        const config = `registry.push('tdpScore', 'score_id', () => import('./SingleScore'), {});`;
        assert.fileContent(libPlugin + '/src/phovea.ts', config);
    });
});