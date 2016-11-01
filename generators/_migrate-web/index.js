'use strict';
const extend = require('deep-extend');
const Base = require('yeoman-generator').Base;

function extractFromReadme(content) {

  var longDescription = '';
  var content = '';

  return { longDescription, content};
}

class Generator extends Base {

  constructor(args, options) {
    super(args, options);
  }

  initializing() {
    const pkg = this.fs.readJSON(this.destinationPath('package.json'));

    const {longDescription, content} = extractFromReadme(this.fs.read(this.destinationPath('README.md')));
    /*this.config.defaults({
      type: 'lib',
      libraries: [],
      libraryAliases: {},
      modules: ['phovea_core'],
      entries: './index.js',
      ignores: [],
      extensions: []
    });*/
  }

  default() {

  }

  writing() {
    this.fs.move(this.destinationPath('*.ts'), this.destinationPath('src/'));
    this.fs.move(this.destinationPath('*.scss'), this.destinationPath('src/'));
    this.fs.delete(this.destinationPath('.gitignore'));
    this.fs.delete(this.destinationPath('.npmignore'));
    this.fs.delete(this.destinationPath('.gitattributes'));
    this.fs.delete(this.destinationPath('LICENSE'));
  }
}

module.exports = Generator;
module.exports.extractFromReadme = extractFromReadme;
