'use strict';
const Base = require('yeoman-generator').Base;
const path = require('path');
const glob = require('glob').sync;
const extend = require('lodash').extend;

const known = require('../../utils/known');
const writeTemplates = require('../../utils').writeTemplates;

class Generator extends Base {

  constructor(args, options) {
    super(args, options);

    this.option('venv', {
      alias: 'v'
    });
  }

  initializing() {
    this.props = this.fs.readJSON(this.destinationPath('.yo-rc-workspace.json'), {modules: []});
  }

  prompting() {
    const isInstalled = glob('*/package.json', {cwd: this.destinationPath()}).map(path.dirname);
    return this.prompt([{
      type: 'list',
      name: 'virtualEnvironment',
      message: 'Virtual Environment',
      store: true,
      choices: ['none', 'vagrant', 'conda', 'virtualenv'],
      default: 'vagrant',
      when: !this.options.venv
    }, {
      type: 'checkbox',
      name: 'modules',
      message: 'Additional Plugins',
      choices: known.plugin.listNamesWithDescription.filter((d) => !isInstalled.includes(d.value)),
      default: this.props.modules
    }]).then((props) => {
      this.props.modules = props.modules;
      this.venv = props.virtualEnvironment || this.options.venv;
    });
  }

  default() {
    if (this.venv !== 'none') {
      this.composeWith(`phovea:workspace-${this.venv}`, {
        options: this.options
      }, {
        local: require.resolve(`../workspace-${this.venv}`)
      });
    }
  }

  _generatePackage(additionalPlugins) {
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

    // add additional to install plugins
    additionalPlugins.forEach((p) => {
      const k = known.plugin.byName(p);
      if (k && k.dependencies) {
        extend(dependencies, k.dependencies);
      }
    });

    // remove all plugins that are locally installed
    plugins.forEach((p) => {
      const k = known.plugin.byName(p);
      if (k && k.dependencies) {
        Object.keys(k.dependencies).forEach((pi) => {
          delete dependencies[pi];
        });
      } else {
        delete dependencies[p];
      }
    });

    return {plugins, dependencies, devDependencies, scripts};
  }

  _generateServerDependencies(additionalPlugins) {
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

    // add additional to install plugins
    additionalPlugins.forEach((p) => {
      const k = known.plugin.byName(p);
      if (k && k.requirements) {
        Object.keys(k.requirements).forEach((ri) => requirements.add(ri + k.requirements[ri]));
      }
      if (k && k.debianPackages) {
        Object.keys(k.debianPackages).forEach((ri) => debianPackages.add(ri + known.debianPackages[ri]));
      }
      if (k && k.debianPackages) {
        Object.keys(k.debianPackages).forEach((ri) => redhatPackages.add(ri + k.debianPackages[ri]));
      }
    });

    // remove all plugins that are locally installed
    plugins.forEach((p) => {
      const k = known.plugin.byName(p);
      if (k && k.requirements) {
        Object.keys(k.requirements).forEach((pi) => {
          requirements.delete(pi + k.requirements[pi]);
        });
      } else {
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
    this.fs.extendJSON(this.destinationPath('.yo-rc-workspace.json'), {modules: this.props.modules});

    const config = {};
    const {plugins, dependencies, devDependencies, scripts} = this._generatePackage(this.props.modules);
    config.workspace = path.dirname(this.destinationPath());
    config.modules = this.props.modules.concat(plugins);
    config.webmodules = plugins;

    writeTemplates.call(this, config, false);

    this.fs.copy(this.templatePath('package.tmpl.json'), this.destinationPath('package.json'));
    this.fs.extendJSON(this.destinationPath('package.json'), {devDependencies, dependencies, scripts});

    const sdeps = this._generateServerDependencies(this.props.modules);
    this.fs.write(this.destinationPath('requirements.txt'), sdeps.requirements.join('\n'));
    this.fs.write(this.destinationPath('requirements_dev.txt'), sdeps.devRequirements.join('\n'));
    this.fs.write(this.destinationPath('debian_packages.txt'), sdeps.debianPackages.join('\n'));
    this.fs.write(this.destinationPath('redhat_packages.txt'), sdeps.redhatPackages.join('\n'));

    this.fs.copy(this.templatePath('project.tmpl.json'), this.destinationPath(`.idea/${config.workspace}.iml`));
  }
}

module.exports = Generator;
