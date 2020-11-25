'use strict';

const fse = require('fs-extra');
const { merge } = require('lodash');
const path = require('path');
const { lib, plugin } = require('../../../utils/types');

async function update(baseType, cwd, task, setCtx) {
    const type = { type: baseType };
    const updateCondition = lib.isTypeHybrid(type) || lib.isTypeWeb(type) || plugin.isTypeHybrid(type) || plugin.isTypeWeb(type);
    if (!updateCondition) {
        setCtx('skip', true);
        return task.skip('update 6.0.0: Not a hybrid plugin');
    }
    const gitignore = (await fse.promises.readFile(path.join(cwd, '.gitignore'))).toString();
    const newGitignore = gitignore.replace('/build/', '/build/\n/dist/tsBuildInfoFile');

    await fse.promises.writeFile(path.join(cwd, '.gitignore'), newGitignore);
    const tsConfig = await fse.readJson(path.join(cwd, 'tsconfig.json'));
    merge(tsConfig, {
        compilerOptions: {
            incremental: true,
            tsBuildInfoFile: 'dist/tsBuildInfoFile'
        }
    });
    await fse.writeJSON(path.join(cwd, 'tsconfig.json'), tsConfig, { spaces: 2 });
}


module.exports = {
    update,
    description: 'Add `--incremental` build flag for ts compiler '
};