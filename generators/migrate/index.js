'use strict';
const extend = require('deep-extend');
const Base = require('yeoman-generator').Base;
const known = require('../../utils/known');

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

    const validLib = (p) => {
      const r = known.lib.exists(p);
      if (!r) {
        this.log('ERROR: cant find lib: ', p);
        return false;
      }
      return true;
    };
    const validPlugin = (p) => {
      const r = known.plugin.exists(p);
      if (!r) {
        this.log('ERROR: cant find plugin: ', p);
        return false;
      }
      return true;
    };

    const libs = safe(pkg.caleydo, 'dependencies.web', {});

    const requirement2lib = {};
    known.lib.listServer.forEach((p) => {
      Object.keys(p.requirements).forEach((r) => {
        requirement2lib[r] = p;
      });
    });
    const knownRequirements = [].concat(...known.lib.listServer.map((m) => Object.keys(m.requirements)));
    const knownDebianPackages = [].concat(...known.lib.listServer.map((m) => Object.keys(m.debianPackages)));
    const knownRedhatPackages = [].concat(...known.lib.listServer.map((m) => Object.keys(m.redhatPackages)));

    const slibs = safe(pkg.caleydo, 'dependencies.python', {});
    const debianPackages = safe(pkg.caleydo, 'dependencies.debian', {});
    const redhatPackages = safe(pkg.caleydo, 'dependencies.redhat', {});

    this.config.defaults({
      type: this.args[0],
      name: name,
      author: 'The Caleydo Team',
      githubAccount: 'phovea',
      modules: Object.keys(pkg.peerDependencies).map(toPhoveaName).filter(validPlugin),
      extensions: safe(pkg.caleydo, 'plugins.web', []).map(toExtension.bind(this, name)),
      sextensions: safe(pkg.caleydo, 'plugins.python', []).map(toExtension.bind(this, name)),

      // merge valid web libraries with valid looked up server libraries
      libraries: Object.keys(libs)
        .filter(validLib).concat(
          Object.keys(slibs).filter((d) => knownRequirements.indexOf(d) >= 0).map((d) => requirement2lib[d])),

      unknown: {
        // filter unknown and convert to the common format
        requirements: Object.keys(slibs).filter((d) => knownRequirements.indexOf(d) < 0).map((d) => d + slibs[d]),
        debianPackages: Object.keys(debianPackages).filter((d) => knownDebianPackages.indexOf(d) < 0).map((d) => d + debianPackages[d]),
        redhatPackages: Object.keys(redhatPackages).filter((d) => knownRedhatPackages.indexOf(d) < 0).map((d) => d + redhatPackages[d])
      }
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

    this.fs.move(this.destinationPath('**.ts'), this.destinationPath('src/'));
    if (this.fs.exists(this.destinationPath('src/main.ts'))) {
      this.fs.move(this.destinationPath('src/main.ts'), this.destinationPath('src/index.ts'));
    }
    this.fs.move(this.destinationPath('*.scss'), this.destinationPath('src/'));
    this.fs.move(this.destinationPath('*.py'), this.destinationPath(this.config.get('name') + '/'));
    if (this.fs.exists(this.destinationPath('config.json'))) {
      this.fs.move(this.destinationPath('config.json'), this.destinationPath(this.config.get('name') + '/config.json'));
    }
  }
}

module.exports = Generator;
module.exports.extractFromReadme = extractFromReadme;
