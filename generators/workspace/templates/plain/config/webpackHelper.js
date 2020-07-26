const path = require('path');
const fs = require('fs');

/**
 * inject the registry to be included
 * @param entry
 * @returns {*}
 */
function injectRegistry(defaultApp, extraFiles, entry) {
  // build also the registry
  if (typeof entry === 'string') {
      return extraFiles.concat(entry);
  }
  const transformed = {};
  Object.keys(entry).forEach((key) => {
      transformed[key] = extraFiles.concat(`./${defaultApp}/` + entry[key]['js']);
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

function appendMetaData(additionalProperties, appDirectory) {
  pkg = require(path.join(appDirectory,'./package.json'));
  const manifest = Object.assign(additionalProperties, {
    name: pkg.name,
    displayName: pkg.displayName,
    version: pkg.version,
    repository: pkg.repository.url,
    homepage: pkg.homepage,
    description: pkg.description,
    screenshot: resolveScreenshot(appDirectory)
  });
  return JSON.stringify(manifest, null, 2);
}

function generateMetaDataFile(additionalProperties, appDirectory) {
  return appendMetaData(additionalProperties, appDirectory);
}

module.exports = {
  generateMetaDataFile,
  injectRegistry
}
