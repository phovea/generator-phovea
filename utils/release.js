const knownRepositories = require('../knownRepositories');


function toBaseName(name) {
  if (name.includes('/')) {
    return name;
  }
  return `${Object.keys(knownRepositories).find((base) => knownRepositories[base].includes(name))}/${name}`;
}

function findBase(name) {
  if (name.includes('/')) {
    return name.split('/')[0];
  }
  return Object.keys(knownRepositories).find((base) => knownRepositories[base].includes(name))
}

function findName(fullName) {
  return fullName.includes('/') ? fullName.split('/')[1] : fullName;
}

function toCWD(basename) {
  let match = basename.match(/.*\/(.*)/)[1];
  if (match.endsWith('_product')) {
    match = match.slice(0, -8);
  }
  return match;
}

function failed(spawnResult) {
  return spawnResult.status !== 0;
}
module.exports = {
  toBaseName: toBaseName,
  findBase: findBase,
  findName: findName,
  toCWD: toCWD,
  failed: failed
}
