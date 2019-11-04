'use strict';
const generators = require('yeoman-generator');
const check = require("check-node-version");
const printVersionNumber = require('../../utils/outputVersionNumber').printVersionNumber;
const path = require('path');
const fs = require('fs');
const nvm = parseFloat(fs.readFileSync(path.resolve(__dirname, '../../.nvmrc'), 'utf8'));


class NodeVersionGenerator extends generators.Base {
  constructor(args, options) {
    super(args, options);
  }

  async initializing() {
    this.message = await new Promise((resolve, reject) => {
      check({
        node: nvm
      },
        (error, results) => printVersionNumber(results, resolve, this)
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
