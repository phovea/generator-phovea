'use strict';

const semver = require('semver');
const {
  intersect
} = require('semver-intersect');

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
  } catch (e) {
    // map to base version, sort descending take first
    const max = versions.map(semver.coerce).sort(semver.rcompare)[0] || versions[versions.length - 1];
    console.warn(`cannot find common intersecting version for ${name} = ${versions.join(', ')}, taking max "${max}" for now`);
    return max.toString();
  }
};

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
//
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
  } catch (e) {
    // map to base version, sort descending take first
    const max = toPipVersion(nodeVersions.map(semver.coerce).sort(semver.rcompare)[0]) || versions[versions.length - 1];
    console.warn(`cannot find common intersecting version for ${name} = ${versions.join(', ')}, taking max "${max}" for now`);
    return max.toString();
  }
};

/**
 * Extract tag names starting with `v` (e.g., `v2.0.1`) from the given git log.
 * The git log must have the structure:
 * ```
 * <git hash><tabulator>refs/tags/<tagname><new line>
 * ```
 * The output can be generated using the command `git ls-remote --tags <repository url>`
 *
 * @param {string} gitLog Console output with list of git hashes and git tags
 * @returns {string[]} Returns an array with tag names starting with `v`
 */
module.exports.extractVersionsFromGitLog = (gitLog) => {
  const regex = /refs\/tags\/([v]{1}.*[^}])\n/gm; // capture all tag names starting with `v`
  let m;
  const versionTags = [];

  while ((m = regex.exec(gitLog)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (m.index === regex.lastIndex) {
      regex.lastIndex++;
    }
    versionTags.push(m[1]);
  }

  return versionTags;
};

/**
 * Find the highest possible target version from a list of versions.
 * The target version can be a range of versions and supports the npm semver syntax.
 *
 * @param {string[]} sourceVersions List of source versions (e.g., [`2.0.0`, `v2.1.0`, ...])
 * @param {string} targetVersion version or version range supporting the npm semver syntax
 * @returns {string|undefined} Returns the highest possible version from the list of source versions
 */
module.exports.findHighestVersion = (sourceVersions, targetVersion) => {
  const semver = require('semver');

  const regex = /^([\^~])/gi; // test if target version starts with ^ or ~
  // shortcut if exact target version is required
  if (regex.test(targetVersion) === false) {
    return sourceVersions.find((v) => v === targetVersion);
  }

  const versions = sourceVersions
    .map((version) => {
      return {
        version,
        satisfied: semver.satisfies(version, targetVersion)
      };
    })
    .filter((v) => v.satisfied)
    .sort((a, b) => b.version.localeCompare(a.version)); // sort version descending

  return (versions[0]) ? versions[0].version : undefined; // first element = highest version
};

/**
 * Checks if a given name is an advanced version tag supporting npm's version ranges.
 * A version tag must start with `^v`, `~v`.
 *
 * @see https://docs.npmjs.com/misc/semver#advanced-range-syntax
 *
 * @param {string} name name to check
 * @returns {boolean} Returns `true` if name is a version tag. Otherwise returns `false`.
 */
module.exports.isAdvancedVersionTag = (name) => {
  return /^[\^~]v/gi.test(name);
};

/**
 * Checks if a given name is a version tag that starts with `v<number>`.
 *
 * @param {string} name name to check
 * @returns {boolean} Returns `true` if name is a version tag. Otherwise returns `false`.
 */
module.exports.isExactVersionTag = (name) => {
  return /^v\d+.*/gi.test(name);
};

/**
 * Checks if a given name is a git commit.
 *
 * @param {string} name name to check
 * @returns {boolean} Returns `true` if name is a git commit. Otherwise returns `false`.
 */
module.exports.isGitCommit = (name) => {
  return /^[0-9a-f]+$/gi.test(name);
};
