'use strict';
const fse = require('fs-extra');
const path = require('path');

// Update Description 
const description = '';

async function update(baseType, cwd) {
    const update3 = {
        update3: true
    };
    await fse.writeJson(path.join(cwd, 'update3.json'), update3);
}


module.exports = {
    update,
    description: 'Created update3.json'
};

