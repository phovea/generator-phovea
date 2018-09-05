'use strict';

const semver = require('semver');
const {intersect} = require('semver-intersect');

module.exports.mergeVersions = (name, versions) => {
  // create set
  versions = Array.from(new Set(versions));
  if (versions.length === 1) {
    return versions[0];
  }
  const gitBranch = versions.find((d) => d.startsWith('github:'));
  if (gitBranch) {
    return gitBranch;
  }
  // first try to find a good intersection
  try {
    return intersect(...versions).toString();
  } catch(e) {
    // map to base version, sort descending take first
    const max = versions.map(semver.coerce).sort(semver.rcompare)[0] || versions[versions.length - 1];
    console.warn(`cannot find common intersecting version for ${name} = ${versions.join(', ')}, taking max "${max}" for now`);
    return max.toString();
  }
}

function toSemVer(version) {
  if (version.startsWith('~=')) {
    return `~${version.slice(2)}`;
  }
  if (version.startsWith('^=')) {
    return `^${version.slice(2)}`;
  }
  if (version.startsWith('==')) {
    return version.slice(2);
  }
  return version;
}

function toPipVersion(version) {
  if (!version) {
    return null;
  }
  version = version.toString();
  if (version.startsWith('~')) {
    return `~=${version.slice(1)}`;
  }
  if (version.startsWith('^')) {
    return `^=${version.slice(1)}`;
  }
  // TODO range
  // fix
  return `==${version}`;
}

module.exports.mergePipVersions = (name, versions) => {
  versions = Array.from(new Set(versions)).filter(Boolean); // unique + not empty entries
  if (versions.length === 0) {
    return '';
  }
  if (versions.length === 1) {
    return versions[0];
  }
  const gitBranch = versions.find((d) => d.startsWith('@'));
  if (gitBranch) {
    return gitBranch;
  }

  const nodeVersions = versions.map(toSemVer);
  // first try to find a good intersection
  try {
    return toPipVersion(intersect(...nodeVersions).toString());
  } catch(e) {
    // map to base version, sort descending take first
    const max = toPipVersion(nodeVersions.map(semver.coerce).sort(semver.rcompare)[0]) || versions[versions.length - 1];
    console.warn(`cannot find common intersecting version for ${name} = ${versions.join(', ')}, taking max "${max}" for now`);
    return max.toString();
  }
}
