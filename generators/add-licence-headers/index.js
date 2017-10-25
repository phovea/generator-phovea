'use strict';
const fs = require('fs');
const path = require('path');
const Base = require('yeoman-generator').Base;

const comments = {
  ts: {
    begin: '/*',
    body: '*',
    end: '*/'
  },
  py: {
    begin: '#',
    body: '#',
    end: '#'
  },
  scss: {
    begin: '/*',
    body: '*',
    end: '*/'
  }
};

class Generator extends Base {
  constructor(args, options) {
    super(args, options);
  }

  prompting() {
    const plugins = this._readAvailablePlugins();

    return this.prompt([
      {
        type: 'input',
        name: 'licencePath',
        message: 'Please enter the relative path to the Licence.txt file'
      },
      {
        type: 'checkbox',
        name: 'plugins',
        message: 'Please select the plugins to add licence headers',
        choices: plugins
      }
    ]).then((props) => {
      console.log('Props: ', props);
    });
  }

  _readAvailablePlugins() {
    const folderContents = fs.readdirSync(this.destinationPath());
    return folderContents
      .filter((element) => {
        const stat = fs.statSync(this.destinationPath(element));
        return stat.isDirectory() && // the element is a directory
          element !== 'node_modules' && // the element is not the node_modules folder
          !element.startsWith('_') && // the element does not start with "_" (e.g. _data, ...)
          !element.startsWith('.') && // the element is not a hidden directory
          fs.existsSync(this.destinationPath(element, 'phovea.js')); // the element (directory) contains a phovea.js file
      });
  }
}

module.exports = Generator;
