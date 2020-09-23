'use strict';
const RepoUtils = require('../utils/RepoUtils');
const fs = require('fs-extra');
const path = require('path');

describe('transfroms repo name to an https url', () => {

    it('repo is already an http url', () => {
        const repo = 'https://github.com/phovea/phovea_core.git';
        expect(RepoUtils.toHTTPRepoUrl(repo)).toBe(repo);
    });

    it('repo has format `organization/repo`', () => {
        const repo = 'phovea/phovea_core';
        expect(RepoUtils.toHTTPRepoUrl(repo)).toBe('https://github.com/phovea/phovea_core.git');
    });

    it('repo is only the name of the repo', () => {
        const repo = 'ordino';
        expect(RepoUtils.toHTTPRepoUrl(repo)).toBe('https://github.com/Caleydo/ordino.git');
    });

    it('repo is an SSH url', () => {
        const repo = 'git@github.com:phovea/phovea_core.git';
        expect(RepoUtils.toHTTPRepoUrl(repo)).toBe('https://github.com/phovea/phovea_core.git');
    });
});

describe('transfroms repo to a SSH url', () => {

    it('repo is already a SSH url', () => {
        const repo = 'git@github.com:phovea/phovea_core.git';
        expect(RepoUtils.toSSHRepoUrl(repo)).toBe(repo);
    });

    it('repo is an http url', () => {
        const repo = 'http://github.com/phovea/phovea_core.git';
        expect(RepoUtils.toSSHRepoUrl(repo)).toBe('git@github.com:phovea/phovea_core.git');
    });

    it('repo is an https url', () => {
        const repo = 'https://github.com/phovea/phovea_core.git';
        expect(RepoUtils.toSSHRepoUrl(repo)).toBe('git@github.com:phovea/phovea_core.git');
    });

    it('repo is only the name of the repo', () => {
        const repo = 'ordino_public';
        expect(RepoUtils.toSSHRepoUrl(repo)).toBe('git@github.com:Caleydo/ordino_public.git');
    });
});

describe('transfroms a http(s) to a SSH url', () => {

    it('repo is an empty string', () => {
        const repo = '';
        expect(RepoUtils.toSSHRepoUrlFromHTTP(repo)).toBe('');
    });

    it('repo is already a SSH url', () => {
        const repo = 'git@github.com:phovea/phovea_core.git';
        expect(RepoUtils.toSSHRepoUrlFromHTTP(repo)).toBe(repo);
    });

    it('repo is an http url', () => {
        const repo = 'http://github.com/phovea/phovea_core.git';
        expect(RepoUtils.toSSHRepoUrlFromHTTP(repo)).toBe('git@github.com:phovea/phovea_core.git');
    });
});

describe('extract `organization/repo` from a SSH or an http url', () => {

    it('repo is an empty string', () => {
        const repo = '';
        expect(RepoUtils.simplifyRepoUrl(repo)).toBe('');
    });

    it('repo is a SSH url', () => {
        const repo = 'git@github.com:phovea/phovea_core.git';
        expect(RepoUtils.simplifyRepoUrl(repo)).toBe('phovea/phovea_core');
    });

    it('repo is an http url', () => {
        const repo = 'http://github.com/phovea/phovea_core.git';
        expect(RepoUtils.simplifyRepoUrl(repo)).toBe('phovea/phovea_core');
    });
});

describe('prefix repo name with organization name`', () => {

    it('repo already contains organization', () => {
        const repo = 'Caleydo/ordino';
        expect(RepoUtils.toBaseName(repo)).toBe(repo);
    });

    it('repo does not contain organization', () => {
        const repo = 'ordino';
        expect(RepoUtils.toBaseName(repo)).toBe('Caleydo/ordino');
    });
});

describe('extact repo name from string containing `org/repo`', () => {

    it('repo contains org', () => {
        const repo = 'Caleydo/ordino';
        expect(RepoUtils.toCWD(repo)).toBe('ordino');
    });

    it('repo is a product', () => {
        const repo = 'Caleydo/ordino_product';
        expect(RepoUtils.toCWD(repo)).toBe('ordino');
    });

    it('repo does not contain org', () => {
        const repo = 'ordino';
        expect(RepoUtils.toCWD(repo)).toBe('ordino');
    });
});

describe('parse phovea_product.json', () => {
    const result = [
        {repo: 'Caleydo/ordino_public', branch: 'develop'},
        {repo: 'phovea/phovea_core', branch: 'develop'},
        {repo: 'phovea/phovea_ui', branch: 'develop'},
        {repo: 'phovea/phovea_clue', branch: 'develop'},
        {repo: 'phovea/phovea_security_flask', branch: 'develop'},
        {repo: 'datavisyn/tdp_core', branch: 'develop'},
        {repo: 'Caleydo/ordino', branch: 'develop'},
        {repo: 'Caleydo/tdp_gene', branch: 'develop'},
        {repo: 'Caleydo/tdp_publicdb', branch: 'develop'},
        {repo: 'phovea/phovea_server', branch: 'develop'},
        {repo: 'phovea/phovea_data_redis', branch: 'develop'},
        {repo: 'phovea/phovea_data_mongo', branch: 'develop'}
    ];

    const dummyProduct = fs.readJSONSync(path.join(__dirname, `templates/phovea_product_dummy.json`));
    it('resulting object has correct structure', () => {
        expect(RepoUtils.parsePhoveaProduct(dummyProduct)).toStrictEqual(result);
    });
});


describe('test toLibraryAliasMap()', () => {

    const mockedAliases = {
        'd3': "d3/d3",
        'font-awesome': 'fw/font-awesome'
    };

    jest.mock('../utils/known', () => {
        return {
            plugin: {
                byName: () => {
                    return {
                        aliases: mockedAliases
                    };
                }
            },
            lib: {
                byName: () => {
                    return {
                        aliases: mockedAliases
                    };
                }
            }
        };
    });


    it('finds the correct aliases of the modules and libraries', () => {
        const moduleNames = [
            'phovea_core',
            'phovea_d3',
            'phovea_ui',
            'phovea_importer',
        ];
        const libraryNames = [
            'd3',
            'd3v5',
            'lineupjs', 'font-awesome',
            'bootstrap', 'select2',
            'd3', 'jquery',
        ];
        expect(RepoUtils.toLibraryAliasMap(moduleNames, libraryNames)).toMatchObject(mockedAliases);
    });

    it('returns an empty object if no modules or libraries are provided', () => {

        expect(RepoUtils.toLibraryAliasMap([], [])).toMatchObject({});
    });
});