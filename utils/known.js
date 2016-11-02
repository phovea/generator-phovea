'use strict';

const Separator = require('inquirer').Separator;
const registry = require('../knownPhoveaPlugins.json');

const plugin = {};
plugin.map = {};
[].concat(registry.plugins, registry.splugins).forEach((p) => {
  plugin.map[p.name] = p;
});
plugin.exists = (name) => name in plugin.map;
plugin.byName = (name) => plugin.map[name];
plugin.listWebNames = registry.plugins.map((d) => d.name);
plugin.listServerNames = registry.splugins.map((d) => d.name);
plugin.listNames = [].concat(
  plugin.listWebNames,
  new Separator(),
  plugin.listServerNames);

module.exports.plugin = plugin;

const lib = {};
lib.map = {};
[].concat(registry.libraries, registry.slibraries).forEach((p) => {
  lib.map[p.name] = p;
});
lib.exists = (name) => name in lib.map;
lib.byName = (name) => lib.map[name];
lib.listWebNames = registry.libraries.map((d) => d.name);
lib.listServerNames = registry.slibraries.map((d) => d.name);
lib.listNames = [].concat(
  lib.listWebNames,
  new Separator(),
  lib.listServerNames);
module.exports.lib = lib;
