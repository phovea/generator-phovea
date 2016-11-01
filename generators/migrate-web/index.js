'use strict';
const extend = require('deep-extend');
const Base = require('yeoman-generator').Base;

function extractFromReadme(content) {
  const safe = (p) => p ? p[1] : '';
  // between header and installation
  const longDescription = safe(content.match(/=====$\s([\s\S]*)^Installation/m)).trim();
  // usage till end line
  const readme = safe(content.match(/(^Usage[\s\S]*)^\*\*\*$/m)).trim();

  return { longDescription, readme};
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
      readme: readme.replace(/Caleydo Web/g, 'Phovea').replace(/\.\.\/caleydo_/g,'phovea_'),
      authorEmail: 'contact@caleydo.org',
      authorUrl: 'https://caleydo.org'
    };
    this.config.defaults({
      type: this.args[0],
      name: pkg.name.replace(/^caleydo_/, 'phovea_'),
      author: 'The Caleydo Team',
      githubAccount: 'phovea',
      libraries: [],
      libraryAliases: {},
      modules: ['phovea_core'],
      entries: './index.js',
      ignores: [],
      extensions: []
    });
  }

  default() {
    this.composeWith('phovea:init-'+this.args[0], {
      options: this.props
    }, {
      local: require.resolve('../init-'+this.args[0])
    });
  }

  writing() {
    this.fs.move(this.destinationPath('*.ts'), this.destinationPath('src/'));
    this.fs.move(this.destinationPath('*.scss'), this.destinationPath('src/'));
    this.fs.delete(this.destinationPath('.gitignore'));
    this.fs.delete(this.destinationPath('.npmignore'));
    this.fs.delete(this.destinationPath('.gitattributes'));
    this.fs.delete(this.destinationPath('LICENSE'));

    this.fs.delete(this.destinationPath('package.json'));
  }
}

module.exports = Generator;
module.exports.extractFromReadme = extractFromReadme;
