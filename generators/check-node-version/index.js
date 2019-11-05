'use strict';
const generators = require('yeoman-generator');
const check = require('check-node-version');
const printVersionNumber = require('../../utils/outputVersionNumber').printVersionNumber;
const path = require('path');
const fs = require('fs');
const nodeVersion = parseFloat(fs.readFileSync(path.resolve(__dirname, '../../.nvmrc'), 'utf8'));
const npmVersion = parseFloat(fs.readFileSync(path.resolve(__dirname, '../../.npm-version'), 'utf8'));

class NodeVersionGenerator extends generators.Base {

  initializing() {
    return new Promise((resolve) => {
      check({
        node: nodeVersion,
        npm: npmVersion
      },
        (error, results) => {
          try {
            return printVersionNumber(error, results, resolve);
          } catch (error) {
            this.log(error.message);
          }
        }
      );
    }).then((message) => {
      this.message = message;
      return message;
    });
  }

  end() {
    if (this.message) {
      this.log(this.message);
    }
  }

}
module.exports = NodeVersionGenerator;
