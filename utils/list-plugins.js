const path = require('path');
const glob = require('glob').sync;

/**
 * Returns a list of all web plugins (i.e., the directory names) for a given workspace directory.
 * A valid web plugin must contain a `webpack.config.js` file. Otherwise the directory is ignored.
 *
 * @param {string} workspaceDirectory Workspace directory used as current work directory (cwd)
 * @returns {string[]} List of plugin names
 */
function listWebPlugins(workspaceDirectory) {
  const files = glob('*/webpack.config.js', {
    cwd: workspaceDirectory
  });
  return files.map(path.dirname).sort();
}

/**
 * Returns a list of all server plugins (i.e., the directory names) for a given workspace directory.
 * A valid server plugin must contain a `requirements.txt` file. Otherwise the directory is ignored.
 *
 * @param {string} workspaceDirectory Workspace directory used as current work directory (cwd)
 * @returns {string[]} List of plugin names
 */
function listServerPlugins(workspaceDirectory) {
  const files = glob('*/requirements.txt', {
    cwd: workspaceDirectory
  });
  return files.map(path.dirname).sort();
}

/**
 * Returns a list of all plugins (i.e., the directory names) for a given workspace directory.
 * A valid web plugin must contain a `webpack.config.js` file.
 * A valid server plugin must contain a `requirements.txt` file.
 * Otherwise the directory is ignored.
 *
 * @param {string} workspaceDirectory Workspace directory used as current work directory (cwd)
 * @returns {string[]} List of plugin names
 */
function listAllPlugins(workspaceDirectory) {
  const webPlugins = listWebPlugins(workspaceDirectory);
  const serverPlugins = listServerPlugins(workspaceDirectory);
  return [...new Set([].concat(...webPlugins, ...serverPlugins))].sort();
}

module.exports = {
  listWebPlugins,
  listServerPlugins,
  listAllPlugins
};

