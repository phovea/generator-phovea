'use strict';
const {intersect} = require('semver-intersect');
const version = require('../utils/version');

describe('check isGitCommit()', () => {
  it('check `451709494a48af64a8a4876063c244edf41d2643` === true', () => {
    expect(version.isGitCommit('451709494a48af64a8a4876063c244edf41d2643')).toBeTruthy();
  });

  it('check `8747a43780e4651542facd7b4feac7bcb8e3778d` === true', () => {
    expect(version.isGitCommit('8747a43780e4651542facd7b4feac7bcb8e3778d')).toBeTruthy();
  });

  it('check `develop` === false', () => {
    expect(version.isGitCommit('develop')).toBeFalsy();
  });

  it('check `v2.0.0` === false', () => {
    expect(version.isGitCommit('v2.0.0')).toBeFalsy();
  });

  it('check `~v2.0.0` === false', () => {
    expect(version.isGitCommit('~v2.0.0')).toBeFalsy();
  });

  it('check `^v2.0.0` === false', () => {
    expect(version.isGitCommit('^v2.0.0')).toBeFalsy();
  });

  it('check `2.0.0` === false', () => {
    expect(version.isGitCommit('2.0.0')).toBeFalsy();
  });

  it('check `~2.0.0` === false', () => {
    expect(version.isGitCommit('~2.0.0')).toBeFalsy();
  });

  it('check `^2.0.0` === false', () => {
    expect(version.isGitCommit('^2.0.0')).toBeFalsy();
  });
});

describe('check isExactVersionTag()', () => {
  it('check `develop` === false', () => {
    expect(version.isExactVersionTag('develop')).toBeFalsy();
  });

  it('check `v2.0.0` === true', () => {
    expect(version.isExactVersionTag('v2.0.0')).toBeTruthy();
  });

  it('check `~v2.0.0` === false', () => {
    expect(version.isExactVersionTag('~v2.0.0')).toBeFalsy();
  });

  it('check `^v2.0.0` === false', () => {
    expect(version.isExactVersionTag('^v2.0.0')).toBeFalsy();
  });

  it('check `2.0.0` === false', () => {
    expect(version.isExactVersionTag('2.0.0')).toBeFalsy();
  });

  it('check `~2.0.0` === false', () => {
    expect(version.isExactVersionTag('~2.0.0')).toBeFalsy();
  });

  it('check `^2.0.0` === false', () => {
    expect(version.isExactVersionTag('^2.0.0')).toBeFalsy();
  });
});

describe('check isAdvancedVersionTag()', () => {
  it('check `develop` === false', () => {
    expect(version.isAdvancedVersionTag('develop')).toBeFalsy();
  });

  it('check `v2.0.0` === false', () => {
    expect(version.isAdvancedVersionTag('v2.0.0')).toBeFalsy();
  });

  it('check `~v2.0.0` === true', () => {
    expect(version.isAdvancedVersionTag('~v2.0.0')).toBeTruthy();
  });

  it('check `^v2.0.0` === true', () => {
    expect(version.isAdvancedVersionTag('^v2.0.0')).toBeTruthy();
  });

  it('check `2.0.0` === false', () => {
    expect(version.isAdvancedVersionTag('2.0.0')).toBeFalsy();
  });

  it('check `~2.0.0` === false', () => {
    expect(version.isAdvancedVersionTag('~2.0.0')).toBeFalsy();
  });

  it('check `^2.0.0` === false', () => {
    expect(version.isAdvancedVersionTag('^2.0.0')).toBeFalsy();
  });
});

