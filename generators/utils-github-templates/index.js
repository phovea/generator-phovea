'use strict';
const Base = require('yeoman-generator').Base;
const path = require('path');
const plugins = require('../../utils/list-plugins');

/**
 * Create the `.github` directory and copy/replace the issue and pull-request templates.
 */
class Generator extends Base {

  initializing() {
    this.isWorkspace = this.fs.exists(this.destinationPath('.yo-rc-workspace.json'));
  }

  prompting() {
    if (!this.isWorkspace) {
      this.pluginNames = [path.basename(this.destinationPath())];
      return; // no prompting for single plugins
    }

    // for workspace scenario: let user choose plugins that should be updated
    const allPlugins = plugins.listAllPlugins(this.destinationPath());

    return this.prompt([{
      type: 'checkbox',
      name: 'plugins',
      message: 'Update templates for the following plugins ...',
      choices: allPlugins,
      default: allPlugins
    }])
    .then((props) => {
      this.pluginNames = props.plugins;
    });
  }

  writing() {
    // @see https://stackoverflow.com/a/35271053
    const includeDot = {
      globOptions: {
        dot: true
      }
    };

    this.pluginNames.forEach((pluginName) => {
      const destinationPath = (this.isWorkspace) ? this.destinationPath(pluginName) : this.destinationPath(); // non-workspace: path contains already the plugin name
      this.fs.copy(this.templatePath('plain/**/*'), destinationPath, includeDot);
    });
  }

}

module.exports = Generator;
