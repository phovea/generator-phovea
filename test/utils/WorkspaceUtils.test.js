'use strict';
const WorkspaceUtils = require('../../utils/WorkspaceUtils');
jest.mock('../../utils/known');

describe('Find default app in product object', () => {

    it('returns null if product is undefined', () => {
        const product = undefined;
        expect(WorkspaceUtils.findDefaultApp(product)).toBe(null);
    });

    it('returns null if product has no entry type `web`', () => {
        const product = [
            {
                type: 'api',
                label: 'tdp_core',
                repo: 'datavisyn/tdp_core',
                branch: 'develop',
                additional: []
            }];
        expect(WorkspaceUtils.findDefaultApp(product)).toBe(null);
    });

    it('returns parsed repo name when entry has type `web`', () => {
        const product = [
            {
                type: 'web',
                label: 'ordino',
                repo: 'Caleydo/ordino_public',
                branch: 'develop',
                additional: [
                    {
                        'name': 'tdp_core',
                        'repo': 'datavisyn/tdp_core',
                        'branch': 'develop'
                    }
                ]

            },
            {
                type: 'api',
                label: 'repo',
                repo: 'org/repo',
                branch: 'develop',
                additional: []

            }];
        expect(WorkspaceUtils.findDefaultApp(product)).toMatchObject({name: 'ordino_public', additional: ['tdp_core']});
    });
});

describe('Test `buildPossibleAdditionalPlugins()`', () => {


    const known = require('../../utils/known');
    known.plugin = {
        listWeb: [{
            'name': 'tdp_core',
            'type': 'lib',
            'description': 'Phovea Core Plugin',
            'repository': 'https://github.com/datavisyn/tdp_core.git',
            'dependencies': {
                'tdp_core': '^4.0.0'
            },
            'develop': {
                'dependencies': {
                    'tdp_core': 'github:datavisyn/tdp_core#develop'
                }
            },
            'libraries': []
        },],
        listServer: [{
            'name': 'phovea_server',
            'type': 'service',
            'description': 'Phovea Server Plugin',
            'repository': 'https://github.com/phovea/phovea_server.git',
            'requirements': {
                'phovea_server': '>=5.0.1,<6.0.0'
            },
            'develop': {
                'requirements': {
                    '-e git+https://github.com/phovea/phovea_server.git': '@develop#egg=phovea_server'
                }
            }
        }],
    };
    it('builds additional web plugins', () => {

    const result = [{
        'name': 'tdp_core: Phovea Core Plugin',
        'short': 'tdp_core',
        'value': {
            'name': 'tdp_core',
            'repo': 'datavisyn/tdp_core',
        },
    }];
        expect(WorkspaceUtils.buildPossibleAdditionalPlugins('web')).toMatchObject(result);
        expect(WorkspaceUtils.buildPossibleAdditionalPlugins('static')).toMatchObject(result);
    });

    it('builds additional python plugins', () => {
        const result = [{
            'name': 'phovea_server: Phovea Server Plugin',
            'short': 'phovea_server',
            'value': {
                'name': 'phovea_server',
                'repo': 'phovea/phovea_server',
            },
        }];
        expect(WorkspaceUtils.buildPossibleAdditionalPlugins('python')).toMatchObject(result);
    });
});