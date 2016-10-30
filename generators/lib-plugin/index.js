'use strict';
var BasePluginGenerator = require('../../utils');

class PluginGenerator extends BasePluginGenerator {

  constructor(args, options) {
    super('library', args, options);
  }
}

module.exports = PluginGenerator;