describe('transform git log to version tags list', () => {
  const gitLog = `451709494a48af64a8a4876063c244edf41d2643        refs/tags/caleydo_web
  a1d4f93a626d71937bc35b23d3715eaf34cce4a1        refs/tags/v0.0.5
  921409de073f4329c09a4602622e87d816de266f        refs/tags/v0.1.0
  9815eb1163b212e06b7239a0bf6f97b0fbc2cf0c        refs/tags/v1.0.0
  e61c59f8c09e51e0b25f2087ad92789c26d58c11        refs/tags/v1.0.0^{}
  336072e87ec8f6054cead9f64c6830897fb7f076        refs/tags/v2.0.0
  8747a43780e4651542facd7b4feac7bcb8e3778d        refs/tags/v2.0.1
  ebb538469a661dc4a8c5646ca1bb11259f2ba2bb        refs/tags/v2.0.1^{}
  c073da02dbb1c8185a5d50266f78b9688dd4403a        refs/tags/v2.1.0
  53f68e0768df23b173f59d22ea90f61c478b8450        refs/tags/v2.1.1
  `;

  const versionTags = version.extractVersionsFromGitLog(gitLog);

  it('check number of extracted versions', () => {
    expect(versionTags.length).toBe(7);
  });

  it('check if tags without `v` are removed', () => {
    expect(versionTags.indexOf('caleydo_web')).toBe(-1);
  });

  it('check if tags ending with `^{}` are removed', () => {
    expect(versionTags.indexOf('v1.0.0^{}')).toBe(-1);
    expect(versionTags.filter((v) => v === 'v1.0.0').length).toBe(1);
  });

  it('find specific version tag in list', () => {
    expect(versionTags.indexOf('v0.0.5')).toBe(0);
  });
});

describe('check semver.satisfies', () => {
  const semver = require('semver');

  it('check against target version with caret operator', () => {
    const targetVersion = '^v2.0.0';
    expect(semver.satisfies('v1.0.0', targetVersion)).toBeFalsy();
    expect(semver.satisfies('v2.0.0', targetVersion)).toBeTruthy();
    expect(semver.satisfies('v2.0.1', targetVersion)).toBeTruthy();
    expect(semver.satisfies('v2.0.2', targetVersion)).toBeTruthy();
    expect(semver.satisfies('v2.1.0', targetVersion)).toBeTruthy();
    expect(semver.satisfies('v2.1.1', targetVersion)).toBeTruthy();
    expect(semver.satisfies('v2.1.2', targetVersion)).toBeTruthy();
    expect(semver.satisfies('v2.2.0', targetVersion)).toBeTruthy();
    expect(semver.satisfies('v2.2.1', targetVersion)).toBeTruthy();
    expect(semver.satisfies('v2.2.2', targetVersion)).toBeTruthy();
    expect(semver.satisfies('v3.0.0', targetVersion)).toBeFalsy();
    expect(semver.satisfies('v3.1.0', targetVersion)).toBeFalsy();
  });

  it('check target version with tilde operator', () => {
    const targetVersion = '~v2.0.0';
    expect(semver.satisfies('v1.0.0', targetVersion)).toBeFalsy();
    expect(semver.satisfies('v2.0.0', targetVersion)).toBeTruthy();
    expect(semver.satisfies('v2.0.1', targetVersion)).toBeTruthy();
    expect(semver.satisfies('v2.0.2', targetVersion)).toBeTruthy();
    expect(semver.satisfies('v2.1.0', targetVersion)).toBeFalsy();
    expect(semver.satisfies('v2.1.1', targetVersion)).toBeFalsy();
    expect(semver.satisfies('v2.1.2', targetVersion)).toBeFalsy();
    expect(semver.satisfies('v2.2.0', targetVersion)).toBeFalsy();
    expect(semver.satisfies('v2.2.1', targetVersion)).toBeFalsy();
    expect(semver.satisfies('v2.2.2', targetVersion)).toBeFalsy();
    expect(semver.satisfies('v3.0.0', targetVersion)).toBeFalsy();
    expect(semver.satisfies('v3.1.0', targetVersion)).toBeFalsy();
  });
});

describe('find highest version from list', () => {
  const sourceVersions = [
    'v0.0.5',
    'v0.1.0',
    'v1.0.0',
    'v2.1.0', // note: out of order to test sorting
    'v2.2.0', // note: out of order to test sorting
    'v2.0.0',
    'v2.0.1',
    'v2.0.2',
    'v2.1.1',
    'v2.1.2',
    'v2.2.1',
    'v2.2.2',
    'v3.0.0',
    'v3.1.0'
  ];

  it('find exact version `v2.0.0`', () => {
    const targetVersion = 'v2.0.0';
    expect(version.findHighestVersion(sourceVersions, targetVersion)).toBe('v2.0.0');
  });

  it('find patch version `~v2.0.0`', () => {
    const targetVersion = '~v2.0.0';
    expect(version.findHighestVersion(sourceVersions, targetVersion)).toBe('v2.0.2');
  });

  it('find minor version `^v2.0.0`', () => {
    const targetVersion = '^v2.0.0';
    expect(version.findHighestVersion(sourceVersions, targetVersion)).toBe('v2.2.2');
  });

  it('find non-existing `v4.0.0`', () => {
    const targetVersion = 'v4.0.0';
    expect(version.findHighestVersion(sourceVersions, targetVersion)).toBeUndefined();
  });

  it('find non-existing `^v3.2.0`', () => {
    const targetVersion = '^v3.2.0';
    expect(version.findHighestVersion(sourceVersions, targetVersion)).toBeUndefined();
  });
});

