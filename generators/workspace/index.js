'use strict';
const Base = require('yeoman-generator').Base;
const path = require('path');
const glob = require('glob').sync;
const chalk = require('chalk');
const extend = require('lodash').extend;
const _ = require('lodash');

const known = () => require('../../utils/known');
const writeTemplates = require('../../utils').writeTemplates;
const patchPackageJSON = require('../../utils').patchPackageJSON;

function mergeWith(target, source) {
  const mergeArrayUnion = (a, b) => Array.isArray(a) ? _.union(a, b) : undefined;
  _.mergeWith(target, source, mergeArrayUnion);
  return target;
}

function isHelperContainer(name) {
  return name.includes('_');
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
    if (!isHelperContainer(k)) {
      mergeWith(services[k], host);
    }
  });
  return compose;
}

class Generator extends Base {

  constructor(args, options) {
    super(args, options);

    // readme content
    this.option('noAdditionals');
    this.option('defaultApp');
  }

  initializing() {
    this.props = this.fs.readJSON(this.destinationPath('.yo-rc-workspace.json'), {modules: [], defaultApp: null});
    this.props.defaultApp = this.props.defaultApp || this.options.defaultApp;
  }

  prompting() {
    const isInstalled = glob('*/package.json', {cwd: this.destinationPath()}).map(path.dirname);
    const apps = this._findApps();
    return this.prompt([{
      type: 'checkbox',
      name: 'modules',
      message: 'Additional Plugins',
      choices: known().plugin.listNamesWithDescription.filter((d) => !isInstalled.includes(d.value)),
      default: this.props.modules,
      when: !this.option('noAdditionals')
    }, {
      type: 'list',
      name: 'defaultApp',
      message: 'Default Application to launch using `npm start`?',
      choices: apps,
      default: apps[0],
      when: apps.length > 1 && !this.props.defaultApp
    }]).then((props) => {
      if (props.modules !== undefined) {
        this.props.modules = props.modules;
      }
      if (props.defaultApp) {
        this.props.defaultApp = props.defaultApp;
      } else if (apps.length === 1 && !this.props.defaultApp) {
        this.props.defaultApp = apps[0];
      }
    });
  }

  _findApps() {
    return glob('*/.yo-rc.json', {
      cwd: this.destinationPath()
    }).filter((p) => {
      const config = this.fs.readJSON(this.destinationPath(p));
      return config['generator-phovea'].type.includes('app');
    }).map(path.dirname);
  }

  _generateWebDependencies(additionalPlugins) {
    const files = glob('*/webpack.config.js', { // web plugin
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
      const k = known().plugin.byName(p);
      if (k && k.dependencies) {
        extend(dependencies, k.dependencies);
      }
    });

    if (this.props.defaultApp) {
      // enforce that the dependencies of the default app are the last one to have a setup suitable for the default app thus more predictable
      const pkg = this.fs.readJSON(this.destinationPath(this.props.defaultApp + '/package.json'));
      extend(dependencies, pkg.dependencies);
      extend(devDependencies, pkg.devDependencies);
    }

    // remove all plugins that are locally installed
    plugins.forEach((p) => {
      const k = known().plugin.byName(p);
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
    const dockerScripts = [];
    let dockerCompose = {};
    let dockerComposeDebug = {};
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
      const script = this.fs.read(this.destinationPath(`${p}/docker_script.sh`), {defaults: ''});
      if (script) {
        dockerScripts.push(script);
      }

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
      const dockerFile = (fileName) => {
        if (!this.fs.exists(this.destinationPath(fileName))) {
          return {};
        }
        const yaml = require('yamljs');
        const text = this.fs.read(this.destinationPath(fileName));
        const localCompose = yaml.parse(text);

        // inject to use right docker file
        Object.keys(localCompose.services || {}).forEach((key) => {
          const service = localCompose.services[key];
          if (service.build && service.build.context === '.') {
            service.build.dockerfile = `${p}/${service.build.dockerfile}`;
          }
          if (isHelperContainer(key)) {
            // change local volumes
            service.volumes = (service.volumes || []).map((volume) => {
              if (volume.startsWith('.')) {
                return `./${p}${volume.slice(1)}`;
              }
              return volume;
            });
          }
        });

        return localCompose;
      };
      mergeWith(dockerCompose, dockerFile(p + '/deploy/docker-compose.partial.yml'));
      mergeWith(dockerComposeDebug, dockerFile(p + '/deploy/docker-compose-debug.partial.yml'));
    });

    // add additional to install plugins
    additionalPlugins.forEach((p) => {
      const k = known().plugin.byName(p);
      if (k && k.requirements) {
        Object.keys(k.requirements).forEach((ri) => requirements.add(ri + k.requirements[ri]));
      }
      if (k && k.dockerPackages) {
        Object.keys(k.dockerPackages).forEach((ri) => dockerPackages.add(ri + k.dockerPackages[ri]));
      }
    });

    // remove all plugins that are locally installed
    plugins.forEach((p) => {
      const k = known().plugin.byName(p);
      if (k) {
        if (k.requirements) {
          Object.keys(k.requirements).forEach((pi) => {
            requirements.delete(pi + k.requirements[pi]);
          });
        }
        if (k.develop && k.develop.requirements) {
          Object.keys(k.develop.requirements).forEach((pi) => {
            requirements.delete(pi + k.develop.requirements[pi]);
          });
        }
        // more intelligent guessing to catch tags
        Array.from(requirements.keys()).forEach((k) => {
          if (k.includes(`/${p}.git@`) || k.startsWith(`${p}==`) || k.replace(/-/gm, '_').startsWith(`${p}==`)) {
            requirements.delete(k);
          }
        });
      } else {
        // more intelligent guessing
        Array.from(requirements.keys()).forEach((k) => {
          if (k.includes(`/${p}.git@`) || k.startsWith(`${p}==`) || k.replace(/-/gm, '_').startsWith(`${p}==`)) {
            requirements.delete(k);
          }
        });
      }
    });

    return {
      plugins: plugins,
      requirements: [...requirements.values()],
      devRequirements: [...devRequirements.values()],
      dockerPackages: [...dockerPackages.values()],
      dockerScripts: dockerScripts,
      scripts: scripts,
      dockerCompose: rewriteDockerCompose(dockerCompose),
      dockerComposeDebug: rewriteDockerCompose(dockerComposeDebug)
    };
  }

