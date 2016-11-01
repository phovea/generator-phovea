'use strict';
const _ = require('lodash');
const askName = require('inquirer-npm-name');
const parseAuthor = require('parse-author');
const Base = require('yeoman-generator').Base;
const patchPackageJSON = require('../../utils').patchPackageJSON;
const originUrl = require('git-remote-origin-url');

// based on https://github.com/yeoman/generator-node/blob/master/generators/app/index.js

class PackageJSONGenerator extends Base {

  constructor(args, options) {
    super(args, options);

    // readme content
    this.option('readme');
    this.option('longDescription');
    this.option('useDefaults');
  }

  initializing() {
    const pkg = this.fs.readJSON(this.destinationPath('package.json'), {});

    this.props = {
      description: pkg.description || '',
      homepage: pkg.homepage || 'https://phovea.caleydo.org',
      authorEmail: this.user.git.email(),
      authorUrl: ''
    };

    var authorName = this.user.git.name() || 'Caleydo Team';
    if (_.isObject(pkg.author)) {
      authorName = pkg.author.name;
      this.props.authorEmail = pkg.author.email;
      this.props.authorUrl = pkg.author.url;
    } else if (_.isString(pkg.author)) {
      let info = parseAuthor(pkg.author);
      authorName = info.name;
      this.props.authorEmail = info.email;
      this.props.authorUrl = info.url;
    }

    this.config.defaults({
      name: pkg.name || this.determineAppname(),
      author: authorName,
      today: (new Date()).toUTCString(),
      githubAccount: this.github ? this.github.username() : 'phovea'
    });

    return originUrl(this.destinationPath()).then((url) => {
      this.originUrl = url;
    }, () => {
      this.originUrl = '';
    });
  }

  _promptForName() {
    if (this.options.useDefaults) {
      return Promise.resolve(null);
    }
    return askName({
      name: 'name',
      message: 'Plugin Name',
      default: this.config.get('name'),
      filter: _.snakeCase
    }, this).then((props) => {
      this.config.set('name', props.name);
    });
  }

  _promptDescription() {
    return this.prompt([{
      name: 'description',
      message: 'Description',
      default: this.props.description,
      when: !this.options.useDefaults
    }, {
      name: 'homepage',
      message: 'Project homepage url',
      default: this.props.homepage,
      when: !this.options.useDefaults
    }, {
      name: 'authorName',
      message: 'Author\'s Name',
      default: this.config.get('author'),
      store: true,
      when: !this.options.useDefaults
    }, {
      name: 'authorEmail',
      message: 'Author\'s Email',
      default: this.props.authorEmail,
      store: true,
      when: !this.options.useDefaults
    }, {
      name: 'authorUrl',
      message: 'Author\'s Homepage',
      default: this.props.authorUrl,
      store: true,
      when: !this.options.useDefaults
    }, {
      name: 'githubAccount',
      message: 'GitHub username or organization',
      default: this.config.get('githubAccount'),
      store: true,
      when: !this.options.useDefaults
    }]).then((props) => {
      this.props.description = props.description;
      this.props.homepage = props.homepage;
      this.config.set('author', props.authorName);
      this.props.authorEmail = props.authorEmail;
      this.props.authorUrl = props.authorUrl;
      this.config.set('githubAccount', props.githubAccount);
    });
  }

  prompting() {
    return this._promptForName().then(() => this._promptDescription());
  }

  writing() {
    const config = _.extend({}, this.props, this.config.getAll());

    if (this.originUrl) {
      config.repository = this.originUrl;
    } else {
      config.repository = `https://github.com/${config.githubAccount}/${config.name}.git`;
    }
    patchPackageJSON.call(this, config);

    config.content = this.options.readme || '';
    config.longDescription = this.options.longDescription || this.props.description || '';
    this.fs.copyTpl(this.templatePath('README.tmpl.md'), this.destinationPath('README.md'), config);

    const includeDot = {
      globOptions: {
        dot: true
      }
    };
    this.fs.copy(this.templatePath('plain/**/*'), this.destinationPath(), includeDot);
  }

  end() {
    this.spawnCommandSync('git', ['init'], {
      cwd: this.destinationPath()
    });
  }
}

module.exports = PackageJSONGenerator;
