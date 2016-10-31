/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

//register all extensions in the registry following the given pattern
module.exports = function(registry) {
  //registry.push('extension-type', 'extension-id', function() { return System.import('./src/extension_impl'); }, {});
<%- extensions.map((d) => `  registry.push('${d.type}', '${d.id}', function() { return System.import('./src/${d.module}'); }, ${JSON.stringify(d.extras, null, ' ').replace('"','\'')});`).join(',\n') %>
};

