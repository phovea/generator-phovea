'use strict';

const semver = require('semver');
const chalk = require('chalk');
const {intersect} = require('semver-intersect');


module.exports = class NpmUtils {

    /**
     * Finds the intersection of an array of semver versions. If no intersection exists the maximum version is returned.
     * @param {string} name Name of the dependency.
     * @param {string[]} versions Array of versions found for the dependency in the different workspace plugins.
     */
    static mergeVersions(name, versions, logWarning = true) {
        if (versions.some((v) => v === 'latest')) {
            throw new Error(chalk.red('Invalid version. Please avoid using version latest in package.json.'));
        }
        // create set
        versions = Array.from(new Set(versions));
        if (versions.length === 1) {
            return versions[0];
        }
        // filter for github and gitlab version strings
        const gitRepos = versions.filter((d) => d.includes('github') || d.includes('gitlab'));
        // npm version strings
        const noGitRepos = versions.filter((v) => !gitRepos.includes(v));

        if (gitRepos.length) {
            return NpmUtils.mergeGithubVersions(name, gitRepos, noGitRepos);
        }

        try {
            return intersect(...noGitRepos).toString();
        } catch (e) {
            // map to base version, sort descending take first
            const max = NpmUtils.findMaxVersion(noGitRepos);
            if (logWarning) {
                console.warn(`cannot find common intersecting version for ${name} = ${versions.join(', ')}, taking max "${max}" for now`);
            }

            return max.toString();
        }
    }

    /**
     * Extracts git version strings, compares them with the npm versions and returns the intersection or max
     * @param {string} name Name of the dependency
     * @param {string[]} gitBranches Git version strings, i.e, `github:phovea/phovea_core#semver:~7.0.1`
     * @param {string[]} npmVersions Npm version strings, i.e, `^7.0.0`
     */
    static mergeGithubVersions(name, gitBranches, npmVersions) {
        const versions = Array.from(new Set(gitBranches.map((branch) => branch.split('#')[1])));
        const areSemverVersions = versions.every((version) => version.includes('semver'));
        if (areSemverVersions) {
            const prefix = gitBranches[0].split('#')[0];
            const parsedSemver = versions.map((version) => version.replace('semver:', ''));
            const gitVersion = NpmUtils.mergeVersions(name, parsedSemver, false);
            const allVersions = [gitVersion, ...npmVersions];
            const max = NpmUtils.mergeVersions(name, allVersions, false);
            const areEqual = (v1, v2) => v1 === NpmUtils.mergeVersions(name, [v1, v2], false);
            return areEqual(gitVersion, max) ? `${prefix}#semver:${gitVersion}` : max;
        }

        const uniqueGitBranchesCount = versions.length;
        if (uniqueGitBranchesCount === 1) {
            return gitBranches[0];
        }

        throw new Error(chalk.red(`Versions ${chalk.white(gitBranches.join(', '))} point to different branches, which can lead to workspace errors.\nPlease use the same branch in all versions.`));
    }

    /**
     * Finds the max version of an array of versions, i.e., `['1.2.3-alpha.1', '4.0.1-beta.0', '^3.8.0', '~4.0.0', '^2.8.0', '^4.0.0', '4.0.1-rc.0']`.
     * Can handle range(caret, tilde) and prerelease versions.
     * @param {Array} versions Array of semver versions including range versions.
     */
    static findMaxVersion(versions) {
        const nonRangeVersions = versions.filter((v) => !NpmUtils.hasRangeVersionTag(v)).map((v) => semver.prerelease(v) ? v : semver.coerce(v).version); // Filter out versions with `~` and `^`
        // Sort versions and get max. Method `semver.rcomapre()` fails when you try comparing ranges, i.e., `~2.0.0`
        const maxNonRangeVersion = nonRangeVersions.sort(semver.rcompare)[0] || nonRangeVersions[nonRangeVersions.length - 1];
        if (versions.some((v) => NpmUtils.hasRangeVersionTag(v))) {
            const maxCaretRange = NpmUtils.findMaxCaretRange(versions); // ['^1.0.0', '^1.2.3']--> '^1.2.3'
            const maxTildeRange = NpmUtils.findMaxTildeRange(versions); // ['~1.0.0', '~1.2.5']--> '~1.2.5'
            const maxRange = maxCaretRange && maxTildeRange ? NpmUtils.findMaxRange(maxTildeRange, maxCaretRange) : maxTildeRange || maxCaretRange;
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
    static findMaxRange(tildeRange, caretRange) {
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
    static removeRangeTag(range) {
        return semver.prerelease(semver.minVersion(range)) ? semver.minVersion(range) : semver.coerce(range).version;
    }

    /**
     * Finds the max caret range of an array of caret ranges.
     * @param {string[]} versions Possible values: `['^2.3.4', '^3.0.0']`
     * @returns {void | string} Returns the caret range with the highest upper domain or void if there are no caret ranges in the versions array.
     */
    static findMaxCaretRange(versions) {
        const caretRanges = versions.filter((v) => v.startsWith('^'));
        if (caretRanges) {
            const parsedTags = caretRanges.map((r) => NpmUtils.removeRangeTag(r));
            const max = parsedTags.sort(semver.rcompare)[0] || caretRanges[caretRanges.length - 1];
            return caretRanges.find((r) => semver.eq(NpmUtils.removeRangeTag(r), max));
        }
    }

    /**
     * Finds the max tilde range of an array of tilde ranges.
     * @param {string[]} versions Possible values: `['~2.3.4', '~3.0.0']`
     * @returns {void | string} Returns the tilde range with the highest upper domain or void if there are no tilde ranges in the versions array.
     */
    static findMaxTildeRange(versions) {
        const tildeRanges = versions.filter((v) => v.startsWith('~'));
        if (tildeRanges) {
            const parsedTags = tildeRanges.map((r) => NpmUtils.removeRangeTag(r));
            const max = parsedTags.sort(semver.rcompare)[0] || tildeRanges[tildeRanges.length - 1];
            return tildeRanges.find((r) => semver.eq(NpmUtils.removeRangeTag(r), max));
        }
    }

    /**
     * Check if version is a caret or a tilde range.
     * @param {string} version Possible values: `^=2.0.0`, `~3.5.6`, `3.4.5`.
     * @returns {boolean}
     */
    static hasRangeVersionTag(version) {
        return /^[\^~]/gi.test(version);
    }

    /**
     * Find the highest possible target version from a list of versions.
     * The target version can be a range of versions and supports the npm semver syntax.
     *
     * @param {string[]} sourceVersions List of source versions (e.g., [`2.0.0`, `v2.1.0`, ...])
     * @param {string} targetVersion version or version range supporting the npm semver syntax
     * @returns {string|undefined} Returns the highest possible version from the list of source versions
     */
    static findHighestVersion(sourceVersions, targetVersion) {
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
    }

    /**
     * Checks if a given name is a git commit.
     *
     * @param {string} name name to check
     * @returns {boolean} Returns `true` if name is a git commit. Otherwise returns `false`.
     */
    static isGitCommit(name) {
        return /^[0-9a-f]+$/gi.test(name);
    }

    /**
     * Checks if a given name is a version tag that starts with `v<number>`.
     *
     * @param {string} name name to check
     * @returns {boolean} Returns `true` if name is a version tag. Otherwise returns `false`.
     */
    static isExactVersionTag(name) {
        return /^v\d+.*/gi.test(name);
    }

    /**
     * Checks if a given name is an advanced version tag supporting npm's version ranges.
     * A version tag must start with `^v`, `~v`.
     *
     * @see https://docs.npmjs.com/misc/semver#advanced-range-syntax
     *
     * @param {string} name name to check
     * @returns {boolean} Returns `true` if name is a version tag. Otherwise returns `false`.
     */
    static isAdvancedVersionTag(name) {
        return /^[\^~]v/gi.test(name);
    }

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
    static extractVersionsFromGitLog(gitLog) {
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
    }
    /**
     * Checks if version contains `-` thus branch is not master.
     * @param {string} version Package.json version
     */
    static useDevVersion(version) {
        return (version || '').includes('-');
    }

    static decrementVersion(version) {
        version = semver.parse(version, {loose: true});
        version.major -= 1;
        return version.format();
    }
};