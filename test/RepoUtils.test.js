'use strict';
const RepoUtils = require('../utils/RepoUtils');

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