/**
 * Created by sam on 13.11.2016.
 */


const spawnSync = require('child_process').spawnSync;
const resolve = require('path').resolve;
const exists = require('fs').existsSync;


function dependencyGraph(cwd) {
  const r = spawnSync('npm', ['ls','--prod','--json'],{
    cwd: cwd
  });
  return JSON.parse(r.stdout.toString());
}

function resolveUeber(self) {
  const parent = dependencyGraph('..');
  delete self.missing;

  return self;
}

function generate() {
  var self = dependencyGraph(process.cwd);

  const isUeberContext = exists(resolve(__dirname, '..', 'phovea_registry.js'));
  if (isUeberContext) {
    self = resolveUeber(self);
  }
  return self;
}

module.exports = generate;

generate();
