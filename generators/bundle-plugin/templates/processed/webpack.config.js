/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

const generate = require('./common_config.js');

//libraries name and their node_modules position goes here, e.g.
const libraries = {
<%- Object.keys(libraryAliases).map((d) => `  '${d}': '${libraryAliases[d]}'`).join(',\n') %>
};

//list of used phovea modules for externalization
const modules = [
<%- modules.map((d) => `  '${d}'`).join(',\n') %>
];

module.exports = generate.webpack.bundle(libraries, modules);
