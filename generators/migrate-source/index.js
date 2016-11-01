'use strict';
const extend = require('deep-extend');
const Base = require('yeoman-generator').Base;

function fixSourceFile(content) {
  // REMOVE /// <reference path="../../tsd.d.ts" />
  content = content.replace(/\/\/\/ <reference path="\.\.\/\.\.\/tsd\.d\.ts" \/>\s/gm, '');
  // FROM ../caleydo_(.*)/main to phovea_$1/src/index
  content = content.replace(/\.\.\/caleydo_(.*)\/main/gm, 'phovea_\$1/src/index');
  // FROM ../caleydo_(.*)/(.*)' to phovea_$1/src/$2'
  content = content.replace(/\.\.\/caleydo_(.*)\/(.*)/gm, 'phovea_\$1/src/\$2');
  // FROM import (.*) = require('(.*)') TO import * as $1 from '$2'
  content = content.replace(/import\s+(.*)\s+=\s+require\('(.*)'\)/gm, 'import * as \$1 from \'\$2\'');

  return content;
}

class Generator extends Base {

  writing() {
    this.fs.copy(this.destinationPath('src/*.ts'), this.destinationPath('src/'), {
      process: (contents) => {
        const ori = contents.toString();
        const processed = fixSourceFile(ori);
        return processed;
      }
    });
  }
}

module.exports = Generator;
