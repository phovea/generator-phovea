
/*********************************************************
 * Copyright (c) 2019 datavisyn GmbH, http://datavisyn.io
 *
 * This file is property of datavisyn.
 * Code and any other files associated with this project
 * may not be copied and/or distributed without permission.
 *
 * Proprietary and confidential. No warranty.
 *
 *********************************************************/
import {IRegistry} from 'phovea_core/src/plugin';

export default function (registry: IRegistry) {
  //registry.push('extension-type', 'extension-id', function() { return System.import('./src/extension_impl'); }, {});
  // generator-phovea:begin
  <%- extensions.map((d) => `   registry.push('${d.type}', '${d.id}', function() { return  System.import('./src/${d.module}'); }, ${stringify(d.extras, ' ')});`).join('\n\n') %>
  // generator-phovea:end
}

