'use strict';
const _ = require('lodash');
const parseAuthor = require('parse-author');
const Base = require('yeoman-generator');
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
      description: this.options.description || pkg.description || '',
      homepage: this.options.homepage || pkg.homepage || 'https://phovea.caleydo.org',
      authorEmail: this.options.authorEmail || this.user.git.email(),
      authorUrl: this.options.authorUrl || '',
      version: pkg.version || '1.0.0-SNAPSHOT'
    };

    let authorName = this.user.git.name() || 'Caleydo Team';
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
    this.originUrl = '';
    if (!this.options.useDefaults) {
      return originUrl(this.destinationPath()).then((url) => {
        this.originUrl = url;
      }, () => {}); // ignore errors
    }
  }

  _promptForName() {
    if (this.options.useDefaults) {
      return Promise.resolve(null);
    }
    return this.prompt([{
      name: 'name',
      message: 'Plugin Name',
      default: this.config.get('name'),
      validate: this._hasNoWhiteSpace, // check if plugin name has no white space between
      filter: (name) => name.trim() // filter white space around plugin name
    }]).then((props) => {
      this.config.set('name', props.name);
    });
  }

  /**
   * Check if string is one continuous word with no spaces
   * i.e _hasNoWhiteSpace('my app')--> false
   * @param {string} string
   * @returns {boolean|string} Returns true if the given string does not contain white spaces. Otherwise it returns an error message string.
   */
  _hasNoWhiteSpace(string) {
    return string.trim().indexOf(' ') === -1 || 'The plugin name must not contain white spaces. Please use dash (-) or underscore (_) as separator instead.';
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
      if (!this.options.useDefaults) {
        this.props.description = props.description;
        this.props.homepage = props.homepage;
        this.config.set('author', props.authorName);
        this.props.authorEmail = props.authorEmail;
        this.props.authorUrl = props.authorUrl;
        this.config.set('githubAccount', props.githubAccount);
      }
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
