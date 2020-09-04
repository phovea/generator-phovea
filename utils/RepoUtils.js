module.exports = class RepoUtils {

  /**
   * Transforms repo name or SSH url to an https url
   * @param {string} repo Repo
   */
  static toHTTPRepoUrl(repo) {
    if (repo.startsWith('http')) {
      return repo;
    }
    if (repo.startsWith('git@')) {
      const m = repo.match(/(https?:\/\/([^/]+)\/|git@(.+):)([\w\d-_/]+)(.git)?/);
      return `https://${m[3]}/${m[4]}.git`;
    }
    if (!repo.includes('/')) {
      repo = `Caleydo/${repo}`;
    }
    return `https://github.com/${repo}.git`;
  }


  /**
   * Transforms repo name or http(s) url to an SSH url
   * @param {string} repo Repo
   */
  static toSSHRepoUrl(repo) {
    if (repo.startsWith('git@')) {
      return repo;
    }
    if (repo.startsWith('http')) {
      const m = repo.match(/(https?:\/\/([^/]+)\/|git@(.+):)([\w\d-_/]+)(.git)?/);
      return `git@${m[2]}:${m[4]}.git`;
    }
    if (!repo.includes('/')) {
      repo = `Caleydo/${repo}`;
    }
    return `git@github.com:${repo}.git`;
  }

  /**
   * Transforms repo http(s) url to an SSH url.
   * @param {string} repo Repo.
   */
  static toSSHRepoUrlFromHTTP(repo) {
    if (repo.startsWith('git@')) {
      return repo;
    }
    const m = repo.match(/(https?:\/\/([^/]+)\/|git@(.+):)([\w\d-_/]+)(.git)?/);
    if (m) {
      return `git@${m[2]}:${m[4]}.git`;
    }
    return repo;
  }

  /**
   * Extracts organization and repo names from a SSH or an http url.
   * @param {string} repo Repo.
   */
  static simplifyRepoUrl(repo) {
    // matches http and git urls
    const m = repo.match(/(https?:\/\/[^/]+\/|git@.+:)([\w\d-_/]+)(.git)?/);
    if (m) {
      // just the repo part
      return m[2];
    }
    return repo;
  }
};
