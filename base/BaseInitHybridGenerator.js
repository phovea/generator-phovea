'use strict';
const BaseInitPluginGenerator = require('./BaseInitPluginGenerator');

class BaseInitHybridGenerator extends BaseInitPluginGenerator {

    constructor(args, options) {
        super(args, options, 'hybrid');
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