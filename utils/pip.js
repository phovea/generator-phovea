/**
 * Created by Samuel Gratzl on 05.04.2017.
 */


function parseRequirements(file) {
  file = file.trim();
  if (file === '') {
    return {};
  }
  const r = {};
  file.split('\n').forEach((line) => {
    let i = line.indexOf('@');
    if (i < 0) {
      i = line.indexOf('=');
    }
    if (i >= 0) {
      const requirement = line.slice(0, i);
      r[requirement] = line.slice(i);
    } else {
      r[line] = '';
    }
  });
  return r;
}

module.exports.parseRequirements = parseRequirements;
