/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */


module.exports.type = '<%-type%>';

module.exports.entries = {
<%- Object.keys(entries).map((d) => `  '${d}': '${entries[d]}'`).join(',\n') %>
};

module.exports.ignores = [

];

module.exports.libraries = {
<%- Object.keys(libraryAliases).map((d) => `  '${d}': '${libraryAliases[d]}'`).join(',\n') %>
};

module.exports.modules = [
<%- modules.map((d) => `  '${d}'`).join(',\n') %>
];

//register all extensions in the registry following the given pattern
module.exports.register = (registry) => {
  //registry.push('extension-type', 'extension-id', () => System.import('./src/extension_impl'), {});
<%- extensions.map((d) => `  registry.push('${d.type}', '${d.id}', () => System.import('./src/${d.module}'), ${JSON.stringify(d.extras, null, ' ').replace('"','\'')});`).join(',\n') %>
};

