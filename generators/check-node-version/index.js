'use strict';
const Generator = require('yeoman-generator');
const check = require('check-node-version');
const path = require('path');
const fs = require('fs');
const checkRequiredVersion = require('../../utils/installedVersions').checkRequiredVersion;
const requiredNodeVersion = fs.readFileSync(path.resolve(__dirname, '../../.nvmrc'), 'utf8');
const requiredNpmVersion = fs.readFileSync(path.resolve(__dirname, '../../.npm-version'), 'utf8');

class NodeVersionGenerator extends Generator {

  initializing() {
    return new Promise((resolve, reject) => {
      check(
        {
          node: requiredNodeVersion,
          npm: requiredNpmVersion
        },
        (error, results) => {
          if (error) {
            reject(error);
          }

          const versions = {
            installed: {
              node: results.versions.node.version.version,
              npm: results.versions.npm.version.version
            },
            required: {
              node: requiredNodeVersion.replace('\n', ''),
              npm: requiredNpmVersion.replace('\n', '')
            }
          };

          try {
            resolve(checkRequiredVersion(versions));
          } catch (error) {
            reject(error);
          }
        }
      );
    })
      .then((message) => {
        this.message = message;
        return message;
      })
      .catch((error) => {
        this.log(error.message);

        process.exit(1); // terminate the whole yeoman process
      });
  }

  end() {
    if (this.message) {
      this.log(this.message);
    }
  }

}
module.exports = NodeVersionGenerator;
