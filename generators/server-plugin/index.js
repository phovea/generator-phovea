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
const knownPluginNames = knownPlugins.splugins.map((d) => d.name);
const knownLibraryNames = knownPlugins.slibraries.map((d) => d.name);

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
      slibraries: [],
      smodules: ['phovea_server'],
      sextensions: [],
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
      default : this.config.get('smodules')
    },{
      type    : 'checkbox',
      name    : 'libraries',
      message : 'Which libraries should be included?',
      choices: knownLibraryNames,
      default : this.config.get('slibraries')
    }])).then((props) => {
      this.config.set('smodules', props.modules);
      this.config.set('slibraries', props.libraries);
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

  writing() {
    const config = this.config.getAll();
    this._patchPackageJSON(config);
    this._writeTemplates(config);
  }

  install() {
    if(!this.options.skipInstall) {
      //TODO pip install
    }
  }
}
