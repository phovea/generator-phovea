'use strict';
const Generator = require('yeoman-generator');
const {merge, template} = require('lodash');
const path = require('path');
const glob = require('glob').sync;
const fs = require('fs');

function patchPackageJSON(config, unset, extra, replaceExtra) {
  const pkg = this.fs.readJSON(this.destinationPath('package.json'), {});

  let pkgPatch;
  if (fs.existsSync(this.templatePath('package.tmpl.json'))) {
    pkgPatch = JSON.parse(template(this.fs.read(this.templatePath('package.tmpl.json')))(config));
  } else {
    pkgPatch = {};
  }
  merge(pkg, pkgPatch);
  if (replaceExtra && extra) {
    Object.assign(pkg, extra);
  } else {
    merge(pkg, extra || {});
  }

  (unset || []).forEach((d) => delete pkg[d]);

  this.fs.writeJSON(this.destinationPath('package.json'), pkg);
}

function stringifyInline(obj, space) {
  let base = JSON.stringify(obj, null, ' ');
  // common style
  base = base.replace(/"/g, '\'');
  // prefix with space
  base = base.split('\n').map((l) => space + l).join('\n');
  return base.substring(space.length); // skip the first space
}

function stringifyAble(config) {
  return Object.assign({
    stringifyPython: (obj, space) => {
      let base = stringifyInline(obj, space);
      // python different true false
      base = base.replace(/: true/g, ': True').replace(/: false/g, ': False');
      return base;
    },
    stringify: stringifyInline,
    isWeb: (p) => {
      const {
        plugin
      } = require('./known');
      return plugin.isTypeWeb(p);
    }
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
    const f = glob(base + '/**/*', {
      dot: true
    });
    f.forEach((fi) => {
      const rel = path.relative(base, fi);
      this.fs.copyTpl(fi, this.destinationPath(dbase + rel), pattern);
    });
  };

  const copy = (prefix) => {
    if (fs.existsSync(this.templatePath(prefix + 'plain'))) {
      this.fs.copy(this.templatePath(prefix + 'plain/**/*'), this.destinationPath(), includeDot);
    }

    copyTpl(this.templatePath(prefix + 'processed'), '');

    if (config.name) {
      if (fs.existsSync(this.templatePath(prefix + 'pluginname_plain'))) {
        this.fs.copy(this.templatePath(prefix + 'pluginname_plain/**/*'), this.destinationPath(config.name.toLowerCase() + '/'), includeDot);
      }

      copyTpl(this.templatePath(prefix + 'pluginname_processed'), config.name.toLowerCase() + '/');
    }
  };
  copy('');
  if (withSamples) {
    copy('sample_');
  }
}

function useDevVersion() {
  const pkg = this.fs.readJSON(this.destinationPath('package.json'), {
    version: '1.0.0'
  });
  // assumption having a suffix like -SNAPSHOT use the dev version
  return (pkg.version || '').includes('-');
}

class BaseInitPluginGenerator extends Generator {

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
    this.composeWith(['phovea:_check-own-version', 'phovea:check-node-version']);

    this.config.defaults({
      type: this.type
    });
  }

  readmeAddon() {
    const f = this.templatePath('README.partial.md');
    if (fs.existsSync(f)) {
      return this.fs.read(f);
    }
    return '';
  }

  default() {
    this.composeWith('phovea:_init-' + this.basetype, {
      options: Object.assign({
        readme: this.readmeAddon() + (this.options.readme ? `\n\n${this.options.readme}` : '')
      }, this.options)
    });
  }

  writing() {
    const config = this.config.getAll();
    if (fs.existsSync(this.templatePath('package.tmpl.json'))) {
      this._patchPackageJSON(config);
    }
    if (fs.existsSync(this.templatePath('_gitignore'))) {
      this.fs.copy(this.templatePath('_gitignore'), this.destinationPath('.gitignore'));
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
  stringifyAble: stringifyAble,
  useDevVersion: useDevVersion
};
