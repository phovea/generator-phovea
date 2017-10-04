/**
 * Created by Samuel Gratzl on 04.10.2017.
 */

const Separator = require('inquirer').Separator;

function generate(typesWeb, typesServer, typesHybrid) {
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

  r.isTypeHybrid = (d) => r.typesHybrid.indexOf(d.type) >= 0;
  r.isTypeWeb = (d) => r.typesWeb.indexOf(d.type) >= 0;
  r.isTypeServer = (d) => r.typesServer.indexOf(d.type) >= 0;
  return r;
}

module.exports.plugin = generate({
  app: 'web application',
  bundle: 'library bundle',
  lib: 'web library'
}, {slib: 'server library', service: 'server application service'}, {
  'lib-slib': 'web library with server counterpart',
  'app-slib': 'web application with server counterpart',
  'lib-service': 'web library with server application service'
});
module.exports.lib = generate({web: 'Web Library'}, {python: 'Python Libary'}, {});

