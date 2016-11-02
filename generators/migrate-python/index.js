'use strict';
const Base = require('yeoman-generator').Base;
const {extractFromReadme, toPhoveaName, toExtension} = require('../migrate-web');

const known = require('../../utils/known');

function filterKnownPlugin(p) {
  const r = known.plugin.exists(p);
  if (!r) {
    this.log('ERROR: cant find plugin: ', p);
  }
  return r;
}

function filterKnownLibrary(l) {
  const r = known.lib.exists(l);
  if (!r) {
    this.log('ERROR: cant find library: ', l);
  }
  return r;
}

class Generator extends Base {

  constructor(args, options) {
    super(args, options);

    this.argument('type');
  }

  initializing() {
    const pkg = this.fs.readJSON(this.destinationPath('package.json'));

    const {longDescription, readme} = extractFromReadme(this.fs.read(this.destinationPath('README.md')));

    this.props = {
      useDefaults: true,
      noSamples: true,
      description: (pkg.description || '').replace(/Caleydo Web/g, 'Phovea'),
      longDescription: longDescription.replace(/Caleydo Web/g, 'Phovea'),
      readme: readme.replace(/Caleydo Web/g, 'Phovea').replace(/\.\.\/caleydo_/g, 'phovea_'),
      authorEmail: 'contact@caleydo.org',
      authorUrl: 'https://caleydo.org'
    };
    const name = toPhoveaName(pkg.name);

    const safe = (obj, p, default_) => {
      var act = obj;
      for (let pi of p.split('.')) {
        if (!act) {
          return default_;
        }
        act = act[pi];
      }
      return act ? act : default_;
    };

    this.config.defaults({
      type: this.args[0],
      name: name,
      author: 'The Caleydo Team',
      githubAccount: 'phovea',
      slibraries: Object.keys(safe(pkg.caleydo, 'dependencies.python', {})).filter(filterKnownLibrary.bind(this)),
      smodules: Object.keys(pkg.peerDependencies).map(toPhoveaName).filter(filterKnownPlugin.bind(this)),
      sextensions: safe(pkg.caleydo, 'plugins.python', []).map(toExtension.bind(this, name))
    });
  }

  default() {
    this.composeWith('phovea:init-' + this.args[0], {
      options: this.props
    }, {
      local: require.resolve('../init-' + this.args[0])
    });
  }

  writing() {
    this.fs.delete(this.destinationPath('__index__.py'));
    this.fs.delete(this.destinationPath('.gitignore'));
    this.fs.delete(this.destinationPath('.npmignore'));
    this.fs.delete(this.destinationPath('.gitattributes'));
    this.fs.delete(this.destinationPath('LICENSE'));
    this.fs.delete(this.destinationPath('package.json'));
    this.fs.move(this.destinationPath('*.py'), this.destinationPath(this.config.get('name') + '/'));
    if (this.destinationPath('config.json')) {
      this.fs.move(this.destinationPath('config.json'), this.destinationPath(this.config.get('name') + '/config.json'));
    }
  }
}

module.exports = Generator;
module.exports.extractFromReadme = extractFromReadme;
