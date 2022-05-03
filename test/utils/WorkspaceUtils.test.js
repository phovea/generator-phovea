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
            'description': 'Core Plugin',
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
            'name': 'tdp_core',
            'type': 'service',
            'description': 'Core Plugin',
            'repository': 'https://github.com/datavisyn/tdp_core.git',
            'requirements': {
                'tdp_core': '^4.0.0'
            },
            'develop': {
                'requirements': {
                    '-e git+https://github.com/datavisyn/tdp_core.git': '@develop#egg=tdp_core'
                }
            }
        }],
    };
    it('builds additional web plugins', () => {

    const result = [{
        'name': 'tdp_core: Core Plugin',
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
            'name': 'tdp_core: Core Plugin',
            'short': 'tdp_core',
            'value': {
                'name': 'tdp_core',
                'repo': 'datavisyn/tdp_core',
            },
        }];
        expect(WorkspaceUtils.buildPossibleAdditionalPlugins('python')).toMatchObject(result);
    });
});