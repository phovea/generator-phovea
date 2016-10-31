/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

//request index to avoid using the pre build version
<%- modules.map((d) => `exports.${/^phovea_.*/g.test(d) ? d.substring(7): d} = require('${d}/index');`).join('\n') %>
