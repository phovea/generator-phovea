'use strict';
const fs = require('fs');
const Base = require('yeoman-generator').Base;

// const comments = {
//   ts: {
//     begin: '/*',
//     body: '*',
//     end: '*/'
//   },
//   py: {
//     begin: '#',
//     body: '#',
//     end: '#'
//   },
//   scss: {
//     begin: '/*',
//     body: '*',
//     end: '*/'
//   }
// };

class Generator extends Base {
  constructor(args, options) {
    super(args, options);

    this.option('licencePath', {
      alias: 'l',
      default: './licence.txt',
      type: String,
      desc: 'Relative path to a licence file'
    });

    this.option('plugins', {
      alias: 'p',
      default: '',
      type: String,
      desc: 'Comma separated list (without spaces) of plugins to prepend the licence to'
    });
  }

  initializing() {
    this.plugins = this._readAvailablePlugins();
  }

  prompting() {
    return this.prompt([
      {
        type: 'input',
        name: 'licencePath',
        message: 'Please enter the relative path to the Licence.txt file',
        when: this.options.licencePath.length === 0
      },
      {
        type: 'checkbox',
        name: 'plugins',
        message: 'Please select the plugins to add licence headers',
        choices: this.plugins,
        when: this.options.plugins.length === 0
      }
    ]).then((props) => {
      this.licencePath = props.licencePath || this.options.licencePath;
      this.plugins = props.plugins || this.options.plugins.split(',');

      if (this.plugins.length === 0) {
        throw new Error('No plugins given. Run the generator with the -h option to see the manual.');
      }
    }).catch((err) => this.log(err));
  }

  /**
   * read workspace contents and only return plugins
   * @private
   */
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
