'use strict';
var path = require('path');
var generators = require('yeoman-generator');
var askName = require('inquirer-npm-name');
var _ = require('lodash');
var extend = require('deep-extend');
var mkdirp = require('mkdirp');

function makeGeneratorName(name) {
  name = _.kebabCase(name);
  name = name.indexOf('phovea_') === 0 ? name : 'phovea_' + name;
  return name;
}

class PluginGenerator extends Generators.Base {

  constructor(args, options) {
    super(args, options);

    // Make options available
    this.option('skip-welcome-message', {
      desc: 'Skip the welcome message',
      type: Boolean,
      defaults: false
    });
    this.option('skip-install');

    // Use our plain template as source
    this.sourceRoot(baseRootPath);

    this.config.save();


    this.props = {};
  }

  initializing() {
    if(!this.options['skip-welcome-message']) {
      this.log(require('yeoman-welcome'));
    }
  }

  prompting() {
    return askName({
      name: 'name',
      message: 'Your phovea plugin name',
      default: makeGeneratorName(path.basename(process.cwd())),
      filter: makeGeneratorName,
      validate: (str) => str.length > 'phovea-'.length
    }, this).then((props) => {
      this.props.name = props.name;
      this.config.set('name', this.props.name);
    });
  }

  default() {
    if (path.basename(this.destinationPath()) !== this.props.name) {
      this.log(
        'Your generator must be inside a folder named ' + this.props.name + '\n' +
        'I\'ll automatically create this folder.'
      );
      mkdirp(this.props.name);
      this.destinationRoot(this.destinationPath(this.props.name));
    }

    this.composeWith('node:app', {
      options: {
        babel: false,
        boilerplate: false,
        name: this.props.name,
        skipInstall: this.options.skipInstall
      }
    }, {
      local: require('generator-node').app
    });
  }

  configuring() {
    var pkg = this.fs.readJSON(this.destinationPath('package.json'));
    var pkg_patch = JSON.parse(_.template(this.fs.read(this.templatePath('package.tmpl.json')))({
      name: this.props.name
    }));
    extend(pkg, pkg_patch);

    this.fs.writeJSON(this.destinationPath('package.json'), pkg);

    this.props.repository = pkg.repository.url;
  }

  writing() {
    this.fs.copy(this.templatPath('plain/**/*'), this.destinationPath());
    this.fs.copyTpl(this.templatPath('processed/**/*'), this.destinationPath(), this.props);
  }

  install() {
    if(!this.options['skip-install']) {
      this.installDependencies({ bower: false });
    }
  }
}

module.exports = PluginGenerator;
