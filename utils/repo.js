
module.exports.toHTTPRepoUrl = (repo) => {
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
};

module.exports.toSSHRepoUrl = (repo) => {
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
};

module.exports.toSSHRepoUrlFromHTTP = (repo) => {
  if (repo.startsWith('git@')) {
    return repo;
  }
  const m = repo.match(/(https?:\/\/([^/]+)\/|git@(.+):)([\w\d-_/]+)(.git)?/);
  if (m) {
    return `git@${m[2]}:${m[4]}.git`;
  }
  return repo;
};

module.exports.simplifyRepoUrl = (repo) => {
  // matches http and git urls
  const m = repo.match(/(https?:\/\/[^/]+\/|git@.+:)([\w\d-_/]+)(.git)?/);
  if (m) {
    // just the repo part
    return m[2];
  }
  return repo;
};
