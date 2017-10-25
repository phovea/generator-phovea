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
    return this.prompt([
      {
        type: 'input',
        name: 'licencePath',
        message: 'Please enter the relative path to the Licence.txt file'
      }
    ]).then((props) => {
      console.log('Props: ', props);
    });
  }

}

module.exports = Generator;
