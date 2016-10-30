/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

var registry = require('phovea_core/src/plugin');

/**
 * build a registry by registering all phovea modules
 */
//other modules
<%- modules.map(function(d) { return "registry.register(require('" + d+ " /phovea.js'));";}.join('\n') %>
//self
registry.register(require('./phovea.js'));
