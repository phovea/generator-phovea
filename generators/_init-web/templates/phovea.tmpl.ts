/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

import {IRegistry} from 'tdp_core';

export default function (registry: IRegistry) {
  /// #if include('extension-type', 'extension-id')
  // registry.push('extension-type', 'extension-id', () => import('./extension_impl'), {});
  /// #endif

  // generator-phovea:begin
  <%- extensions.map((d) => `   registry.push('${d.type}', '${d.id}', () => import('./${d.module}'), ${stringify(d.extras, ' ')});`).join('\n\n') %>
  // generator-phovea:end
}

