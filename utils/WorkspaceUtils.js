const path = require('path');
const glob = require('glob').sync;
const RepoUtils = require('./RepoUtils');
const GeneratorUtils = require('./GeneratorUtils');

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

  /**
   * Extract default app from `phovea_product.json`.
   * @param {Object} product Content of the `phovea_product.json`.
   */
  static findDefaultApp(product) {
    if (!product) {
      return null;
    }
    for (let p of product) {
      if (p.type === 'web') {
        return p.repo.slice(p.repo.lastIndexOf('/') + 1).replace('.git', '');
      }
    }
    return null;
  }

/**
 * Calls the clone repo generator with the name of the repo.
 * @param {string} repo Repository name.
 * @param {string} branch Branch to clone
 * @param {*} extras Extra git options
 * @param {*} dir Where to clone the repo
 * @param {*} cwd Where to run the generator
 * @param {*} cloneSSH SSH or HTTP url
 */
  static cloneRepo(repo, branch, extras, dir = '', cwd, cloneSSH) {
    const repoUrl = cloneSSH ? RepoUtils.toSSHRepoUrl(repo) : RepoUtils.toHTTPRepoUrl(repo);
    return GeneratorUtils.yo(`clone-repo`, {
      branch,
      extras: extras || '',
      dir,
      cwd
    }, repoUrl, cwd); // repository URL as argument
  }

};
