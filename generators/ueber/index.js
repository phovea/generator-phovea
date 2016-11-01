'use strict';
const Base = require('yeoman-generator').Base;
const patchPackageJSON = require('../../utils').patchPackageJSON;
const path = require('path');
const glob = require('glob').sync;
const extend = require('lodash').extend;

const knownPlugins = require('../../knownPhoveaPlugins.json');
const knownPlugins = [].concat(registry.plugins, registry.splugins);
const knownPluginNames = [].concat(registry.plugins, registry.splugins).map((d) => d.name));

function byName(name) {
  return knownPlugins[knownPluginNames.indexOf(name)];
}

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
    var devDependencies = {};
    var scripts = {};
    plugins.forEach((p) => {
      const pkg = this.fs.readJSON(this.destinationPath(p + '/package.json'));
      extend(dependencies, pkg.dependencies);
      extend(devDependencies, pkg.devDependencies);

      // no pre post test tasks
      Object.keys(pkg.scripts).filter((s) => !/^(pre|post).*/g.test(s)).forEach((s) => {
        // generate scoped tasks
        scripts[`${s}:${p}`] = `cd ${p} && npm run ${s}`;
      });
    });
    // remove all plugins that are locally installed
    plugins.forEach((p) => {
      const known = byName(p);
      if (known) {
        Object.keys(known.dependencies).forEach((pi) => {
          delete dependencies[pi];
        });
      } else {
        delete dependencies[p];
      }
    });

    return {
      dependencies: dependencies,
      devDependencies: devDependencies,
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
