'use strict';
var extend = require('deep-extend');
var Base = require('../../utils').Base;

const knownPlugins = require('../../knownPhoveaPlugins.json');
const knownPluginNames = knownPlugins.splugins.map((d) => d.name);
const knownLibraryNames = knownPlugins.slibraries.map((d) => d.name);

class PluginGenerator extends Base {

  constructor(args, options) {
    super('', args, options);

    // readme content
    this.option('readme');
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
    this.composeWith('phovea:node', {
      options: {
        readme: this.options.readme
      }
    }, {
      local: require.resolve('../node')
    });
  }

  _generateDependencies() {
    const pip = {};
    const debian = {};
    const redhat = {};

    const concat = (p) => Object.keys(p).map((pi) => pi + p[pi]);

    // merge dependencies
    this.config.get('smodules').forEach((m) => {
      const p = knownPlugins.splugins[knownPluginNames.indexOf(m)];
      extend(pip, p.requirements);
      extend(debian, p.debian_packages);
      extend(debian, p.redhat_packages);
    });
    this.config.get('slibraries').forEach((m) => {
      const p = knownPlugins.slibraries[knownLibraryNames.indexOf(m)];
      extend(pip, p.requirements);
      extend(debian, p.debian_packages);
      extend(debian, p.redhat_packages);
    });

    return {
      pip: concat(pip),
      debian: concat(debian),
      redhat: concat(redhat)
    };
  }

  writing() {
    const config = this.config.getAll();
    this._patchPackageJSON(config, ['devDependencies']);
    this._writeTemplates(config);

    const deps = this._generateDependencies();
    this.fs.write(this.destinationPath('requirements.txt'), deps.pip.join('\n'));
    this.fs.write(this.destinationPath('debian_packages.txt'), deps.debian.join('\n'));
    this.fs.write(this.destinationPath('redhat_packages.txt'), deps.redhat.join('\n'));
  }

  install() {
    if (!this.options.skipInstall) {
      // TODO pip install
    }
  }
}

module.exports = PluginGenerator;
