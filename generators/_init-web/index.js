'use strict';
const extend = require('deep-extend');
const Base = require('yeoman-generator').Base;
const {writeTemplates, patchPackageJSON} = require('../../utils');

const known = require('../../utils/known');

function toLibraryAliasMap(moduleNames, libraryNames) {
  var r = {};
  moduleNames.forEach((m) => {
    const plugin = known.plugin.byName(m);
    if (!plugin) {
      this.log('cant find plugin: ', m);
      return;
    }
    libraryNames.push(...(plugin.libraries || []));
  });
  libraryNames.forEach((l) => {
    const lib = known.lib.byName(l);
    if (!lib) {
      this.log('cant find library: ', l);
      return;
    }
    r[lib.name] = lib.alias || lib.name;
  });
  return r;
}

class PluginGenerator extends Base {

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
      modules: ['phovea_core'],
      entries: './index.js',
      ignores: [],
      extensions: []
    });
  }

  prompting() {
    return this.prompt([{
      type: 'checkbox',
      name: 'modules',
      message: 'Included Modules',
      choices: known.plugin.listWebNames,
      default: this.config.get('modules'),
      when: !this.options.useDefaults
    }, {
      type: 'checkbox',
      name: 'libraries',
      message: 'Included Libraries',
      choices: known.lib.listWebNames,
      default: this.config.get('libraries'),
      when: !this.options.useDefaults
    }]).then((props) => {
      if (!this.options.useDefaults) {
        this.config.set('modules', props.modules);
        this.config.set('libraries', props.libraries);
      }
      this.config.set('libraryAliases', toLibraryAliasMap.call(this, this.config.get('modules'), this.config.get('libraries')));
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
    var r = {};
    // merge dependencies
    this.config.get('modules').filter(known.plugin.isTypeWeb).forEach((m) => {
      extend(r, known.plugin.byName(m).dependencies);
    });
    this.config.get('libraries').filter(known.lib.isTypeWeb).forEach((m) => {
      extend(r, known.lib.byName(m).dependencies);
    });
    return r;
  }

  writing() {
    const config = this.config.getAll();
    patchPackageJSON.call(this, config, [], {
      dependencies: this._generateDependencies()
    });
    writeTemplates.call(this, config);
    // don't overwrite existing registry file
    if (!this.fs.exists(this.destinationPath('phovea.js'))) {
      this.fs.copyTpl(this.templatePath('phovea.tmpl.js'), this.destinationPath('phovea.js'), config);
    }
  }

  install() {
    if (this.options.install) {
      this.installDependencies({
        bower: false
      });
    }
  }
}

module.exports = PluginGenerator;
module.exports.toLibraryAliasMap = toLibraryAliasMap;
