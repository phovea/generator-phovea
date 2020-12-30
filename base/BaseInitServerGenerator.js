'use strict';

const BaseInitPluginGenerator = require('./BaseInitPluginGenerator');
const {basetype} = require('./config');

class BaseInitServerGenerator extends BaseInitPluginGenerator {

    constructor(args, options) {
        super(args, options, basetype.PYTHON);
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

module.exports = BaseInitServerGenerator; 