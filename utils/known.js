'use strict';

const Separator = require('inquirer').Separator;
const registry = require('../knownPhoveaPlugins.json');

function generate(items, typesWeb, typesServer) {
  const r = {};

  r.typesWeb = typesWeb;
  r.isTypeWeb = (d) => r.typesWeb.indexOf(typeof d === 'string' ? r[d].type : d.type) >= 0;
  r.typesServer = typesServer;
  r.isTypeServer = (d) => r.typesServer.indexOf(typeof d === 'string' ? r[d].type : d.type) >= 0;
  r.types = [].concat(
    r.typesWeb,
    new Separator(),
    r.typesServer);

  r.list = items;
  r.listWeb = r.list.filter(r.isTypeWeb);
  r.listServer = r.list.filter(r.isTypeServer);

  r.map = {};
  r.list.forEach((p) => {
    r.map[p.name] = p;
  });

  r.exists = (name) => name in r.map;
  r.byName = (name) => r.map[name];

  r.listWebNames = r.listWeb.map((d) => d.name);
  r.listServerNames = r.listServer.map((d) => d.name);
  r.listNames = [].concat(
    r.listWebNames,
    new Separator(),
    r.listServerNames);

  return r;
}

module.exports.plugin = generate(registry.plugins, ['app', 'bundle', 'lib'], ['server', 'service']);
module.exports.lib = generate(registry.libraries, ['web'], ['python']);

