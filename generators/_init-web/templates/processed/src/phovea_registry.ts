/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

import {PluginRegistry} from '<%- name==="tdp_core" ? "./app/PluginRegistry" : "tdp_core" %>';
import reg from './phovea';

/**
 * build a registry by registering all phovea modules
 */

// other modules
<% - modules.filter(isWeb).map((d) => `import '${d}/dist/phovea_registry';`).join('\n') %>

// self
PluginRegistry.getInstance().register('<%-name%>', reg);
