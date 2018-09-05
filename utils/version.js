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
    return intersect(...versions);
  } catch(e) {
    // map to base version, sort descending take first
    const max = versions.map(semver.coerce).sort(semver.rcompare)[0] || versions[versions.length - 1];
    console.warn(`cannot find common intersecting version for ${name} = ${versions}, taking max "${max}" for now`);
    return max.toString();
  }
}
