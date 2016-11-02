/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

/**
 * build a registry by registering all phovea modules
 */
//other modules
<%- modules.map((d) => `import '${d}/phovea_registry.js';`).join('\n') %>
