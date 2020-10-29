const fse = require('fs-extra');
const path = require('path');
const NpmUtils = require('../../utils/NpmUtils');
const glob = require('glob').sync;
const semver = require('semver');
const chalk = require('chalk');
const ora = require('ora');

class AutoUpdateUtils {
    static async autoUpdate(type, localVersion, generatorVersion, destinationPath) {
        const excecuteUpdates = AutoUpdateUtils.getAvailableUpdates().filter((version) => semver.gtr(version, localVersion));
        const descriptions = await excecuteUpdates.reduce((updateChain, version) => {
            return updateChain
                .then(async (descriptions) => {
                    const desc = await AutoUpdateUtils.updateLogic(version, generatorVersion, type, destinationPath);
                    descriptions.push(desc);
                    return descriptions;
                });
        }, Promise.resolve([]));
        return descriptions;
    }

    static async updateLogic(nextVersion, generatorVersion, type, destinationPath) {

        const filePath = `./updates/update-${nextVersion}.js`;
        const repo = path.basename(destinationPath);
        const {update, description} = require(filePath);
        const currentVersion = AutoUpdateUtils.readConfig('localVersion', destinationPath) || NpmUtils.decrementVersion(generatorVersion);

        if (currentVersion === nextVersion) {
            throw new Error(`Error ${repo}: Duplicate version tag "${currentVersion}"`);
        }

        const spinner = ora(`${repo}: Running update-${nextVersion}`).start();
        return update(type, destinationPath)
            .then(async () => {
                AutoUpdateUtils.setConfig('localVersion', nextVersion, destinationPath);
                spinner.succeed();
                return `#### ${currentVersion} to ${nextVersion}\n ${description}`;
            })
            .catch((e) => {
                const msg = `${repo}: Update ${currentVersion} to ${nextVersion} failed with ${e.message}`;
                spinner.fail(msg);
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
        fse.writeJSONSync(target, file, {spaces: 2});
    }

    static readConfig(key, cwd) {
        const file = fse.readJSONSync(path.join(cwd + '/.yo-rc.json'));
        return file['generator-phovea'][key];
    }

    static chooseCredentials(org) {
        const token = org === 'datavisyn' ? process.env.DATAVISYN_TOKEN : process.env.CALYEDO_TOKEN;

        return {
            username: 'oltionchampari', // dummy for testing actual value = caleydo_bot
            token: token.trim()
        };
    }
}

module.exports = AutoUpdateUtils;