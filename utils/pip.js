/**
 * Created by Samuel Gratzl on 05.04.2017.
 */

function parseRequirements(file) {
  if (!file) {
    return {};
  }
  file = file.trim();
  if (file === '') {
    return {};
  }
  const versions = {};
  file.split('\n').forEach((line) => {
    line = line.trim();

    if (line.startsWith('-e')) {
      // editable special dependency
      const branchSeparator = line.indexOf('@');
      const name = line.slice(0, branchSeparator).trim();
      versions[name] = line.slice(branchSeparator).trim();
      return;
    }

    if (line.startsWith('#') || line.startsWith('-')) {
      return; // skip
    }
    const versionSeparator = line.search(/[\^~=>!]/);
    if (versionSeparator >= 0) {
      const name = line.slice(0, versionSeparator).trim();
      versions[name] = line.slice(versionSeparator).trim();
    } else {
      versions[line] = '';
    }
  });
  return versions;
}

module.exports.parseRequirements = parseRequirements;
