'use strict';
const Base = require('yeoman-generator').Base;
const path = require('path');
const yeoman = require('yeoman-environment');

function toPluginRepo(url, useSSH) {
  const match = url.match(/(github:)?([\w\d-_]+\/)?([\w\d-_]+)(#.+)?/);
  const repo = match ? `${match[4] ? `-b ${match[4].slice(1)} ` : ''}${useSSH ? 'git@github.com:' : 'https://github.com/'}${match[2] || ''}${match[3]}.git` : '';
  return {
    name: match ? match[3] : url,
    url,
    repo
  }
}

class Generator extends Base {
  constructor(args, options) {
    super(args, options);

    this.argument('pkgs', {
      description: 'the packages to install',
      type: Array,
      required: true
    });

    this.option('for', {
      type: String,
      description: 'the plugin for which should the package be registered',
      alias: 'for'
    });

    this.option('ssh', {
      alias: 's',
      defaults: false,
      type: Boolean
    });


    this.option('type', {
      type: String,
      default: 'lib',
      description: 'dependency type lib|plugin',
      alias: 't'
    });

    this.plugin = null;
    this.plugins = [];
  }

  _yo(generator, options) {
    // call yo internally
    const env = yeoman.createEnv([], {
      cwd: this.cwd
    }, this.env.adapter);
    env.register(require.resolve('../' + generator), 'phovea:' + generator);
    return new Promise((resolve, reject) => {
      try {
        this.log('running yo phovea:' + generator);
        env.run('phovea:' + generator, options || {}, () => {
          // wait a second after running yo to commit the files correctly
          setTimeout(() => resolve(), 500);
        });
      } catch (e) {
        console.error('error', e, e.stack);
        reject(e);
      }
    });
  }

  default() {
    this.plugin = this.options.for;

    if (this.fs.exists(this.destinationPath('../.yo-rc-workspace.json'))) {
      // we are in a workspace
      this.plugin = path.basename(this.destinationRoot());
      this.log('switch to workspace for install dependencies but keep ' + this.plugin, 'in mind');
      process.chdir('../');
    }
    if (this.options.type.startsWith('p')) {
      this.plugins = this.pkgs.map((url) => {
        const p = toPluginRepo(url, this.options.ssh);
        if (!p.repo) {
          this.log('can resolve repository for ' + url);
          return;
        }
        this.log(`cloning git clone ${p.repo}`);
        this.spawnCommandSync('git', ['clone'].concat(p.repo.split(' ')));
        return p;
      });
      this.log('updating workspace');
      return this._yo('workspace').then(() => {
        this.log('running npm install');
        this.npmInstall()
      });
    } else {
      this.log('installing: ', this.pkgs.join(' '));
      this.npmInstall(this.pkgs, {save: true});
    }
  }

  end() {
    if (this.plugin && this.fs.exists(this.destinationPath(`package.json`))) {
      // also store the dependency in the plugin
      const child = {dependencies: {}};
      if (this.options.type.startsWith('p')) {
        this.plugins.forEach((p) => {
          child.dependencies[p.name] = p.url;
        });
      } else {
        // copy from package json
        const parent = this.fs.readJSON(this.destinationPath('../package.json'));
        this.pkgs.forEach((p) => {
          const pp = parent.dependencies[p];
          if (pp) {
            child.dependencies[p] = pp;
          }
        });
      }
      this.fs.extendJSON(this.destinationPath(`package.json`), child);
    }
  }
}

module.exports = Generator;
