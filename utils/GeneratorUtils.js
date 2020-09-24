
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

    /**
     * Creates object with custom formatting functions that can be called inside a template file when copying a template.
     * @param {{}} config Config file
     */
    static stringifyAble(config) {
        return Object.assign({
            stringifyPython: (obj, space) => {
                let base = GeneratorUtils.stringifyInline(obj, space);
                // python different true false
                base = base.replace(/: true/g, ': True').replace(/: false/g, ': False');
                return base;
            },
            stringify: GeneratorUtils.stringifyInline,
            isWeb: (p) => {
                const {
                    plugin
                } = require('./known');
                return plugin.isTypeWeb(p);
            }
        }, config);
    }

    /**
     * Stringifies object and applies custom formatting.
     * @param {{}} obj Object to stringify.
     * @param {string} space String containing the spaces to use to fromat stringified object.
     */
    static stringifyInline(obj, space) {
        let base = JSON.stringify(obj, null, ' ');
        // common style
        base = base.replace(/"/g, '\'');
        // prefix with space
        base = base.split('\n').map((l) => space + l).join('\n');
        return base.substring(space.length); // skip the first space
    }
};
