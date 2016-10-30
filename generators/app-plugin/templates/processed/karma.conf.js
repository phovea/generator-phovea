/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

const generate = require('./common_config.js');

/**
 * list of all libraries used and their node_modules folder location
 */
const libraries = {
  //d3: 'd3/d3'
};
module.exports = generate.karma.lib(libraries);
