'use strict';
const generators = require('yeoman-generator');
const _ = require('lodash');
const path = require('path');
const known = require('./known');
const glob = require('glob').sync;

function patchPackageJSON(config, unset, extra) {
  var pkg = this.fs.readJSON(this.destinationPath('package.json'), {});

  var pkgPatch;
  if (this.fs.exists(this.templatePath('package.tmpl.json'))) {
    pkgPatch = JSON.parse(_.template(this.fs.read(this.templatePath('package.tmpl.json')))(config));
  } else {
    pkgPatch = {};
  }
  _.merge(pkg, pkgPatch);
  _.merge(pkg, extra || {});

  (unset || []).forEach((d) => delete pkg[d]);

  this.fs.writeJSON(this.destinationPath('package.json'), pkg);
}

function stringifyInline(obj, space) {
  var base = JSON.stringify(obj, null, ' ');
  // common style
  base = base.replace(/"/g, '\'');
  // prefix with space
  base = base.split('\n').map((l) => space + l).join('\n');
  return base.substring(space.length); // skip the first space
}

function stringifyAble(config) {
  return _.assign({
    stringifyPython: (obj, space) => {
      var base = stringifyInline(obj, space);
      // python different true false
      base = base.replace(/: true/g, ': True').replace(/: false/g, ': False');
      return base;
    },
    stringify: stringifyInline,
    isWeb: known.plugin.isTypeWeb
  }, config);
}

function writeTemplates(config, withSamples) {
  const includeDot = {
    globOptions: {
      dot: true
    }
  };

  const pattern = stringifyAble(config);

  const copyTpl = (base, dbase) => {
    // see https://github.com/SBoudrias/mem-fs-editor/issues/25
    // copyTpl doesn't support glob options
    const f = glob(base + '/**/*.*', {dot: true});
    f.forEach((fi) => {
      const rel = path.relative(base, fi);
      this.fs.copyTpl(fi, this.destinationPath(dbase + rel), pattern);
    });
  };

  const copy = (prefix) => {
    this.fs.copy(this.templatePath(prefix + 'plain/**/*.*'), this.destinationPath(), includeDot);
    copyTpl(this.templatePath(prefix + 'processed'), '');

    this.fs.copy(this.templatePath(prefix + 'pluginname_plain/**/*.*'), this.destinationPath(config.name + '/'), includeDot);
    copyTpl(this.templatePath(prefix + 'pluginname_processed'), config.name + '/');
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
      options: _.assign({
        readme: this.readmeAddon() + (this.options.readme ? `\n\n${this.options.readme}` : '')
      }, this.options)
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

  _writeTemplates(config, withSamples) {
    return writeTemplates.call(this, config, withSamples);
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

class BaseInitHybridGenerator extends BaseInitPluginGenerator {

  constructor(args, options) {
    super(args, options, 'hybrid');
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
  BaseHybrid: BaseInitHybridGenerator,
  patchPackageJSON: patchPackageJSON,
  writeTemplates: writeTemplates,
  stringifyAble: stringifyAble
};
