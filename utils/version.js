'use strict';

const semver = require('semver');
const chalk= require('chalk');
const {
  intersect
} = require('semver-intersect');

module.exports.mergeVersions = (name, versions) => {
  if (versions.some((v) => v === 'latest')) {
    throw new Error(chalk.red('Invalid version. Please avoid using version latest in package.json.'));
  }
  // create set
  versions = Array.from(new Set(versions));
  if (versions.length === 1) {
    return versions[0];
  }
  const gitBranches = versions.filter((d) => d.includes('github') || d.includes('gitlab'));

  if (gitBranches.length) {
    const haveCommonVersions = (branches) => {
      versions = new Set(branches.map((branch) => branch.split('#')[1]));
      return versions.size === 1;
    };
    if (haveCommonVersions(gitBranches)) {
      return gitBranches[0];
    }

    throw new Error(chalk.red(`Versions ${chalk.white(gitBranches.join(', '))} point to different branches, which can lead to workspace errors.\nPlease use the same branch in all versions.`));
  }

  try {
    return intersect(...versions).toString();
  } catch (e) {
    // map to base version, sort descending take first
    const max = findMaxVersion(versions);
    console.warn(`cannot find common intersecting version for ${name} = ${versions.join(', ')}, taking max "${max}" for now`);
    return max.toString();
  }
};

/**
 * Finds the max version of an array of versions, i.e., `['1.2.3-alpha.1', '4.0.1-beta.0', '^3.8.0', '~4.0.0', '^2.8.0', '^4.0.0', '4.0.1-rc.0']`.
 * Can handle range(caret, tilde) and prerelease versions.
 * @param {Array} versions Array of semver versions including range versions.
 */
function findMaxVersion(versions) {
  const nonRangeVersions = versions.filter((v) => !hasRangeVersionTag(v)).map((v) => semver.prerelease(v) ? v : semver.coerce(v).version); // Filter out versions with `~` and `^`
  // Sort versions and get max. Method `semver.rcomapre()` fails when you try comparing ranges, i.e., `~2.0.0`
  const maxNonRangeVersion = nonRangeVersions.sort(semver.rcompare)[0] || nonRangeVersions[nonRangeVersions.length - 1];
  if (versions.some((v) => hasRangeVersionTag(v))) {
    const maxCaretRange = findMaxCaretRange(versions); // ['^1.0.0', '^1.2.3']--> '^1.2.3'
    const maxTildeRange = findMaxTildeRange(versions); // ['~1.0.0', '~1.2.5']--> '~1.2.5'
    const maxRange = maxCaretRange && maxTildeRange ? findMaxRange(maxTildeRange, maxCaretRange) : maxTildeRange || maxCaretRange;
    return maxNonRangeVersion && semver.gtr(maxNonRangeVersion, maxRange) ? maxNonRangeVersion : maxRange; // check maxNonRangeVersion is greater than all the versions possible in the range.
  }
  return maxNonRangeVersion;
}

/**
 * Find max between a tilde range and a caret range.
 * @param {string} tildeRange , i.e., '~2.0.3'
 * @param {string} caretRange , i.e., '^3.5.6'
 * @returns {string} Returns a tilde range or a caret range.
 */
function findMaxRange(tildeRange, caretRange) {
  const parsedCaretRange = semver.coerce(caretRange); // create a semver object from tag to access `major` and `version` properties
  const parsedTildeRange = semver.coerce(tildeRange);
  // tilde range can only be greater than caret range when its major is greater, i.e, '~3.5.6' > '^2.9.0'
  if (semver.gt(semver.coerce(parsedTildeRange.major), semver.coerce(parsedCaretRange.major))) {
    return tildeRange;
  } else {  // in any other case the caret range is greater (has a greater upper domain)
    return caretRange;
  }
}

/**
 * Remove caret or tilde and format version.
 * @param {string} range Possible values: `^2.3.4, `~3.0.0`.
 * @returns {string} Return a version string without the range tags (tilde, caret).
 */
function removeRangeTag(range) {
  return semver.prerelease(semver.minVersion(range)) ? semver.minVersion(range) : semver.coerce(range).version;
}

/**
 * Finds the max caret range of an array of caret ranges.
 * @param {string[]} versions Possible values: `['^2.3.4', '^3.0.0']`
 * @returns {void | string} Returns the caret range with the highest upper domain or void if there are no caret ranges in the versions array.
 */
function findMaxCaretRange(versions) {
  const caretRanges = versions.filter((v) => v.startsWith('^'));
  if (caretRanges) {
    const parsedTags = caretRanges.map((r) => removeRangeTag(r));
    const max = parsedTags.sort(semver.rcompare)[0] || caretRanges[caretRanges.length - 1];
    return caretRanges.find((r) => semver.eq(removeRangeTag(r), max));
  }
}

/**
 * Finds the max tilde range of an array of tilde ranges.
 * @param {string[]} versions Possible values: `['~2.3.4', '~3.0.0']`
 * @returns {void | string} Returns the tilde range with the highest upper domain or void if there are no tilde ranges in the versions array.
 */
function findMaxTildeRange(versions) {
  const tildeRanges = versions.filter((v) => v.startsWith('~'));
  if (tildeRanges) {
    const parsedTags = tildeRanges.map((r) => removeRangeTag(r));
    const max = parsedTags.sort(semver.rcompare)[0] || tildeRanges[tildeRanges.length - 1];
    return tildeRanges.find((r) => semver.eq(removeRangeTag(r), max));
  }
}

/**
 * Check if version is a caret or a tilde range.
 * @param {string} version Possible values: `^=2.0.0`, `~3.5.6`, `3.4.5`.
 * @returns {boolean}
 */
function hasRangeVersionTag(version) {
  return /^[\^~]/gi.test(version);
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


module.exports.findMaxVersion = findMaxVersion;
