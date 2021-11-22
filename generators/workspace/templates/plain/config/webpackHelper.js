const path = require('path');
const fs = require('fs');

/**
 * inject the registry to be included
 * @param entry
 * @returns {*}
 */
function injectRegistry(workspacePath, defaultAppPath, extraFiles, entry) {
  // build also the registry
  if (typeof entry === 'string') {
      return extraFiles.concat(entry);
  }
  const transformed = {};
  Object.keys(entry).forEach((key) => {
    const workspaceSCSS = entry[key]['scss'] ? path.join(defaultAppPath, entry[key]['scss']) : path.join(workspacePath, `workspace.scss`);
    const entryJS = path.join(defaultAppPath, entry[key]['js']);

    transformed[key] = extraFiles.concat(workspaceSCSS, entryJS);
  });
  return transformed;
}

function resolveScreenshot(appDirectory) {
  const f = path.join(appDirectory, './media/screenshot.png');
  if (!fs.existsSync(f)) {
    return null;
  }
  const buffer = Buffer.from(fs.readFileSync(f)).toString('base64');
  return `data:image/png;base64,${buffer}`;
}

function generateMetaDataFile(appDirectory, customProperties) {
  const pkg = require(path.join(appDirectory,'./package.json'));
  const manifest = Object.assign({
    name: pkg.name,
    displayName: pkg.displayName,
    version: pkg.version,
    repository: pkg.repository.url,
    homepage: pkg.homepage,
    description: pkg.description,
    screenshot: resolveScreenshot(appDirectory)
  }, customProperties);
  return JSON.stringify(manifest, null, 2);
}

function getBuildId() {
  const now = new Date();
  const prefix = (n) => n < 10 ? ('0' + n) : n.toString();
  return `${now.getUTCFullYear()}${prefix(now.getUTCMonth() + 1)}${prefix(now.getUTCDate())}-${prefix(now.getUTCHours())}${prefix(now.getUTCMinutes())}${prefix(now.getUTCSeconds())}`;
}

module.exports = {
  generateMetaDataFile,
  injectRegistry,
  getBuildId
};
