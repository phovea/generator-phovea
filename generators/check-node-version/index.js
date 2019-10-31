'use strict';
const generators = require('yeoman-generator');
const check = require("check-node-version");
// const nvmVersion=require('../../')


class NodeVersionGenerator extends generators.Base {

  constructor(args, options) {
    super(args, options);

  }
  async initializing() {
    return new Promise((resolve, reject) => {
      check({
          node: '6',
        },
        (error, results) => {
          if (error) {
            reject(error);
            return;
          }

          if (!results.isSatisfied) {
            this.log(`Your Node versions is ${results.versions.node.version.version}. Required Node version range is ${results.versions.node.wanted.range}.`);
            resolve(results);
          }
          if (results.isSatisfied) {
            this.log(results.versions)
            resolve(results);
          }
        }
      );
    });
  }
}
module.exports = NodeVersionGenerator
