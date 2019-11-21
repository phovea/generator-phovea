'use strict';

const version = require('../utils/version');

describe('check isGitCommit()', () => {
  it('check `451709494a48af64a8a4876063c244edf41d2643` === true', () => {
    expect(version.isGitCommit('451709494a48af64a8a4876063c244edf41d2643')).toBeTruthy();
  });

  it('check `8747a43780e4651542facd7b4feac7bcb8e3778d` === true', () => {
    expect(version.isGitCommit('8747a43780e4651542facd7b4feac7bcb8e3778d')).toBeTruthy()
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
