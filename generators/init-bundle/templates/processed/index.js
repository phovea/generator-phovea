/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

Object.defineProperty(module.exports, '__publicPath', {
	set: function(value) {
		__webpack_public_path__ = value;
	},
	get: function() {
		return __webpack_public_path__;
	}
});

var parentScript = document.querySelector('script[src$="<%-name%>.js"]');
if (parentScript) {
  var src = parentScript.src.substring(0, parentScript.src.length - '<%-name%>.js'.length);
  // guess and set the public path of webpack with an intelligent guess based on my own script loading tag
  if (src !== '.') {
    __webpack_public_path__ = src;
  }
}


//request index to avoid using the pre build version
<%- modules.map((d) => `exports.${/^phovea_.*/g.test(d) ? d.substring(7): d} = require('${d}/index');`).join('\n') %>
