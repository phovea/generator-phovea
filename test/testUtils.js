const path = require('path');

/**
 * Get the path to the templates of a specific subgenerator.
 * @param {string} subgenerator 
 * @param {string} fileName
 * @param {string} type Type of template, plain or processed
 */
const templatePath = (subgenerator, fileName, type = '') => path.join(__dirname, `../generators/${subgenerator}/templates/${type}/${fileName}`);

module.exports = {
    templatePath
};