describe('find max version or range version from list', () => {

  it('works for simple versions arrays', () => {
    const versions = ['0.0.5', '0.1.0', '1.0.0', '2.1.0', '2.2.0'];
    expect(version.findMaxVersion(versions)).toBe('2.2.0');
  });

  it('works for arrays with prerelease versions', () => {
    const versions = ['4.2.0-alpha.1', '4.2.0-beta.0', '0.1.0', '1.0.0', '2.1.0', '2.2.0'];
    expect(version.findMaxVersion(versions)).toBe('4.2.0-beta.0');
  });

  it('works for arrays with prerelease and tilde ranges', () => {
    const versions = ['4.2.0-alpha.1', '4.2.0-beta.0', '0.1.0', '~4.2.0', '2.1.0', '~2.2.0'];
    expect(version.findMaxVersion(versions)).toBe('~4.2.0');
  });

  it('works for arrays with prerelease, tilde and caret ranges', () => {
    const versions = ['4.2.0-alpha.1', '4.2.0-beta.0', '^4.2.0', '~4.2.0', '2.1.0', '~2.2.0'];
    expect(version.findMaxVersion(versions)).toBe('^4.2.0');
  });

  it('works for `^4.2.0`', () => {
    const versions = ['4.2.0-alpha.1', '4.2.0-beta.0', '^4.2.0', '~4.2.0', '2.1.0', '~2.2.0'];
    expect(version.findMaxVersion(versions)).toBe('^4.2.0');
  });

  it('works for caret prerelease ranges', () => {
    const versions = ['^4.2.0-alpha.1', '^4.2.0-beta.0', '^4.1.0', '2.1.0', '~2.2.0'];
    expect(version.findMaxVersion(versions)).toBe('^4.2.0-beta.0');
  });

  it('works for tilde prerelease ranges', () => {
    const versions = ['~4.2.0-alpha.1', '~4.2.0-beta.0', '~4.1.0', '2.1.0', '~2.2.0'];
    expect(version.findMaxVersion(versions)).toBe('~4.2.0-beta.0');
  });

  it('works for tilde and caret prerelease ranges', () => {
    const versions = ['~4.2.0-alpha.1', '^4.2.0-rc.0', '~4.2.0-beta.1', '^4.1.0', '2.1.0', '~2.2.0'];
    expect(version.findMaxVersion(versions)).toBe('^4.2.0-rc.0');
  });

  it('works for versions that start with `v`', () => {
    const versions = ['~4.2.0-alpha.1', '^4.2.0-rc.0', '~4.2.0-beta.1', '^4.1.0', 'v5.1.0', '~2.2.0'];
    expect(version.findMaxVersion(versions)).toBe('5.1.0');
  });

  it('works for versions of the format `5.1`', () => {
    const versions = ['~4.2.0-alpha.1', '^4.2.0-rc.0', '~4.2.0-beta.1', '^4.1.0', '5.1', '~2.2.0'];
    expect(version.findMaxVersion(versions)).toBe('5.1.0');
  });

  it('works if versions are all ranges', () => {
    const versions = ['^2.9.0', '~2.8.1'];
    expect(version.findMaxVersion(versions)).toBe('^2.9.0');
  });
});

describe('semver-intersect works for prerelease ranges', () => {

  it('finds intersection of an array of prerelease ranges', () => {
    const versions = ['~4.2.0-alpha.1', '~4.2.0-beta.1',];
    expect(intersect(...versions)).toBe('~4.2.0-beta.1');
  });
});

