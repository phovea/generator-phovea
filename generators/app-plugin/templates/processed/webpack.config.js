/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

const generate = require('./common_config.js');

const entries = {
  app: './src/index.ts'
};

//libraries name and their node_modules position goes here, e.g.
const libraries = {
  d3: 'd3/d3'
};

//list of used phovea modules for externalization
const modules = [
  'phovea_core',
  'phovea_bootstrap_fontawesome'
];

module.exports = generate.webpack.app(entries, libraries, modules);
