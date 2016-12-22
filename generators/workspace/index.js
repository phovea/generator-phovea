'use strict';
const Base = require('yeoman-generator').Base;
const path = require('path');
const glob = require('glob').sync;
const chalk = require('chalk');
const extend = require('lodash').extend;
const _ = require('lodash');

const known = require('../../utils/known');
const writeTemplates = require('../../utils').writeTemplates;
const patchPackageJSON = require('../../utils').patchPackageJSON;

function mergeArrayUnion(a, b) {
  return Array.isArray(a) ? _.union(a, b) : undefined;
}

/**
 * rewrite the compose by inlining _host to all services not containing a dash, such that both api and celery have the same entry
 * @param compose
 */
function rewriteDockerCompose(compose) {
  const services = compose.services;
  if (!services) {
    return compose;
  }
  const host = services._host;
  delete services._host;
  Object.keys(services).forEach((k) => {
    if (!k.includes('_')) {
      _.mergeWith(services[k], host, mergeArrayUnion);
    }
  });
  return compose;
}

class Generator extends Base {

  constructor(args, options) {
    super(args, options);

    // readme content
    this.option('noAdditionals');
  }

  initializing() {
    this.props = this.fs.readJSON(this.destinationPath('.yo-rc-workspace.json'), {modules: []});
  }

  prompting() {
    const isInstalled = glob('*/package.json', {cwd: this.destinationPath()}).map(path.dirname);
    return this.prompt([{
      type: 'checkbox',
      name: 'modules',
      message: 'Additional Plugins',
      choices: known.plugin.listNamesWithDescription.filter((d) => !isInstalled.includes(d.value)),
      default: this.props.modules,
      when: !this.option('noAdditionals')
    }]).then((props) => {
      if (props.modules !== undefined) {
        this.props.modules = props.modules;
      }
    });
  }

  _generateWebDependencies(additionalPlugins) {
    const files = glob('*/phovea.js', { // web plugin
      cwd: this.destinationPath()
    });
    const plugins = files.map(path.dirname);

    // generate dependencies
    let dependencies = {};
    let devDependencies = {};
    let scripts = {};
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

    const requirements = new Set();
    const devRequirements = new Set();
    const dockerPackages = new Set();
    let dockerCompose = {};
    let scripts = {};

    plugins.forEach((p) => {
      // generate dependencies
      const addAll = (name, set) => {
        const r = this.fs.read(this.destinationPath(`${p}/${name}`), {defaults: ''});
        r.split('\n').filter((d) => d.trim().length > 0).forEach((ri) => {
          set.add(ri.trim());
        });
      };
      addAll('requirements.txt', requirements);
      addAll('requirements_dev.txt', devRequirements);
      addAll('docker_packages.txt', dockerPackages);

      {
        const pkg = this.fs.readJSON(this.destinationPath(p + '/package.json'));

        // vagrantify commands
        const cmds = Object.keys(pkg.scripts);

        let toPatch;
        if (cmds.includes('test:python')) { // hybrid
          toPatch = /^(check|(test|dist|start|watch):python)$/;
        } else { // regular server
          toPatch = /^(check|test|dist|start|watch)$/;
        }

        // no pre post test tasks
        cmds.filter((s) => toPatch.test(s)).forEach((s) => {
          // generate scoped tasks
          let cmd = `.${path.sep}withinEnv "exec 'cd ${p} && npm run ${s}'"`;
          if (/^(start|watch)/g.test(s)) {
            // special case for start to have the right working directory
            let fixedscript = pkg.scripts[s].replace(/__main__\.py/, p);
            cmd = `.${path.sep}withinEnv "${fixedscript}"`;
          }
          scripts[`${s}:${p}`] = cmd;
        });
      }

      // merge docker-compose
      if (this.fs.exists(this.destinationPath(p + '/deploy/docker-compose.partial.yml'))) {
        const yaml = require('yamljs');
        const text = this.fs.read(this.destinationPath(p + '/deploy/docker-compose.partial.yml'));
        const localCompose = yaml.parse(text);

        // inject to use right docker file
        Object.keys(localCompose.services || {}).forEach((key) => {
          const service = localCompose.services[key];
          if (service.build && service.build.context === '.') {
            service.build.dockerfile = `${p}/${service.build.dockerfile}`;
          }
          // change local volumes
          service.volumes = (service.volumes || []).map((volume) => {
            if (volume.startsWith('.')) {
              return `./${p}/${volume.slice(1)}`;
            }
            return volume;
          });
        });

        _.mergeWith(dockerCompose, localCompose, mergeArrayUnion);
      }
    });

    // add additional to install plugins
    additionalPlugins.forEach((p) => {
      const k = known.plugin.byName(p);
      if (k && k.requirements) {
        Object.keys(k.requirements).forEach((ri) => requirements.add(ri + k.requirements[ri]));
      }
      if (k && k.dockerPackages) {
        Object.keys(k.dockerPackages).forEach((ri) => dockerPackages.add(ri + known.dockerPackages[ri]));
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
      dockerPackages: [...dockerPackages.values()],
      scripts: scripts,
      dockerCompose: rewriteDockerCompose(dockerCompose)
    };
  }

  writing() {
    // save config
    this.fs.extendJSON(this.destinationPath('.yo-rc-workspace.json'), {modules: this.props.modules});

    const {plugins, dependencies, devDependencies, scripts} = this._generateWebDependencies(this.props.modules);
    const sdeps = this._generateServerDependencies(this.props.modules);

    // merge scripts together server wins
    extend(scripts, sdeps.scripts);

    const config = {};
    config.modules = this.props.modules.concat(plugins);
    config.webmodules = plugins;

    writeTemplates.call(this, config, false);
    patchPackageJSON.call(this, config, [], {devDependencies, dependencies, scripts});

    if (!this.fs.exists(this.destinationPath('config.json'))) {
      this.fs.copy(this.templatePath('config.tmpl.json'), this.destinationPath('config.json'));
    }

    this.fs.write(this.destinationPath('requirements.txt'), sdeps.requirements.join('\n'));
    this.fs.write(this.destinationPath('requirements_dev.txt'), sdeps.devRequirements.join('\n'));
    if (sdeps.dockerPackages.length > 0) {
      this.fs.write(this.destinationPath('docker_packages.txt'), sdeps.dockerPackages.join('\n'));
    }

    {
      const yaml = require('yamljs');
      this.fs.write(this.destinationPath('docker-compose.yml'), yaml.stringify(sdeps.dockerCompose, 100, 2));
    }
  }

  end() {
    this.log('\n\nuseful commands: ');
    this.log(chalk.red(' docker-compose up'), '        ... starts the system');
    this.log(chalk.red(' docker-compose restart'), '   ... restart');
    this.log(chalk.red(' docker-compose stop'), '      ... stop');
    this.log(chalk.red(' docker-compose build api'), ' ... rebuild api (in case of new dependencies)');

    this.log('\n\nnext steps: ');
    this.log(chalk.red(' npm install'));
    this.log(chalk.red(' docker-compose up'));
  }
}

module.exports = Generator;
