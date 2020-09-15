
const fs = require('fs-extra');
const yeoman = require('yeoman-environment');

module.exports = class GeneratorUtils {
    /**
     * Creates directory in the given path.
     * @param {string} dir Directory
     */
    static mkdir(dir) {
        console.log('Create directory: ' + dir);
        return new Promise((resolve) => fs.ensureDir(dir, resolve));
    }

    /**
     * Similar to the composeWith method of the base yeoman generator but it waits shortly till the generator is finished.
     * @param {string} generator Generator name, i.e, `init-lib`.
     * @param {Object} options Options to call the generator with.
     * @param {*} args Arguments to pass to the generator.
     * @param {*} cwd The directory to run the generator in.
     * @param {*} adapter The current generator adapter.
     */
    static yo(generator, options, args, cwd, adapter) {
        // call yo internally
        const env = yeoman.createEnv([], {
            cwd
        }, adapter);
        const _args = Array.isArray(args) ? args.join(' ') : args || '';
        return new Promise((resolve, reject) => {
            try {
              console.log(`Running: yo phovea:${generator} ${_args}`);
                env.lookup(() => {
                    env.run(`phovea:${generator} ${_args}`, options || {}, () => {
                        // wait a second after running yo to commit the files correctly
                        setTimeout(() => resolve(), 500);
                    });
                });
            } catch (e) {
                console.error('Error', e, e.stack);
                reject(e);
            }
        });
    }
};
