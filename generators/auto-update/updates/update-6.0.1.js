'use strict';
const fse = require('fs-extra');
const path = require('path');

async function update(baseType, cwd) {
    const update2 = {
        update2: true
    };
    if (baseType === 'lib') {
        throw new Error('update 2 error');
    }

    // await fse.writeJson(path.join(cwd,  'update2.json'), update2);
}


module.exports = {
    update,
    description: 'Threw an error'
};
