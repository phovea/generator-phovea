'use strict';
var _ = require('lodash');
var parseAuthor = require('parse-author');
var generators = require('yeoman-generator');
var patchPackageJSON = require('../../utils').patchPackageJSON;

//based on https://github.com/yeoman/generator-node/blob/master/generators/app/index.js

class PackageJSONGenerator extends generators.Base {

  constructor(args, options) {
    super(args, options);
  }

  initializing() {
    const pkg = this.fs.readJSON(this.destinationPath('package.json'), {});

    this.props = {
      description: pkg.description,
      homepage: pkg.homepage
    };

    var authorName = 'Caleydo Team';
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
      name: pkg.name || '',
      author: authorName,
      today: (new Date()).toUTCString(),
      githubAccount: 'phovea',
    });
  }

  _promptForName() {
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
      default: this.config.get('description')
    }, {
      name: 'homepage',
      message: 'Project homepage url',
      default: 'https://phovea.caleydo.org',
    }, {
      name: 'authorName',
      message: 'Author\'s Name',
      default: this.user.git.name(),
      store: true
    }, {
      name: 'authorEmail',
      message: 'Author\'s Email',
      default: this.user.git.email(),
      store: true
    }, {
      name: 'authorUrl',
      message: 'Author\'s Homepage',
      store: true
    }, {
      name: 'githubAccount',
      message: 'GitHub username or organization',
      default: this.config.get('githubAccount'),
      store: true
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

  default() {
    this.composeWith('node:git', {
      options: {
        name: this.config.get('name'),
        githubAccount: this.config.get('githubAccount')
      }
    }, {
      local: require('generator-node').git
    });
  }

  writing() {
    const config = _.extend({}, this.props, this.config.getAll());
    patchPackageJSON.call(this, config);
  }
}

module.exports = PackageJSONGenerator;
