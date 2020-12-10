const fse = require('fs-extra');
const path = require('path');
const NpmUtils = require('../../utils/NpmUtils');
const glob = require('glob').sync;
const semver = require('semver');

class AutoUpdateUtils {
    static async autoUpdate(repo, pluginType, currentVersion, targetVersion, cwd, task) {
        const excecuteUpdates = AutoUpdateUtils.getAvailableUpdates().filter((version) => semver.gtr(version, currentVersion));
        return task.newListr(
            [...excecuteUpdates.map((version) => {
                return {
                    title: 'update ' + version,
                    options: {
                        bottomBar: Infinity,
                        persistentOutput: true
                    },
                    task: async (ctx, task) => ctx[repo].descriptions.push(await AutoUpdateUtils.updateLogic(version, targetVersion, pluginType, cwd, task, ctx))
                };
            })], { exitOnError: true, concurrent: false, rendererOptions: { showErrorMessage: true, collapseErrors: false, collapse: false } }
        );
    }

    static async updateLogic(nextVersion, targetVersion, type, destinationPath, task, ctx) {
        const filePath = `./updates/update-${nextVersion}.js`;
        const repo = path.basename(destinationPath);
        const { update, description } = require(filePath);
        const currentVersion = AutoUpdateUtils.readConfig('localVersion', destinationPath) || NpmUtils.decrementVersion(targetVersion);
        const setCtx = (key, value) => {
            ctx[repo][key] = value;
        };
        if (currentVersion === nextVersion) {
            throw new Error(`${repo}: Duplicate version tag "${currentVersion}"`);
        }
        return update(type, destinationPath, task, setCtx)
            .then(async () => {
                if (ctx[repo].skip) {
                    return;
                }
                AutoUpdateUtils.setConfig('localVersion', nextVersion, destinationPath);
                return `#### ${currentVersion} to ${nextVersion}\n ${description}`;
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
        return org === 'datavisyn' ?
            {
                username: 'datavisyn-bot',
                token: process.env.DATAVISYN_TOKEN
            } : {
                username: 'caleydo-bot',
                token: process.env.CALEYDO_TOKEN
            };
    }
}

module.exports = AutoUpdateUtils;