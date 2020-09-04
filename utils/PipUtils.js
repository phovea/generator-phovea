'use strict';

const semver = require('semver');
const {intersect} = require('semver-intersect');


module.exports = class PipUtils {

    /**
     * Finds the intersection of an array of pip versions, i.e, `^=2.2.0`. If no intersection exists the maximum version is returned.
     * @param {string} name Name of the requirement.
     * @param {string[]} versions Array of versions found for the requirement in the different workspace plugins.
     * TODO find the correct max version for ranges...
     */
    static mergePipVersions(name, versions) {
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

        const nodeVersions = versions.map(PipUtils.toSemVer);
        // first try to find a good intersection
        try {
            return PipUtils.toPipVersion(intersect(...nodeVersions).toString());
        } catch (e) {
            // map to base version, sort descending take first
            const max = PipUtils.toPipVersion(nodeVersions.map(semver.coerce).sort(semver.rcompare)[0]) || versions[versions.length - 1];
            console.warn(`cannot find common intersecting version for ${name} = ${versions.join(', ')}, taking max "${max}" for now`);
            return max.toString();
        }
    }

    /**
     * Transforms a pip to semver version, i.e, `~=2.0.0` --> `~2.0.0`
     * @param {string} version 
     */
    static toSemVer(version) {
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

    /**
     * Transforms a semver to pip version, i.e, `2.0.0` --> `==2.0.0`
     * @param {string} version 
     */
    static toPipVersion(version) {
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

    /**
     * Transform the requirements.txt file from a string to an object with name as key and version as value.
     * @param {string} file Requirements.txt file.
     */
    static parseRequirements(file) {
        if (!file) {
            return {};
        }
        file = file.trim();
        if (file === '') {
            return {};
        }
        const versions = {};
        file.split('\n').forEach((line) => {
            line = line.trim();

            if (line.startsWith('-e')) {
                // editable special dependency
                const branchSeparator = line.indexOf('@');
                const name = line.slice(0, branchSeparator).trim();
                versions[name] = line.slice(branchSeparator).trim();
                return;
            }

            if (line.startsWith('#') || line.startsWith('-')) {
                return; // skip
            }
            const versionSeparator = line.search(/[\^~=>!]/);
            if (versionSeparator >= 0) {
                const name = line.slice(0, versionSeparator).trim();
                versions[name] = line.slice(versionSeparator).trim();
            } else {
                versions[line] = '';
            }
        });
        return versions;
    }
};