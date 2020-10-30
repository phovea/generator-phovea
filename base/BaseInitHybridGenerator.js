'use strict';
const BaseInitPluginGenerator = require('./BaseInitPluginGenerator');
const {basetype} = require('./config');

class BaseInitHybridGenerator extends BaseInitPluginGenerator {

    constructor(args, options) {
        super(args, options, basetype.HYBRID);
    }

    initializing() {
        // since just last in the hierarchy used, need to do super calls
        super.initializing();
    }

    default() {
        return super.default();
    }

    writing() {
        return super.writing();
    }
}

module.exports = BaseInitHybridGenerator;