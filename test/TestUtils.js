const path = require('path');

module.exports = class TestUtils {
    /**
     * Get the path to the templates of a specific subgenerator.
     * @param {string} subgenerator
     * @param {string} fileName
     * @param {string} type Type of template, plain or processed
     */
    static templatePath(subgenerator, fileName, type = '') {
        return path.join(__dirname, `../generators/${subgenerator}/templates/${type ? type + '/' : ''}${fileName}`);
    }

};