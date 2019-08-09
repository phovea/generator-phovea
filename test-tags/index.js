'use strict';
const Base = require('yeoman-generator').Base;

function failed(spawnResult) {
  return spawnResult.status !== 0;
}

class Generator extends Base {

  _abort(msg) {
    return Promise.reject(msg ? msg : 'Step Failed: Aborting');
  }

  _spawn(cmd, argline, cwd) {
    const options = cwd === false ? {} : Object.assign({
      cwd: this.cwd,
      stdio: ['inherit', 'pipe', 'pipe']
    }, cwd || {});
    return this.spawnCommandSync(cmd, Array.isArray(argline) ? argline : argline.split(' '), options);
  }

  _spawnOrAbort(cmd, argline, cwd) {
    const r = this._spawn(cmd, argline, cwd);
    if (failed(r)) {
      this.log(r);
      return this._abort(`failed: '${cmd} ${Array.isArray(argline) ? argline.join(' ') : argline}' - status code: ${r.status}`);
    }
    return Promise.resolve(r);
  }

  writing() {
    this._spawnOrAbort('git', 'ls-remote --tags https://github.com/phovea/generator-phovea')
      .then((r) => {
        const output = r.stdout.toString();
        console.log(output);
      })
      .catch((error) => console.error(error));

    return Promise.resolve(true);
  }
}

module.exports = Generator;
