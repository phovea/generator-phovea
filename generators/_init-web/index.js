'use strict';
const _ = require('lodash');
const chalk = require('chalk');
const fs = require('fs');
const NpmUtils = require('../../utils/NpmUtils');
const SpawnUtils = require('../../utils/SpawnUtils');
const RepoUtils = require('../../utils/RepoUtils');
const GeneratorUtils = require('../../utils/GeneratorUtils');
const BasePhoveaGenerator = require('../../base/BasePhoveaGenerator');
const known = () => require('../../utils/known');

class Generator extends BasePhoveaGenerator {

  constructor(args, options) {
    super(args, options);

    // readme content
    this.option('install');
    this.option('readme');
    this.option('longDescription');
    this.option('useDefaults');
  }

  initializing() {
    this.config.defaults({
      type: 'lib',
      libraries: [],
      libraryAliases: {},
      libraryExternals: [],
      modules: ['phovea_core'],
      entries: './index.js',
      ignores: [],
      extensions: []
    });
  }

  prompting() {
    if (this.config.get('type').includes('-')) {
      return; // hybrid
    }
    return this.prompt([{
      type: 'checkbox',
      name: 'modules',
      message: 'Included Modules',
      choices: known().plugin.listWebNamesWithDescription,
      default: this.config.get('modules'),
      when: !this.options.useDefaults
    }, {
      type: 'checkbox',
      name: 'libraries',
      message: 'Included Libraries',
      choices: known().lib.listWebNamesWithDescription,
      default: this.config.get('libraries'),
      when: !this.options.useDefaults
    }]).then((props) => {
      if (!this.options.useDefaults) {
        this.config.set('modules', props.modules);
        this.config.set('libraries', props.libraries);
      }
      this.config.set('libraryAliases', RepoUtils.toLibraryAliasMap(this.config.get('modules'), this.config.get('libraries')));
      this.config.set('libraryExternals', RepoUtils.toLibraryExternals(this.config.get('modules'), this.config.get('libraries')));
    });
  }

  default() {
    if (this.config.get('type').includes('-')) {
      return; // hybrid
    }
    this.composeWith('phovea:_node', {
      options: this.options,
      isWorkspace: this.options.isWorkspace
    });
  }

  _generateDependencies(useDevelopDependencies) {
    let r = {};
    // merge dependencies
    this.config.get('modules').filter(known().plugin.isTypeWeb).forEach((m) => {
      const d = known().plugin.byName(m);
      _.assign(r, (useDevelopDependencies ? d.develop : d).dependencies);
    });
    this.config.get('libraries').filter(known().lib.isTypeWeb).forEach((m) => {
      _.assign(r, known().lib.byName(m).dependencies);
    });
    return r;
  }

  writing() {
    const config = this.config.getAll();
    this.cwd = this.options.isWorkspace ? (config.app || config.serviceName|| config.name) + '/' : '';
    const {version} = this.fs.readJSON(this.destinationPath(this.cwd + 'package.json'), {version: '1.0.0'});

    this._patchPackageJSON(config, [], {
      dependencies: this._generateDependencies(NpmUtils.useDevVersion(version))
    }, null, this.cwd);
    this.fs.copy(this.templatePath('_gitignore'), this.destinationPath(this.cwd + '.gitignore'));
    this._writeTemplates.call(this, config, null, this.cwd);

    // do not overwrite existing registry file
    if (!fs.existsSync(this.destinationPath(this.cwd + 'src/phovea.ts'))) {
      this.fs.copyTpl(this.templatePath('phovea.tmpl.ts'), this.destinationPath(this.cwd + 'src/phovea.ts'), GeneratorUtils.stringifyAble(config));
    }
  }

  install() {
    if (this.options.options.install) {
      SpawnUtils.spawnSync('npm', 'install', this.cwd, true);
    }
  }

  end() {
    if (fs.existsSync(this.destinationPath(this.cwd + 'phovea.js'))) {
      this.log('\r\n');
      this.log(chalk.red(`ACTION REQUIRED!`));
      this.log(chalk.white(`Please migrate the content of`), chalk.yellow(`phovea.js`), chalk.white(`to`), chalk.yellow(`/src/phovea.ts`) + chalk.white(` now!`));
      this.log(chalk.white(`Afterwards you can remove the`), chalk.yellow(`phovea.js`), chalk.white(`file from this plugin repository.`));
      this.log(chalk.white(`If you do not migrate the content the registered extension points will be unavailable.`));
    }
  }
}

module.exports = Generator;
