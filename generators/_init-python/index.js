'use strict';
const extend = require('deep-extend');
const Base = require('yeoman-generator').Base;
const {writeTemplates, patchPackageJSON} = require('../../utils');

const knownPlugins = require('../../knownPhoveaPlugins.json');
const knownPluginNames = knownPlugins.splugins.map((d) => d.name);
const knownLibraryNames = knownPlugins.slibraries.map((d) => d.name);

class PluginGenerator extends Base {

  constructor(args, options) {
    super(args, options);

    // readme content
    this.option('readme');
    this.option('longDescription');
  }

  initializing() {
    this.config.defaults({
      slibraries: [],
      smodules: ['phovea_server'],
      sextensions: []
    });
  }

  prompting() {
    return this.prompt([{
      type: 'checkbox',
      name: 'modules',
      message: 'Included Modules',
      choices: knownPluginNames,
      default: this.config.get('smodules')
    }, {
      type: 'checkbox',
      name: 'libraries',
      message: 'Included Libraries',
      choices: knownLibraryNames,
      default: this.config.get('slibraries')
    }]).then((props) => {
      this.config.set('smodules', props.modules);
      this.config.set('slibraries', props.libraries);
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
    this.config.get('smodules').forEach((m) => {
      const p = knownPlugins.splugins[knownPluginNames.indexOf(m)];
      extend(requirements, p.requirements);
      extend(debianPackages, p.debianPackages_packages);
      extend(debianPackages, p.redhatPackages_packages);
    });
    this.config.get('slibraries').forEach((m) => {
      const p = knownPlugins.slibraries[knownLibraryNames.indexOf(m)];
      extend(requirements, p.requirements);
      extend(debianPackages, p.debianPackages_packages);
      extend(debianPackages, p.redhatPackages_packages);
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
    this.fs.write(this.destinationPath('requirements.txt'), deps.requirements.join('\n'));
    this.fs.write(this.destinationPath('debian_packages.txt'), deps.debianPackages.join('\n'));
    this.fs.write(this.destinationPath('redhat_packages.txt'), deps.redhatPackages.join('\n'));
  }

  install() {
    if (this.options.install) {
      // TODO requirements install
    }
  }
}

module.exports = PluginGenerator;