describe('find intersection or max version of github or gitlab version tags', () => {

  it('returns first correct gitlab tag', () => {
    const name = 'target360';
    const versions = [
      'git+ssh://git@gitlab.customer.com:Target360/plugins/target360#dv_develop',
      'git+ssh://git@gitlab.customer.com:Target360/plugins/target360#dv_develop',
      '4.0.0'
    ];
    expect(version.mergeVersions(name, versions)).toBe('git+ssh://git@gitlab.customer.com:Target360/plugins/target360#dv_develop');
  });

  it('returns first correct githab tag', () => {
    const name = 'phovea_core';
    const versions = [
      'github:phovea/phovea_core#develop',
      'github:phovea/phovea_core#develop',
      '5.0.0'
    ];
    expect(version.mergeVersions(name, versions)).toBe('github:phovea/phovea_core#develop');
  });

  it('throws error if versions point to different gitlab branches', () => {
    const name = 'target360';
    const versions = [
      'git+ssh://git@gitlab.customer.com:Target360/plugins/target360#dv_develop',
      'git+ssh://git@gitlab.customer.com:Target360/plugins/target360#master',
      '4.0.0'
    ];
    expect(() => version.mergeVersions(name, versions)).toThrow();
  });

  it('returns correct intersection of github ranges', () => {
    const name = 'phovea_core';
    const versions = [
      'github:phovea/phovea_core#semver:^7.0.1',
      'github:phovea/phovea_core#semver:^7.0.0',
    ];
    expect(version.mergeVersions(name, versions)).toBe('github:phovea/phovea_core#semver:^7.0.1');
  });

  it('throws error if versions contain both github and gitlab', () => {
    const name = 'phovea_core';
    const versions = [
      'github:phovea/phovea_core#semver:^7.0.1',
      'git+ssh://git@gitlab.customer.com:Target360/plugins/target360#master',
    ];
    expect(() => version.mergeVersions(name, versions)).toThrow();
  });

  it('throws error if versions 2 different github versions', () => {
    const name = 'phovea_core';
    const versions = [
      'github:phovea/phovea_core#semver:^7.0.1',
      'github:phovea/phovea_core#develop',
    ];
    expect(() => version.mergeVersions(name, versions)).toThrow();
  });

  it('returns github version if one of the versions is a github semver version bigger than the rest', () => {
    const name = 'phovea_core';
    const versions = [
      'github:phovea/phovea_core#semver:^7.0.1',
      '4.0.0',
    ];
    expect(version.mergeVersions(name, versions)).toBe('github:phovea/phovea_core#semver:^7.0.1');
  });

  it('returns correct max github version', () => {
    const name = 'phovea_core';
    const versions = [
      'github:phovea/phovea_core#semver:^7.0.1',
      'github:phovea/phovea_core#semver:^8.0.0'
    ];
    expect(version.mergeVersions(name, versions)).toBe('github:phovea/phovea_core#semver:^8.0.0');
  });

  it('compares github version with npm version', () => {
    const name = 'phovea_core';
    const versions = [
      'github:phovea/phovea_core#semver:^7.0.1',
      '^8.0.0'
    ];
    expect(version.mergeVersions(name, versions)).toBe('^8.0.0');
  });

  it('compares an equal github version with an npm version', () => {
    const name = 'phovea_core';
    const versions = [
      'github:phovea/phovea_core#semver:^7.0.1',
      '^7.0.1'
    ];
    expect(version.mergeVersions(name, versions)).toBe('github:phovea/phovea_core#semver:^7.0.1');
  });

  it('compares multiple github and npm versions', () => {
    const name = 'phovea_core';
    const versions = [
      'github:phovea/phovea_core#semver:^7.0.1',
      'github:phovea/phovea_core#semver:^6.0.1',
      '^7.0.1',
      '^7.0.2'
    ];
    expect(version.mergeVersions(name, versions)).toBe('^7.0.2');
  });

  it('finds the intersection of a git version and npm version', () => {
    const name = 'phovea_core';
    const versions = [
      'github:phovea/phovea_core#semver:~7.0.1',
      'github:phovea/phovea_core#semver:^6.0.1',
      '^7.0.1',
    ];
    expect(version.mergeVersions(name, versions)).toBe('github:phovea/phovea_core#semver:~7.0.1');
  });
});