  _patchDockerImages(dockerComposePatch, dockerCompose) {
    const services = dockerCompose.services;
    if (!services) {
      return;
    }
    const patchedServices = dockerComposePatch.services || {};
    Object.keys(services).forEach((name) => {
      const patch = patchedServices[name];
      if (!patch) {
        return;
      }
      const service = services[name];
      mergeWith(service, patch);
      if (!service.build || !patch.image) {
        return;
      }
      delete service.image; // delete merged image if used
      const dockerFile = this.destinationPath(service.build.dockerfile);
      let content = this.fs.read(dockerFile).toString();
      // create a copy of the Dockerfile to avoid git changes
      const r = /^\s*FROM (.+)\s*$/igm;
      const fromImage = r.exec(content)[1];
      content = content.replace(r, `FROM ${patch.image}`);
      const targetDockerFile = this.destinationPath(`Dockerfile_${name}`);

      this.log(`patching ${dockerFile} change from ${fromImage} -> ${patch.image} resulting in ${targetDockerFile}`);
      this.fs.write(targetDockerFile, content);
      service.build.dockerfile = `Dockerfile_${name}`; // since we are in the workspace
    });
  }

  writing() {
    // save config
    this.fs.extendJSON(this.destinationPath('.yo-rc-workspace.json'), {
      modules: this.props.modules,
      defaultApp: this.props.defaultApp
    });

    const {plugins, dependencies, devDependencies, scripts} = this._generateWebDependencies(this.props.modules);
    const sdeps = this._generateServerDependencies(this.props.modules);

    // merge scripts together server wins
    extend(scripts, sdeps.scripts);
    // generate default start script
    if (this.props.defaultApp) {
      scripts.start = `cd ${this.props.defaultApp} && npm start`;
    }

    const patchYamlExists = this.fs.exists(this.destinationPath('docker-compose-patch.yaml'));
    if (patchYamlExists || this.fs.exists(this.destinationPath('docker-compose-patch.yml'))) {
      const yaml = require('yamljs');
      const file = this.fs.read(this.destinationPath(patchYamlExists ? 'docker-compose-patch.yaml' : 'docker-compose-patch.yml'));
      const patch = yaml.parse(file);
      this._patchDockerImages(patch, sdeps.dockerCompose);
    }
    {
      const yaml = require('yamljs');
      this.fs.write(this.destinationPath('docker-compose.yml'), yaml.stringify(sdeps.dockerCompose, 100, 2));
      this.fs.write(this.destinationPath('docker-compose-debug.yml'), yaml.stringify(sdeps.dockerComposeDebug, 100, 2));
    }

    const config = {};
    config.workspace = path.basename(this.destinationPath());
    config.modules = _.union(this.props.modules, plugins, sdeps.plugins);
    config.webmodules = plugins.filter((d) => this.fs.exists(this.destinationPath(d + '/phovea_registry.js')));
    config.dockerCompose = path.resolve(this.destinationPath('docker-compose.yml'));

    writeTemplates.call(this, config, false);
    // replace the added entries
    patchPackageJSON.call(this, config, [], {devDependencies, dependencies, scripts}, true);

    if (!this.fs.exists(this.destinationPath('config.json'))) {
      this.fs.copy(this.templatePath('config.tmpl.json'), this.destinationPath('config.json'));
    }

    this.fs.write(this.destinationPath('requirements.txt'), sdeps.requirements.sort().join('\n'));
    this.fs.write(this.destinationPath('requirements_dev.txt'), sdeps.devRequirements.sort().join('\n'));
    this.fs.write(this.destinationPath('docker_packages.txt'), sdeps.dockerPackages.sort().join('\n'));

    if (this.fs.exists(this.destinationPath('docker_script_patch.sh'))) {
      // push patch to the beginning
      sdeps.dockerScripts.unshift(this.fs.read(this.destinationPath('docker_script_patch.sh')));
    }

    this.fs.write(this.destinationPath('docker_script.sh'), `#!/usr/bin/env bash\n\n` + sdeps.dockerScripts.join('\n'));

    this.fs.copyTpl(this.templatePath('project.tmpl.iml'), this.destinationPath(`.idea/${config.workspace}.iml`), config);
    if (!this.fs.exists(this.destinationPath(`.idea/workspace.xml`))) {
      this.fs.copy(this.templatePath('workspace.tmpl.xml'), this.destinationPath(`.idea/workspace.xml`));
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
