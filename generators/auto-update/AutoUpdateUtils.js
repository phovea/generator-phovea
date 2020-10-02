const fse = require('fs-extra');

class AutoUpdateUtils {
    static async autoUpdate(type, localVersion, generatorVersion, generatorDirectory) {
        // Dummy
        const yoRc = fse.readJSONSync(generatorDirectory + '/.yo-rc.json');
        yoRc['generator-phovea'].type = 'slib';
        fse.writeJSONSync(generatorDirectory + '/.yo-rc.json', yoRc, {spaces: 2});
        // Compare localVersion, generatorVersion
        // while (localVersion < generatorVersion):
             // increment localVersion
             // execute the update<localVersion>.js
        return new Promise((resolve) => resolve());
    }
}

module.exports = AutoUpdateUtils;