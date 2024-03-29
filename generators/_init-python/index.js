'use strict';
const _ = require('lodash');
const PipUtils = require('../../utils/PipUtils');
const NpmUtils = require('../../utils/NpmUtils');
const GeneratorUtils = require('../../utils/GeneratorUtils');
const fs = require('fs');
const BasePhoveaGenerator = require('../../base/BasePhoveaGenerator');

const known = () => require('../../utils/known');

class Generator extends BasePhoveaGenerator {
  constructor(args, options) {
    super(args, options);

    // readme content
    this.option('readme');
    this.option('longDescription');
    this.option('useDefaults');
  }

  initializing() {
    this.config.defaults({
      modules: ['tdp_core'],
      libraries: [],
      sextensions: [],
      unknown: {
        requirements: [],
        dockerPackages: []
      }
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
      choices: known().plugin.listServerNamesWithDescription,
      default: this.config.get('modules'),
      when: !this.options.useDefaults
    }, {
      type: 'checkbox',
      name: 'libraries',
      message: 'Included Libraries',
      choices: known().lib.listServerNamesWithDescription,
      default: this.config.get('libraries'),
      when: !this.options.useDefaults
    }]).then((props) => {
      if (!this.options.useDefaults) {
        this.config.set('modules', props.modules);
        this.config.set('libraries', props.libraries);
      }
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

  _generateDependencies(useDevelopDependencies, cwd) {
    let requirements = PipUtils.parseRequirements(this.fs.read(this.destinationPath(cwd + 'requirements.txt'), {defaults: ''}));
    const dockerPackages = PipUtils.parseRequirements(this.fs.read(this.destinationPath(cwd + 'docker_packages.txt'), {defaults: ''}));

    const concat = (p) => Object.keys(p).map((pi) => pi + p[pi]);
    // merge dependencies
    // support old notation, too (smodules, slibraries)
    const modules = this.config.get('modules').concat(this.config.get('smodules') || []);
    this.config.delete('smodules');
    this.config.set('modules', modules);
    modules.filter(known().plugin.isTypeServer).forEach((m) => {
      const p = known().plugin.byName(m);

      // avoid having a requirement twice in two different formats that occurs when in the requirements.txt a requirement is written 
      // in the format git+https://github.com/datavisyn/tdp_core.git@v2.2.0#egg=tdp_core 
      // and the incoming format is tdp_core>=5.0.1,<6.0.0
      if (!useDevelopDependencies) {
        const devRequirement = Object.keys(p.develop.requirements)[0];
        const mainRequirment = Object.keys(p.requirements)[0];
        requirements = _.omit(requirements, [devRequirement, mainRequirment]);
      }

      _.assign(requirements, (useDevelopDependencies ? p.develop : p).requirements);
      _.assign(dockerPackages, (useDevelopDependencies ? p.develop : p).dockerPackages);
    });
    const libraries = this.config.get('libraries').concat(this.config.get('slibraries') || []);
    this.config.delete('slibraries');
    this.config.set('libraries', libraries);
    libraries.filter(known().lib.isTypeServer).forEach((m) => {
      const p = known().lib.byName(m);
      _.assign(requirements, p.requirements);
      _.assign(dockerPackages, p.dockerPackages);
    });
    return {
      requirements: concat(requirements),
      dockerPackages: concat(dockerPackages)
    };
  }
  writing() {
    const config = this.config.getAll();
    this.cwd = this.options.isWorkspace ? (config.app || config.serviceName || config.name) + '/' : '';
    const {version} = this.fs.readJSON(this.destinationPath(this.cwd + 'package.json'), {version: '1.0.0'});
    const deps = this._generateDependencies(NpmUtils.useDevVersion(version), this.cwd);

    this._patchPackageJSON(config, ['devDependencies'], null, null, this.cwd);
    this._writeTemplates.call(this, config, !this.options.noSamples, this.cwd);

    this.fs.write(this.destinationPath(this.cwd + 'requirements.txt'), deps.requirements.join('\n'));
    this.fs.write(this.destinationPath(this.cwd + 'docker_packages.txt'), deps.dockerPackages.join('\n'));

    // don't overwrite existing registry file
    if (!fs.existsSync(this.destinationPath(this.cwd + config.name.toLowerCase() + '/__init__.py'))) {
      this.fs.copyTpl(this.templatePath('__init__.tmpl.py'), this.destinationPath(this.cwd + config.name.toLowerCase() + '/__init__.py'), GeneratorUtils.stringifyAble(config));
    }
    this.fs.copy(this.templatePath('_gitignore'), this.destinationPath(this.cwd + '.gitignore'));
  }

  install() {
    if (this.options.install) {
      // TODO requirements install
    }
  }
}

module.exports = Generator;
