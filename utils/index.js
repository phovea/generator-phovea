'use strict';
const generators = require('yeoman-generator');
const _ = require('lodash');
const path = require('path');
const extend = require('deep-extend');

function patchPackageJSON(config, unset, extra) {
  var pkg = this.fs.readJSON(this.destinationPath('package.json'), {});

  var pkgPatch;
  if (this.fs.exists(this.templatePath('package.tmpl.json'))) {
    pkgPatch = JSON.parse(_.template(this.fs.read(this.templatePath('package.tmpl.json')))(config));
  } else {
    pkgPatch = {};
  }
  extend(pkg, pkgPatch, extra || {});

  (unset || []).forEach((d) => delete pkg[d]);

  this.fs.writeJSON(this.destinationPath('package.json'), pkg);
}

function writeTemplates(config, withSamples) {
  const includeDot = {
    globOptions: {
      dot: true
    }
  };
  const copy = (prefix) => {
    this.fs.copy(this.templatePath(prefix + 'plain/**/*'), this.destinationPath(), includeDot);
    this.fs.copyTpl(this.templatePath(prefix + 'processed/**/*'), this.destinationPath(), config, includeDot);

    this.fs.copy(this.templatePath(prefix + 'pluginname_plain/**/*'), this.destinationPath(config.name + '/'), includeDot);
    this.fs.copyTpl(this.templatePath(prefix + 'pluginname_processed/**/*'), this.destinationPath(config.name + '/'), config, includeDot);
  };
  copy('');
  if (withSamples) {
    copy('sample_');
  }
}

class BaseInitPluginGenerator extends generators.Base {

  constructor(args, options, basetype) {
    super(args, options);
    this.type = path.basename(path.dirname(this.resolved)).substring(5); // init-web ... web
    this.basetype = basetype || 'web';
    // Make options available
    this.option('skipInstall');
    this.option('noSamples');
    this.option('useDefaults');
  }

  initializing() {
    this.config.defaults({
      type: this.type
    });
  }

  readmeAddon() {
    const f = this.templatePath('README.partial.md');
    if (this.fs.exists(f)) {
      return this.fs.read(f);
    }
    return '';
  }

  default() {
    this.composeWith('phovea:_init-' + this.basetype, {
      options: extend({}, this.options, {
        readme: this.readmeAddon() + (this.options.readme ? `\n\n${this.options.readme}` : '')
      })
    }, {
      local: require.resolve('../generators/_init-' + this.basetype)
    });
  }

  writing() {
    const config = this.config.getAll();
    if (this.fs.exists(this.templatePath('package.tmpl.json'))) {
      this._patchPackageJSON(config);
    }
    this._writeTemplates(config, !this.options.noSamples);
  }

  _patchPackageJSON(config, unset, extra) {
    return patchPackageJSON.call(this, config, unset, extra);
  }

  _writeTemplates(config) {
    return writeTemplates.call(this, config);
  }
}

class BaseInitServerGenerator extends BaseInitPluginGenerator {

  constructor(args, options) {
    super(args, options, 'python');
  }

  initializing() {
    // since just last in the hierarchy used, need to do super calls
    super.initializing();
  }

  default() {
    return super.default();
  }

  writing() {
    return super.writing();
  }
}

module.exports = {
  Base: BaseInitPluginGenerator,
  BasePython: BaseInitServerGenerator,
  patchPackageJSON: patchPackageJSON,
  writeTemplates: writeTemplates
};
