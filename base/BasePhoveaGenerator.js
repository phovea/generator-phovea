'use strict';
const Generator = require('yeoman-generator');
const {merge, template} = require('lodash');
const path = require('path');
const glob = require('glob').sync;
const fs = require('fs-extra');
const GeneratorUtils = require('../utils/GeneratorUtils');

class BasePhoveaGenerator extends Generator {

    /**
     * Modify package.json by passing the configuration.
     * 
     * @param {object} config Current configuration
     * @param {*} unset
     * @param {*} extra
     * @param {*} replaceExtra
     * @param {string} cwd The directory from which the generator is being called, i.e., `tdp_core/`.
     * If cwd is provided than the `package.json` is going to be written to that subdirectory, otherwise to the current directory.
     */
    _patchPackageJSON(config, unset, extra, replaceExtra, cwd = '') {
        const pkg = this.fs.readJSON(this.destinationPath(cwd + 'package.json'), {});
        let pkgPatch;
        if (fs.existsSync(this.templatePath('package.tmpl.json'))) {
            pkgPatch = JSON.parse(template(this.fs.read(this.templatePath('package.tmpl.json')))(config));
        } else {
            pkgPatch = {};
        }
        merge(pkg, pkgPatch);
        if (replaceExtra && extra) {
            Object.assign(pkg, extra);
        } else {
            merge(pkg, extra || {});
        }

        (unset || []).forEach((d) => delete pkg[d]);

        this.fs.writeJSON(this.destinationPath(cwd + 'package.json'), pkg);
    }

    /**
     * Copies the template files to the current directory or to a subdirectory if `cwd` is provided.
     * @param {object} config Current configuration
     * @param {*} withSamples
     * @param {string} cwd The directory from which the generator is being called, i.e., `tdp_core/`.
     * If `cwd` is provided than the `package.json` is going to be written to that subdirectory, otherwise to the current directory.
     */
    _writeTemplates(config, withSamples, cwd = '') {
        const includeDot = {
            globOptions: {
                dot: true
            }
        };

        const pattern = GeneratorUtils.stringifyAble(config);

        const copyTpl = (base, dbase, initialize_once) => {
            // see https://github.com/SBoudrias/mem-fs-editor/issues/25
            // copyTpl doesn't support glob options
            const f = glob(base + '/**/*', {
                dot: true
            });
            f.forEach((fi) => {
                const rel = path.relative(base, fi);
                if (!initialize_once || !fs.existsSync(this.destinationPath(cwd + dbase + rel))) {
                    this.fs.copyTpl(fi, this.destinationPath(cwd + dbase + rel), pattern);
                }
            });
        };

        const copy = (prefix) => {
            if (fs.existsSync(this.templatePath(prefix + 'plain'))) {
                this.fs.copy(this.templatePath(prefix + 'plain/**/*'), this.destinationPath(cwd), includeDot);
            }

            const plainTemplatePath = this.templatePath(prefix + 'plain_initialize_once');
            if (fs.existsSync(plainTemplatePath)) {
                copyTpl(plainTemplatePath, '', true);
            }

            copyTpl(this.templatePath(prefix + 'processed'), '', false);

            if (config.name) {
                if (fs.existsSync(this.templatePath(prefix + 'pluginname_plain'))) {
                    this.fs.copy(this.templatePath(prefix + 'pluginname_plain/**/*'), this.destinationPath(cwd + config.name.toLowerCase() + '/'), includeDot);
                }
                copyTpl(this.templatePath(prefix + 'pluginname_processed'), cwd + config.name.toLowerCase() + '/', false);
            }
        };
        copy('');
        if (withSamples) {
            copy('sample_');
        }
    }
}

module.exports = BasePhoveaGenerator;