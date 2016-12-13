'use strict';
const Base = require('yeoman-generator').Base;
const path = require('path');
const glob = require('glob').sync;
const chalk = require('chalk');


function generateScripts() {
  const files = glob('*/requirements.txt', {
    cwd: this.destinationPath()
  });
  const plugins = files.map(path.dirname);

  var scripts = {};

  plugins.forEach((p) => {
    const pkg = this.fs.readJSON(this.destinationPath(p + '/package.json'));

    // vagrantify commands
    const cmds = Object.keys(pkg.scripts);

    var toPatch;
    if (cmds.includes('test:python')) { // hybrid
      toPatch = /^(check|(test|dist|start|watch):python)$/;
    } else { // regular server
      toPatch = /^(check|test|dist|start|watch)$/;
    }

    // no pre post test tasks
    cmds.filter((s) => toPatch.test(s)).forEach((s) => {
      // generate scoped tasks
      let cmd = `.${path.sep}withinEnv "exec 'cd ${p} && npm run ${s}'"`;
      if (/^(start|watch)/g.test(s)) {
        // special case for start to have the right working directory
        let fixedscript = pkg.scripts[s].replace(/__main__\.py/, p);
        cmd = `.${path.sep}withinEnv "${fixedscript}"`;
      }
      scripts[`${s}:${p}`] = cmd;
    });
  });

  return {
    scripts: scripts
  };
}

class Generator extends Base {

  initializing() {
    this.props = this.fs.readJSON(this.destinationPath('.yo-rc-workspace.json'), {
      containerName: 'phovea-' + path.basename(this.destinationPath())
    });
  }

  prompting() {
    return this.prompt({
      name: 'containerName',
      message: 'Container Name',
      default: this.props.containerName || 'phovea-' + path.basename(this.destinationPath())
    }).then((args) => {
      this.props.containerName = args.containerName;
    });
  }

  writing() {
    const config = this.props;
    config.destinationPath = this.destinationPath();
    this.fs.extendJSON(this.destinationPath('.yo-rc-workspace.json'), this.props);

    const includeDot = {
      globOptions: {
        dot: true
      }
    };
    this.fs.copy(this.templatePath('plain/**/*'), this.destinationPath(), includeDot);
    this.fs.copyTpl(this.templatePath('processed/**/*'), this.destinationPath(), config, includeDot);

    const scripts = generateScripts.call(this, '.');
    this.fs.extendJSON(this.destinationPath('package.json'), scripts);

    this.log('build using:', chalk.red(`docker build -t ${config.containerName} .`));
    this.log('run cli:', chalk.red(`docker run -t -i -name ${config.containerName}_i ${config.containerName} /bin/bash`));
    this.log('run server:', chalk.red(`docker run -t -i -name ${config.containerName}_i ${config.containerName} python phovea_server`));
  }
}

module.exports = Generator;
