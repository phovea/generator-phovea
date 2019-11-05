'use strict';
const generators = require('yeoman-generator');
const check = require("check-node-version");
const printVersionNumber = require('../../utils/outputVersionNumber').printVersionNumber;
const path = require('path');
const fs = require('fs');
const nodeVersion = parseFloat(fs.readFileSync(path.resolve(__dirname, '../../.nvmrc'), 'utf8'));
const npmVersion = parseFloat(fs.readFileSync(path.resolve(__dirname, '../../npm-version'), 'utf8'));

class NodeVersionGenerator extends generators.Base {
  constructor(args, options) {
    super(args, options);
  }

  async initializing() {
    this.message = await new Promise((resolve, reject) => {
      check({
        node: nodeVersion,
        npm: npmVersion
      },
        (error, results) => printVersionNumber(error,results, resolve, this)
      );
    });
  }
  end() {
    if (this.message) {
      this.log(this.message);
    }
  }

}
module.exports = NodeVersionGenerator
