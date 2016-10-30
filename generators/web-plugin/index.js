'use strict';
var extend = require('deep-extend');
var Base = require('../../utils').Base;

function resolveRepo(repo) {
  if (!repo) {
    return '';
  }
  if (typeof repo === 'string') {
    return repo;
  }
  return repo.url;
}

const knownPlugins = require('../../knownPhoveaPlugins.json');
const knownPluginNames = knownPlugins.plugins.map((d) => d.name);
const knownLibraryNames = knownPlugins.libraries.map((d) => d.name);

function toLibraryAliasMap(moduleNames, libraryNames) {
  var r = {};
  moduleNames.forEach((m) => {
    const plugin = knownPlugins.plugins[knownPluginNames.indexOf(m)];
    libraryNames.push(...(plugin.libraries || []));
  });
  libraryNames.forEach((l) => {
    const lib = knownPlugins.libraries[knownLibraryNames.indexOf(l)];
    r[lib.name] = lib.alias || lib.name;
  });
  return r;
}

class PluginGenerator extends Base {

  constructor(args, options) {
    super('', args, options);
  }

  initializing() {
    const pkg = this.fs.readJSON(this.destinationPath('package.json'), {});
    this.config.defaults({
      name: pkg.name || '',
      author: '',
      today: (new Date()).toUTCString(),
      libraries: [],
      libraryAliases: {},
      modules: ['phovea_core'],
      extensions: [],
      description: pkg.description || '',
      repository: resolveRepo(pkg.repository),
    });
  }

  prompting() {
    return super.prompting().then(() => this.prompt([{
      type    : 'checkbox',
      name    : 'modules',
      message : 'Which modules should be included?',
      choices: knownPluginNames,
      default : this.config.get('modules')
    },{
      type    : 'checkbox',
      name    : 'libraries',
      message : 'Which libraries should be included?',
      choices: knownLibraryNames,
      default : this.config.get('libraries')
    }])).then((props) => {
      this.config.set('modules', props.modules);
      this.config.set('libraries', props.libraries);
      this.config.set('libraryAliases', toLibraryAliasMap(props.modules, props.libraries));
    });;
  }

  default() {
    this.composeWith('node:app', {
      options: {
        babel: false,
        boilerplate: false,
        editorconfig: false,
        git: false,
        gulp: false,
        travis: false,
        name: this.config.get('name'),
        coveralls: false,
        skipInstall: this.options.skipInstall
      }
    }, {
      local: require('generator-node').app
    });
  }

  _generateDependencies() {
    var r = {};
    //merge dependencies
    this.config.get('modules').forEach((m) => {
      extend(r, knownPlugins.plugins[knownPluginNames.indexOf(m)].dependencies);
    });
    this.config.get('libraries').forEach((m) => {
      extend(r, knownPlugins.libraries[knownLibraryNames.indexOf(m)].dependencies);
    });
    return r;
  }

  writing() {
    const config = this.config.getAll();
    this._patchPackageJSON(config, [], {
      dependencies: this._generateDependencies()
    });
    this._writeTemplates(config);
  }

  install() {
    if(!this.options.skipInstall) {
      this.installDependencies({ bower: false });
    }
  }
}

module.exports = PluginGenerator;
