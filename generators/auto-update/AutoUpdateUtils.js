const fse = require('fs-extra');
const path = require('path');
const NpmUtils = require('../../utils/NpmUtils');
const glob = require('glob').sync;
const semver = require('semver');

class AutoUpdateUtils {
    static async autoUpdate(repo, pluginType, currentVersion, targetVersion, cwd, parent) {
        const updatesDir = path.join(__dirname, 'updates');
        const excecuteUpdates = AutoUpdateUtils.getAvailableUpdates(updatesDir).filter((version) => semver.gtr(version, currentVersion));
        return parent.newListr(
            [...excecuteUpdates.map((version) => {
                return {
                    title: 'update ' + version,
                    options: {
                        bottomBar: Infinity,
                        persistentOutput: true
                    },
                    task: async (ctx, task) => AutoUpdateUtils.updateLogic(version, targetVersion, pluginType, cwd, task, ctx)
                };
            })], { exitOnError: true, concurrent: false, rendererOptions: { showErrorMessage: true, collapseErrors: false, collapse: false } }
        );
    }

    /**
     * Runs a single update and writes version to yo-rc.json if successful.
     * @param {*} nextVersion 
     * @param {*} targetVersion 
     * @param {*} pluginType 
     * @param {*} cwd 
     * @param {*} task 
     * @param {*} ctx 
     */
    static async updateLogic(nextVersion, targetVersion, pluginType, cwd, task, ctx) {
        const filePath = `./updates/update-${nextVersion}.js`;
        const repo = path.basename(cwd);
        const { update, description } = require(filePath);

        const log = (text) => task.output = text;
        const currentVersion = AutoUpdateUtils.readConfig('localVersion', cwd) || NpmUtils.decrementVersion(targetVersion);

        if (currentVersion === nextVersion) {
            throw new Error(`${repo}: Duplicate version tag "${currentVersion}"`);
        }
        return update(repo, pluginType, cwd, log)
            .then(async () => {
                AutoUpdateUtils.setConfig('localVersion', nextVersion, cwd);
                return ctx[repo].descriptions.push(`#### ${currentVersion} to ${nextVersion}\n ${description}`);
            })

            .catch((e) => {
                const msg = `${repo}: Update ${currentVersion} to ${nextVersion} failed with ${e.message}`;
                e.message = msg;
                throw e;
            });
    }

    /**
     * Reads and sorts all available updates by their versions.
     * @param {string} updatesDir Absolute path to the updates dir.
     * @returns {string[]} The versions in ascending order.
     */
    static getAvailableUpdates(updatesDir) {
        const files = glob('update-*.js', {
            cwd: updatesDir
        }) || [];
        const versions = files.map((file) => file.match(/(?<=update-).*?(?=.js)/)[0]);
        return semver.sort(versions);
    }

    /**
     * Sets a key in `.yo-rc.json`.
     * @param {string} key Key name
     * @param {string} value Value
     * @param {string} cwd Path to the current repo
     */
    static setConfig(key, value, cwd) {
        const target = path.join(cwd + '/.yo-rc.json');
        const file = fse.readJSONSync(target);
        file['generator-phovea'][key] = value;
        fse.writeJSONSync(target, file, { spaces: 2 });
    }

    static readConfig(key, cwd) {
        const file = fse.readJSONSync(path.join(cwd + '/.yo-rc.json'));
        return file['generator-phovea'][key];
    }

    static getCredentials(org) {
        org = org.toUpperCase();
        return {
            username: process.env[`${org}_USER`],
            token: process.env[`${org}_TOKEN`]
        };
    }
}

module.exports = AutoUpdateUtils;