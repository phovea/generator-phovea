'use strict';
const Base = require('yeoman-generator').Base;
const patchPackageJSON = require('../../utils').patchPackageJSON;
const path = require('path');
const glob = require('glob').sync;
const extend = require('lodash').extend;

class VagrantGenerator extends Base {

  initializing() {
    this.props = {
      guestIp: '192.168.50.52',
      hostPort: 9000
    };
  }

  // prompting() {
  //  return this.prompt([]).then((props) => {
  //
  //  });
  // }

  _generatePackage() {
    const files = glob('*/package.json', {
      cwd: this.destinationPath()
    });
    const plugins = files.map(path.dirname);

    // generate dependencies
    var dependencies = {};
    var scripts = {};
    plugins.forEach((p) => {
      const pkg = this.fs.readJSON(this.destinationPath(p + '/package.json'));
      extend(dependencies, pkg.dependencies);

      // no pre post test tasks
      Object.keys(pkg.scripts).filter((s) => !/^(pre|post).*/g.test(s)).forEach((s) => {
        // generate scoped tasks
        scripts[`${s}:${p}`] = `cd ${p} && npm run ${s}`;
      });
    });
    // remove all plugins that are locally installed
    plugins.forEach((p) => {
      delete dependencies[p];
    });

    return {
      dependencies: dependencies,
      scripts: scripts
    };
  }

  writing() {
    const config = this.props;
    const includeDot = {
      globOptions: {
        dot: true
      }
    };
    this.fs.copy(this.templatePath('plain/**/*'), this.destinationPath(), includeDot);
    this.fs.copyTpl(this.templatePath('processed/**/*'), this.destinationPath(), config, includeDot);

    const deps = this._generatePackage();
    patchPackageJSON.call(this, config, [], deps);
  }
}

module.exports = VagrantGenerator;
