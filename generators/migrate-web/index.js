'use strict';
const extend = require('deep-extend');
const Base = require('yeoman-generator').Base;

const knownPlugins = require('../../knownPhoveaPlugins.json');
const knownPluginNames = knownPlugins.plugins.map((d) => d.name);
const knownLibraryNames = knownPlugins.libraries.map((d) => d.name);

function filterKnownPlugin(p) {
  const r = knownPluginNames.indexOf(p);
  if (r < 0) {
    this.log('ERROR: cant find plugin: ', p);
  }
  return r >= 0;
}

function filterKnownLibrary(l) {
  const r = knownLibraryNames.indexOf(l);
  if (r < 0) {
    this.log('ERROR: cant find library: ', l);
  }
  return r >= 0;
}

function extractFromReadme(content) {
  const safe = (p) => p ? p[1] : '';
  // between header and installation
  const longDescription = safe(content.match(/=====$\s([\s\S]*)^Installation/m)).trim();
  // usage till end line
  const readme = safe(content.match(/(^Usage[\s\S]*)^\*\*\*$/m)).trim();

  return {longDescription, readme};
}

function toPhoveaName(name) {
  return name.replace(/^caleydo_/, 'phovea_');
}

function toExtension(name, desc) {
  const copy = extend({}, desc);
  delete copy.type;
  delete copy.id;
  delete copy.file;
  return {
    type: desc.type,
    id: desc.id || name,
    module: desc.file || '',
    extras: copy
  };
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
      libraries: Object.keys(safe(pkg.caleydo, 'dependencies.web', {})).filter(filterKnownLibrary.bind(this)),
      modules: Object.keys(pkg.peerDependencies).map(toPhoveaName).filter(filterKnownPlugin.bind(this)),
      extensions: safe(pkg.caleydo, 'plugins.web', []).map(toExtension.bind(this, name))
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
    this.fs.delete(this.destinationPath('(.gitignore|.npmignore|.gitattributes|LICENSE|package.json)'));
    this.fs.move(this.destinationPath('**.ts'), this.destinationPath('src/'));
    if (this.fs.exists(this.destinationPath('src/main.ts'))) {
      this.fs.move(this.destinationPath('src/main.ts'), this.destinationPath('src/index.ts'));
    }
    this.fs.move(this.destinationPath('*.scss'), this.destinationPath('src/'));
  }
}

module.exports = Generator;
module.exports.extractFromReadme = extractFromReadme;
module.exports.toPhoveaName = toPhoveaName;
module.exports.toExtension = toExtension;
