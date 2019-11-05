'use strict';
const generators = require('yeoman-generator');
const check = require('check-node-version');
const path = require('path');
const fs = require('fs');
const checkRequiredVersion = require('../../utils/outputVersionNumber').checkRequiredVersion;
const requiredNodeVersion = fs.readFileSync(path.resolve(__dirname, '../../.nvmrc'), 'utf8');
const requiredNpmVersion = fs.readFileSync(path.resolve(__dirname, '../../.npm-version'), 'utf8');

class NodeVersionGenerator extends generators.Base {

  initializing() {
    return new Promise((resolve) => {
      check(
        {
          node: parseFloat(requiredNodeVersion),
          npm: parseFloat(requiredNpmVersion)
        },
        (error, results) => {
          if (error) {
            throw new Error(error);
          }

          const versions = {
            installed: {
              node: parseFloat(results.versions.node.version.version),
              npm: parseFloat(results.versions.npm.version.version)
            },
            required: {
              node: parseFloat(requiredNodeVersion),
              npm: parseFloat(requiredNpmVersion)
            },
            isSatisfied: results.isSatisfied
          };

          return resolve(checkRequiredVersion(versions));
        }
      );
    })
    .then((message) => {
      this.message = message;
      return message;
    })
    .catch((error) => {
      this.log(error.message);
    });
  }

  end() {
    if (this.message) {
      this.log(this.message);
    }
  }

}
module.exports = NodeVersionGenerator;
