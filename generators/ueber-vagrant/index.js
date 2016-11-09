'use strict';
const Base = require('yeoman-generator').Base;
const glob = require('glob').sync;
const path = require('path');

function generateScripts(baseDir) {
  baseDir = baseDir || '.';
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
      let cmd = `.${path.sep}withinEnv "cd ${baseDir}/${p} && npm run ${s}"`;
      if (/^(start|watch)/g.test(s)) {
        // special case for start to have the right working directory
        let fixedscript = pkg.scripts[s].replace(/__main__\.py/, p);
        cmd = `.${path.sep}withinEnv "cd ${baseDir} && ${fixedscript}"`;
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
    this.props = {
      guestIp: '192.168.50.52',
      hostPort: 9000
    };
  }

  writing() {
    const config = this.props;
    const includeDot = {
      globOptions: {
        dot: true
      }
    };
    this.fs.copy(this.templatePath('plain/**/*'), this.destinationPath(), includeDot);
    this.fs.copyTpl(this.templatePath('processed/**/*'), this.destinationPath(), config, includeDot);

    const scripts = generateScripts.call(this, '/vagrant');
    this.fs.extendJSON(this.destinationPath('package.json'), scripts);
  }

  install() {

  }
}

module.exports = Generator;
module.exports.generateScripts = generateScripts;
