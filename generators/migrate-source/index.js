'use strict';
const Base = require('yeoman-generator').Base;

function fixTSSourceFile(content) {
  // REMOVE /// <reference path="../../tsd.d.ts" />
  content = content.replace(/\/\/\/ <reference path="\.\.\/\.\.\/tsd\.d\.ts" \/>\s/gm, '');
  // FROM /main to /index
  content = content.replace(/\/main/gm, '/index');
  // FROM ../caleydo_(.*)/(.*)' to phovea_$1/src/$2'
  content = content.replace(/\.\.\/caleydo_(.*)\/(.*)/gm, 'phovea_$1/src/$2');
  // FROM import (.*) = require('(.*)') TO import * as $1 from '$2'
  content = content.replace(/import\s+(.*)\s+=\s+require\('(.*)'\)/gm, 'import * as $1 from \'$2\'');

  // FROM /// <amd-dependency path='css!(.*)' /> TO import '$1.scss';
  content = content.replace(/\/\/\/ <amd-dependency path='css!(.*)' \/>/gm, 'import \'$1.scss\';');

  return content;
}

function fixPythonSourceFile(content) {
  // FROM caleydo_ to phovea_
  content = content.replace(/caleydo_/gm, 'phovea_');

  return content;
}

class Generator extends Base {

  writing() {
    this.fs.copy(this.destinationPath('src/*.ts'), this.destinationPath('src/'), {
      process: (contents) => {
        const ori = contents.toString();
        return fixTSSourceFile(ori);
      }
    });
    const name = this.config.get('name');
    this.fs.copy(this.destinationPath(name + '/**.py'), this.destinationPath(name + '/'), {
      process: (contents) => {
        const ori = contents.toString();
        return fixPythonSourceFile(ori);
      }
    });
  }
}

module.exports = Generator;
