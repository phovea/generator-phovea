/**
 * Created by Samuel Gratzl on 28.11.2016.
 */

const _ = require('lodash');
const Base = require('yeoman-generator').Base;
const {writeTemplates, patchPackageJSON, stringifyAble} = require('../../utils');

class PluginGenerator extends Base {

  constructor(args, options) {
    super(args, options);
  }

  initializing() {
    this.config.defaults({
      type: 'product'
    });
  }


  default() {
    this.composeWith('phovea:_node', {
      options: this.options
    }, {
      local: require.resolve('../_node')
    });
  }


  writing() {
    const config = this.config.getAll();
    patchPackageJSON.call(this, config);
    writeTemplates.call(this, config);
    // don't overwrite existing registry file
    if (!this.fs.exists(this.destinationPath('phovea_product.js'))) {
      this.fs.copyTpl(this.templatePath('phovea_product.tmpl.js'), this.destinationPath('phovea_product.js'), stringifyAble(config));
    }
  }

  install() {
    if (this.options.install) {
      this.installDependencies({
        bower: false
      });
    }
  }
}

module.exports = PluginGenerator;
