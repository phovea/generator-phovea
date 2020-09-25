'use-strict';
const path = require('path');

const toPath = (generator) => path.join(__dirname, '../../generators/', generator);

const COMMON = [
    toPath('_check-own-version'),
    toPath('check-node-version'),
];

const INIT_LIB = [
    ...COMMON,
    toPath('_node'),
    toPath('init-lib'),
    toPath('_init-web'),
];


const INIT_SLIB = [
    ...COMMON,
    toPath('_node'),
    toPath('init-slib'),
    toPath('_init-python'),
];

const INIT_SERVICE = [
    ...COMMON,
    toPath('_node'),
    toPath('init-service'),
    toPath('_init-python'),
];


const INIT_LIB_SLIB = Array.from(new Set([
    ...INIT_LIB,
    ...INIT_SLIB,
    toPath('_init-hybrid')
]));

const INIT_LIB_SERVICE = Array.from(new Set([
    ...INIT_LIB,
    ...INIT_SERVICE,
    toPath('_init-hybrid')
]));


const INIT_APP = [
    ...COMMON,
    toPath('_node'),
    toPath('init-app'),
    toPath('_init-web'),
];

const INIT_APP_SLIB = [
    ...INIT_APP,
    ...INIT_SLIB,
    toPath('_init-hybrid')
];

const INIT_PRODUCT = [
    ...COMMON,
    toPath('_node'),
];

const SETUP_WORKSPACE=[
    ...COMMON,
    toPath('workspace'),
    toPath('clone-repo'),
];

const dependencies = {
    COMMON,
    INIT_LIB,
    INIT_SLIB,
    INIT_LIB_SLIB,
    INIT_APP,
    INIT_SERVICE,
    INIT_APP_SLIB,
    INIT_LIB_SERVICE,
    INIT_PRODUCT,
    SETUP_WORKSPACE
};

module.exports = dependencies;