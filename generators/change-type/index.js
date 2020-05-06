'use strict';
const Base = require('yeoman-generator');
const pluginTypes = ['lib', 'slib', 'lib-slib', 'lib-service', 'service', 'app', 'app-slib',]

class ChangeTypeGenerator extends Base {

  constructor(args, options) {
    super(args, options);
  }

  prompting() {
    const type = this.config.get('type');
    return this.prompt([{
      type: 'checkbox',
      name: 'type',
      message: 'New Type',
      default: ['slib'],
      choices: pluginTypes
    }]).then(({type}) => {
      this.old = this.config.get('type')
      this.log(type)
      this.config.set('type', type[0]);

    })
  }
  default() {
    const type = this.config.get('type')
    this.composeWith(`phovea:to-${type}-type`, {currentType: this.old, newType: this.config.get('type')})
  }
}

module.exports = ChangeTypeGenerator;
