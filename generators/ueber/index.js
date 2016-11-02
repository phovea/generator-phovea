'use strict';
const Base = require('yeoman-generator').Base;
const patchPackageJSON = require('../../utils').patchPackageJSON;
const path = require('path');
const glob = require('glob').sync;
const extend = require('lodash').extend;

const registry = require('../../knownPhoveaPlugins.json');
const knownPlugins = [].concat(registry.plugins, registry.splugins);
const knownPluginNames = [].concat(registry.plugins, registry.splugins).map((d) => d.name);

function byName(name) {
  return knownPlugins[knownPluginNames.indexOf(name)];
}

class Generator extends Base {

  constructor(args, options) {
    super(args, options);

    this.option('venv', {
      alias: 'v'
    });

    this.props = {};
  }

  prompting() {
    return this.prompt({
      type: 'list',
      name: 'virtualEnvironment',
      message: 'Virtual Environment',
      store: true,
      choices: ['none', 'vagrant', 'conda', 'virtualenv'],
      default: 'vagrant',
      when: !this.options.venv
    }).then((props) => {
      this.venv = props.virtualEnvironment || this.options.venv;
    });
  }

  default() {
    if (this.venv !== 'none') {
      this.composeWith(`phovea:ueber-${this.venv}`, {
        options: this.options
      }, {
        local: require.resolve(`../ueber-${this.venv}`)
      });
    }
  }

  _generatePackage() {
    const files = glob('*/phovea.js', { // web plugin
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
      if (known && known.dependencies) {
        Object.keys(known.dependencies).forEach((pi) => {
          delete dependencies[pi];
        });
      } else {
        delete dependencies[p];
      }
    });

    return { plugins, dependencies, devDependencies, scripts };
  }

  _generateServerDependencies() {
    const files = glob('*/requirements.txt', { // server plugin
      cwd: this.destinationPath()
    });
    const plugins = files.map(path.dirname);

    var requirements = new Set();
    var devRequirements = new Set();
    var debianPackages = new Set();
    var redhatPackages = new Set();

    plugins.forEach((p) => {
      // generate dependencies
      const addAll = (name, set) => {
        const r = this.fs.read(this.destinationPath(`${p}/${name}`));
        r.split('\n').forEach((ri) => {
          set.add(ri.trim());
        });
      };
      addAll('requirements.txt', requirements);
      addAll('requirements_dev.txt', devRequirements);
      addAll('debian_packages.txt', debianPackages);
      addAll('redhat_packages.txt', redhatPackages);
    });
    // remove all plugins that are locally installed
    plugins.forEach((p) => {
      const known = byName(p);
      if (known && known.requirements) {
        Object.keys(known.requirements).forEach((pi) => {
          requirements.delete(pi + known.requirements[pi]);
        });
      } else {
        this.log('unknown', p);
        requirements.delete(p);
      }
    });

    return {
      requirements: [...requirements.values()],
      devRequirements: [...devRequirements.values()],
      debianPackages: [...debianPackages.values()],
      redhatPackages: [...redhatPackages.values()]
    };
  }

  writing() {
    const config = this.props;
    const {plugins, dependencies, devDependencies, scripts} = this._generatePackage();
    const includeDot = {
      globOptions: {
        dot: true
      }
    };

    config.modules = plugins;

    this.fs.copy(this.templatePath('plain/**/*'), this.destinationPath(), includeDot);
    this.fs.copyTpl(this.templatePath('processed/**/*'), this.destinationPath(), config, includeDot);

    patchPackageJSON.call(this, config, [], { devDependencies, dependencies, scripts});

    const sdeps = this._generateServerDependencies();
    this.fs.write(this.destinationPath('requirements.txt'), sdeps.requirements.join('\n'));
    this.fs.write(this.destinationPath('requirements_dev.txt'), sdeps.devRequirements.join('\n'));
    this.fs.write(this.destinationPath('debian_packages.txt'), sdeps.debianPackages.join('\n'));
    this.fs.write(this.destinationPath('redhat_packages.txt'), sdeps.redhatPackages.join('\n'));
  }
}

module.exports = Generator;
