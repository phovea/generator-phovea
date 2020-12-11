const fse = require('fs-extra');
const path = require('path');
const NpmUtils = require('../../utils/NpmUtils');
const glob = require('glob').sync;
const semver = require('semver');

class AutoUpdateUtils {
    static async autoUpdate(repo, pluginType, currentVersion, targetVersion, cwd, parent) {
        const excecuteUpdates = AutoUpdateUtils.getAvailableUpdates().filter((version) => semver.gtr(version, currentVersion));
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

    static getAvailableUpdates() {
        const files = glob('update-*.js', {
            cwd: path.join(__dirname, 'updates')
        }) || [];
        const versions = files.map((file) => file.match(/(?<=update-).*?(?=.js)/)[0]);
        return semver.sort(versions);
    }

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

    static chooseCredentials(org) {
        org = org.toUpperCase();
        return {
            username: process.env[`${org}_USER`],
            token: process.env[`${org}_TOKEN`]
        };
    }
}

module.exports = AutoUpdateUtils;