'use strict';

const Separator = require('inquirer').Separator;
const registry = require('../knownPhoveaPlugins.json');

function generate(items, typesWeb, typesServer, typesHybrid) {
  const r = {};

  r.typesHybrid = Object.keys(typesHybrid);
  r.typesWeb = Object.keys(typesWeb).concat(r.typesHybrid);
  r.typesServer = Object.keys(typesServer).concat(r.typesHybrid);
  r.types = [].concat(
    r.typesWeb,
    new Separator(),
    r.typesServer);

  r.typesWithDescription = [].concat(
    Object.keys(typesWeb).map((t) => ({value: t, name: `${t}: ${typesWeb[t]}`, short: t})),
    new Separator(),
    Object.keys(typesServer).map((t) => ({value: t, name: `${t}: ${typesServer[t]}`, short: t}))
  );
  if (r.typesHybrid.length > 0) {
    r.types = r.types.concat(new Separator(), r.typesHybrid, new Separator());
    r.typesWithDescription = r.typesWithDescription.concat(
      new Separator(),
      r.typesHybrid.map((t) => ({value: t, name: `${t}: ${typesHybrid[t]}`, short: t})),
      new Separator());
  }

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

module.exports.plugin = generate(registry.plugins, {
  app: 'web application',
  bundle: 'library bundle',
  lib: 'web library'
}, {slib: 'server library', service: 'server application service'}, {
  'lib-slib': 'web library with server counterpart',
  'app-slib': 'web application with server counterpart',
  'lib-service': 'web library with server application service'
});
module.exports.lib = generate(registry.libraries, {web: 'Web Library'}, {python: 'Python Libary'}, {});

