'use strict';
var path = require('path');
var generators = require('yeoman-generator');
var askName = require('inquirer-npm-name');
var _ = require('lodash');
var extend = require('deep-extend');

function patchPackageJSON(config, unset, extra) {
  var pkg = this.fs.readJSON(this.destinationPath('package.json'), {});
  this.log('PACKAGE', pkg);

  var pkg_patch = JSON.parse(_.template(this.fs.read(this.templatePath('package.tmpl.json')))(config));
  extend(pkg, pkg_patch, extra || {});

  (unset || []).forEach((d) => delete pkg[d]);

  this.fs.writeJSON(this.destinationPath('package.json'), pkg);
}


class BasePluginGenerator extends generators.Base {

  constructor(type, args, options, basetype) {
    super(args, options);
    this.type = type;
    this.basetype = basetype || 'web';
    this.config.set('type', type);
    // Make options available
    this.option('skipInstall');
  }

  initializing() {
    this.config.defaults({
      name: ''
    });
  }

  prompting() {
    if (this.config.get('name') !== '') {
      //already set
      return Promise.resolve(null);
    }
    return askName({
      name: 'name',
      message: 'Your phovea '+this.type+' plugin name',
      default: path.basename(process.cwd()),
      filter: _.kebabCase
    }, this).then((props) => {
      this.config.set('name', props.name);
    });
  }

  default() {
    this.log(this.basetype);
    this.composeWith('phovea:'+this.basetype+'-plugin', {
      options: {
        skipInstall: this.options.skipInstall
      }
    }, {
      local: require.resolve('../generators/'+this.basetype+'-plugin')
    });
  }


  writing() {
    const config = this.config.getAll();
    if (this.fs.exists(this.templatePath('package.tmpl.json'))) {
      this._patchPackageJSON(config);
    }
    this._writeTemplates(config);
  }

  _patchPackageJSON(config, unset, extra) {
    return patchPackageJSON.call(this, config, unset, extra);
  }

  _writeTemplates(config) {
    this.fs.copy(this.templatePath('plain/**/*'), this.destinationPath());
    this.fs.copyTpl(this.templatePath('processed/**/*'), this.destinationPath(), config);

    this.fs.copy(this.templatePath('pluginname/plain/**/*'), this.destinationPath(config.name+'/'));
    this.fs.copyTpl(this.templatePath('pluginname/processed/**/*'), this.destinationPath(config.name+'/'), config);
  }
}

module.exports = {
  Base: BasePluginGenerator,
  patchPackageJSON: patchPackageJSON
};
