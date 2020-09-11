
const fs = require('fs-extra');

module.exports = class GeneratorUtils {
    /**
     * Creates directory in the given path.
     * @param {string} dir Directory
     */
    static mkdir(dir) {
        console.log('Create directory: ' + dir);
        return new Promise((resolve) => fs.ensureDir(dir, resolve));
    }
};
