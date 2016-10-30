/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

//register all extensions in the registry following the given pattern
//see phovea_core/plugin.ts -> push
module.exports = function(registry) {
  //registry.push('extension-type', 'extension-id', function() { return require('./src/extension_impl');}, {});
  <%- extensions.map(function(d) { return "registry.push('"+d.type+"', '"+d.id"', function() { return require('./src/"+d.module+"');}, "+JSON.stringify(d.extras)+");";}.join(',\n') %>
};
