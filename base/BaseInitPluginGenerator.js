'use strict';
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const GeneratorUtils = require('../utils/GeneratorUtils');
const BasePhoveaGenerator = require('../base/BasePhoveaGenerator');
const config= require('./config');

class BaseInitPluginGenerator extends BasePhoveaGenerator {

    constructor(args, options, basetype) {
        super(args, options);
        this.type = path.basename(path.dirname(this.resolved)).substring(5); // init-web ... web
        this.basetype = basetype || config.basetype.WEB;
        // Make options available
        this.option('skipInstall');
        this.option('noSamples');
        this.option('useDefaults');
        this.cwd = '';
    }

    initializing() {
        if (this._isInvalidWorkspace()) {
            throw new Error(chalk.red('Execution failed, because a ".yo-rc.json" and ".yo-rc-workspace.json" file was found. If this directory is a workspace, please remove the ".yo-rc.json" file and try again.\n'));
        }

        this.composeWith(['phovea:_check-own-version', 'phovea:check-node-version']);

        this.config.defaults({
            type: this.type
        });
    }

    _isWorkspace() {
        return fs.existsSync(this.destinationPath('.yo-rc-workspace.json'));
    }

    _hasConfigFile() {
        return fs.existsSync(this.destinationPath('.yo-rc.json'));
    }

    /**
     * If there is both a `.yo-rc-workspace.json` and `.yo-rc.json` file in the current directory
     * the workspace is invalid and the generator cannot function properly.
     */
    _isInvalidWorkspace() {
        return this._isWorkspace() && this._hasConfigFile();
    }

    /**
     * Create a subdirectory in the current directory.
     * Initialize the property cwd.
     * @param {string} dir Directory name.
     */
    _createSubDir(dir) {
        if (this._isWorkspace() && this.cwd !== dir + '/') {
            this.cwd = dir + '/';
            GeneratorUtils.mkdir(dir);
        }
    }

    readmeAddon() {
        const f = this.templatePath('README.partial.md');
        if (fs.existsSync(f)) {
            return this.fs.read(f);
        }
        return '';
    }

    default() {
        this.composeWith('phovea:_init-' + this.basetype, {
            options: Object.assign({
                readme: this.readmeAddon() + (this.options.readme ? `\n\n${this.options.readme}` : '')
            }, this.options),
            isWorkspace: this._isWorkspace() // inform the sub generator that the cwd is the workspace to avoid reading prompt default values from the workspace package.json
        });
    }

    writing() {
        const config = this.config.getAll();
        this._createSubDir(config.cwd || config.name);
        if (fs.existsSync(this.templatePath('package.tmpl.json'))) {
            this._patchPackageJSON(config, null, null, this.cwd);
        }
        if (fs.existsSync(this.templatePath('_gitignore'))) {
            this.fs.copy(this.templatePath('_gitignore'), this.destinationPath(this.cwd + '.gitignore'));
        }

        this._writeTemplates(config, !this.options.noSamples, this.cwd);

    }
}

module.exports = BaseInitPluginGenerator;