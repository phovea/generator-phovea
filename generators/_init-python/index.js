'use strict';
const extend = require('deep-extend');
const Base = require('yeoman-generator').Base;
const {writeTemplates, patchPackageJSON} = require('../../utils');

const known = require('../../utils/known');

class PluginGenerator extends Base {

  constructor(args, options) {
    super(args, options);

    // readme content
    this.option('readme');
    this.option('longDescription');
    this.option('useDefaults');
  }

  initializing() {
    this.config.defaults({
      modules: ['phovea_server'],
      libraries: [],
      sextensions: [],
      unknown: {
        requirements: [],
        debianPackages: [],
        redhatPackages: []
      }
    });
  }

  prompting() {
    return this.prompt([{
      type: 'checkbox',
      name: 'modules',
      message: 'Included Modules',
      choices: known.plugin.listServerNames,
      default: this.config.get('modules'),
      when: !this.options.useDefaults
    }, {
      type: 'checkbox',
      name: 'libraries',
      message: 'Included Libraries',
      choices: known.lib.listServerNames,
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
    this.composeWith('phovea:_node', {
      options: this.options
    }, {
      local: require.resolve('../_node')
    });
  }

  _generateDependencies() {
    const requirements = {};
    const debianPackages = {};
    const redhatPackages = {};

    const concat = (p) => Object.keys(p).map((pi) => pi + p[pi]);

    // merge dependencies
    // support old notation, too (smodules, slibraries)
    this.config.get('modules').concat(this.config.get('smodules') || []).filter(known.plugin.isTypeServer).forEach((m) => {
      const p = known.plugin.byName(m);
      extend(requirements, p.requirements);
      extend(debianPackages, p.debianPackages);
      extend(redhatPackages, p.redhatPackages);
    });
    this.config.get('libraries').concat(this.config.get('slibraries') || []).filter(known.lib.isTypeServer).forEach((m) => {
      const p = known.lib.byName(m);
      extend(requirements, p.requirements);
      extend(debianPackages, p.debianPackages);
      extend(redhatPackages, p.redhatPackages);
    });

    return {
      requirements: concat(requirements),
      debianPackages: concat(debianPackages),
      redhatPackages: concat(redhatPackages)
    };
  }

  writing() {
    const config = this.config.getAll();
    patchPackageJSON.call(this, config, ['devDependencies']);
    writeTemplates.call(this, config);

    const deps = this._generateDependencies();
    this.fs.write(this.destinationPath('requirements.txt'), deps.requirements.concat(this.config.get('unknown').requirements).join('\n'));
    this.fs.write(this.destinationPath('debian_packages.txt'), deps.debianPackages.concat(this.config.get('unknown').debianPackages).join('\n'));
    this.fs.write(this.destinationPath('redhat_packages.txt'), deps.redhatPackages.concat(this.config.get('unknown').redhatPackages).join('\n'));
  }

  install() {
    if (this.options.install) {
      // TODO requirements install
    }
  }
}

module.exports = PluginGenerator;
