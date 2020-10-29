'use strict';

const fse = require('fs-extra');
const path = require('path');

async function update(baseType, cwd) {
    const custom = {
        update1: true
    };
    await fse.writeJson(path.join(cwd, 'update1.json'), custom);
}


module.exports = {
    update,
  description: 'Created update1.json'
};