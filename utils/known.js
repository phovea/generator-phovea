'use strict';

const Separator = require('inquirer').Separator;
const types = require('./types');
const registry = require('../knownPhoveaPlugins.json');

function generate(items, base) {
  const r = Object.assign({}, base);

  r.isTypeHybrid = (d) => r.typesHybrid.indexOf(typeof d === 'string' ? r.byName(d).type : d.type) >= 0;
  r.isTypeWeb = (d) => r.typesWeb.indexOf(typeof d === 'string' ? r.byName(d).type : d.type) >= 0;
  r.isTypeServer = (d) => r.typesServer.indexOf(typeof d === 'string' ? r.byName(d).type : d.type) >= 0;

  r.list = items;
  r.listWeb = r.list.filter(r.isTypeWeb);
  r.listServer = r.list.filter(r.isTypeServer);

  r.map = new Map();
  r.list.forEach((p) => {
    r.map.set(p.name, p);
  });

  r.exists = (name) => r.map.has(name);
  r.byName = (name) => r.map.get(name);

  r.listWebNames = r.listWeb.map((d) => d.name);
  const toDescription = (d) => ({value: d.name, name: `${d.name}: ${d.description}`, short: d.name});
  r.listWebNamesWithDescription = r.listWeb.map(toDescription);
  r.listServerNames = r.listServer.map((d) => d.name);
  r.listServerNamesWithDescription = r.listServer.map(toDescription);
  r.listNames = [].concat(
    r.listWebNames,
    new Separator(),
    r.listServerNames);
  r.listNamesWithDescription = [].concat(
    r.listWebNamesWithDescription,
    new Separator(),
    r.listServerNamesWithDescription);

  return r;
}

module.exports.plugin = generate(registry.plugins, types.plugin);
module.exports.lib = generate(registry.libraries, types.lib);

