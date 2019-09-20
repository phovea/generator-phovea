/**
 * Created by Samuel Gratzl on 28.11.2016.
 */

const _ = require('lodash');
const Base = require('yeoman-generator')
const {writeTemplates, patchPackageJSON} = require('../../utils');
const {simplifyRepoUrl} = require('../../utils/repo');
const chalk = require('chalk');

const isRequired = (v) => v.toString().length > 0;

function buildPossibleAdditionalPlugins(type) {
  const toDescription = (d) => ({
    value: {name: d.name, repo: simplifyRepoUrl(d.repository)},
    name: `${d.name}: ${d.description}`,
    short: d.name
  });

  const plugins = require('../../utils/known').plugin;
  return ((type === 'web' || type === 'static') ? plugins.listWeb : plugins.listServer).map(toDescription);
}

class Generator extends Base {

  initializing() {
    this.services = [];

    // for the update
    this.config.defaults({
      type: 'product'
    });

    this.composeWith('phovea:_node', {
      options: this.options
    }, {
      local: require.resolve('../_node')
    });
  }

  _addCustomAdditional(service) {
    return this.prompt([{
      name: 'name',
      message: 'plugin name:',
      validate: isRequired
    }, {
      name: 'repo',
      message: 'repository (<githubAccount>/<repo>):',
      default: (act) => `Caleydo/${act.name}`,
      validate: isRequired
    }, {
      name: 'branch',
      message: 'repository branch (master) or tag (tags/v1.0.0): ',
      default: 'master',
      validate: isRequired
    }, {
      name: 'custom',
      type: 'confirm',
      message: 'add another custom additional plugin?: ',
      default: false
    }]).then((extra) => {
      service.additional.push(extra);
      const custom = extra.custom === true;
      delete extra.custom;
      return custom ? this._addCustomAdditional(service) : Promise.resolve(service);
    });
  }

  _addService() {
    return this.prompt([{
      type: 'list',
      name: 'type',
      message: 'service type:',
      choices: [
        {name: 'Web', value: 'web'},
        {name: 'Web without Rest-API connection', value: 'static'},
        {name: 'Rest-API', value: 'api'},
        {name: 'Service', value: 'service'}],
      default: 'web'
    }, {
      name: 'label',
      message: 'service name:',
      validate: isRequired
    }, {
      name: 'repo',
      message: 'primary repository (<githubAccount>/<repo>):',
      default: (act) => act.type === 'api' ? 'phovea/phovea_server' : null,
      validate: isRequired
    }, {
      name: 'branch',
      message: 'primary repository branch (master) or tag (tags/v1.0.0): ',
      default: 'master',
      validate: isRequired
    }, {
      name: 'additional',
      type: 'checkbox',
      message: 'additional plugins: ',
      choices: (act) => buildPossibleAdditionalPlugins(act.type)
    }, {
      name: 'custom',
      type: 'confirm',
      message: 'add custom additional plugin?',
      default: false
    }]).then((service) => {
      this.services.push(service);
      const custom = service.custom === true;
      delete service.custom;
      return custom ? this._addCustomAdditional(service) : Promise.resolve(service);
    }).then(() => this.prompt({
      name: 'custom',
      type: 'confirm',
      message: 'add another service?: ',
      default: false
    })).then((sel) => sel.custom ? this._addService() : Promise.resolve(this.services));
  }

  default() {
    if (this.options.useDefaults) {
      return;
    }
    return this._addService();
  }

  writing() {
    const config = this.config.getAll();
    patchPackageJSON.call(this, config);
    writeTemplates.call(this, config);
    this.fs.copy(this.templatePath('_gitignore'), this.destinationPath('.gitignore'));
    // don't overwrite existing registry file
    if (!this.fs.exists(this.destinationPath('phovea_product.json'))) {
      this.fs.writeJSON(this.destinationPath('phovea_product.json'), this.services);
    }
  }

  end() {
    this.log('\n\nuseful commands: ');
    this.log(chalk.yellow(' npm run build'), '             ... regular build');
    this.log(chalk.yellow(' node build.js --skipTests'), ' ... skip tests');
    this.log(chalk.yellow(' node build.js --quiet'), '     ... reduce log output');

    this.log('\n\nnext steps: ');
    this.log(chalk.yellow(' npm install'));
    this.log(chalk.yellow(' npm run build'));
  }
}

module.exports = Generator;
