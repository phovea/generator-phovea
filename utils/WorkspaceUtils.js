const path = require('path');
const glob = require('glob').sync;
const known = require('../../utils/known');
const RepoUtils = require('../../utils/RepoUtils');
const fs = require('fs-extra');

module.exports = class WorkspaceUtils {
  /**
   * Returns a list of all web plugins (i.e., the directory names) for a given workspace directory.
   * A valid web plugin must contain a `webpack.config.js` file. Otherwise the directory is ignored.
   *
   * @param {string} workspaceDirectory Workspace directory used as current work directory (cwd)
   * @returns {string[]} List of plugin names
   */
  static listWebPlugins(workspaceDirectory) {
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
  static listServerPlugins(workspaceDirectory) {
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
  static listAllPlugins(workspaceDirectory) {
    const webPlugins = WorkspaceUtils.listWebPlugins(workspaceDirectory);
    const serverPlugins = WorkspaceUtils.listServerPlugins(workspaceDirectory);
    return [...new Set([].concat(...webPlugins, ...serverPlugins))].sort();
  }
};
