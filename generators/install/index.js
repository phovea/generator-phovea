'use strict';
const Base = require('yeoman-generator').Base;
const path = require('path');

class Generator extends Base {
  constructor(args, options) {
    super(args, options);

    this.argument('pkgs', {
      description: 'the packages to install',
      type: Array,
      required: true
    });

    this.option('plugin', {
      type: String,
      alias: 'p'
    });

    this.plugin = null;
  }

  default() {
    this.plugin = this.options.plugin;

    if (this.fs.exists(this.destinationPath('../.yo-rc-workspace.json'))) {
      // we are in a workspace
      this.plugin = path.basename(this.destinationRoot());
      this.log('switch to workspace for install dependencies but keep ' + this.plugin, 'in mind');
      process.chdir('../');
    }
    this.log('installing: ',this.pkgs.join(' '));
    this.npmInstall(this.pkgs, { save: true });
  }

  end() {
    this.log(this.plugin, this.destinationPath(`package.json`));
    if (this.plugin && this.fs.exists(this.destinationPath(`package.json`))) {
      // also store the dependency in the plugin
      const parent = this.fs.readJSON(this.destinationPath('../package.json'));
      const child = { dependencies: {}};
      this.pkgs.forEach((p) => {
        const pp = parent.dependencies[p];
        if (pp) {
          child.dependencies[p] = pp;
        }
      });
      this.fs.extendJSON(this.destinationPath(`package.json`), child);
    }
  }
}

module.exports = Generator;
