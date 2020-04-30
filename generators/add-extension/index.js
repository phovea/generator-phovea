'use strict';
const Base = require('yeoman-generator');

const plugins = require('../../utils/types').plugin;
const stringifyAble = require('../../utils').stringifyAble;
const path = require('path');
const fs = require('fs');
const glob = require('glob').sync;
const chalk = require('chalk');

function toJSONFromText(text) {
  const r = {};
  text.split('\n').forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0) { // ignore empty lines (e.g. new line added by editor)
      return;
    }

    const splitPoint = trimmedLine.indexOf('=');
    const key = trimmedLine.slice(0, splitPoint);
    let value = trimmedLine.slice(splitPoint + 1);
    value = value.trim();
    if (!isNaN(parseFloat(value))) {
      value = parseFloat(value);
    }
    let obj = r;
    const keys = key.trim().split('.');
    keys.slice(0, keys.length - 1).forEach((k) => {
      if (!(k in obj)) {
        obj[k] = {};
      }
      obj = obj[k];
    });
    obj[keys[keys.length - 1]] = value;
  });
  return r;
}

class Generator extends Base {
  constructor(args, options) {
    super(args, options);
    this.basetype = 'web';
    this.new_ = null;
  }

  initializing() {
    this.composeWith(['phovea:_check-own-version', 'phovea:check-node-version']);
  }

  /**
   * Find all plugins in the workspace by checking if they have a `.yo-rc.json file`.
   * @returns {string} The name of the plugin directory
   */
  _findPluginsInWorkspace() {
    const files = glob('*/.yo-rc.json', {
      cwd: this.destinationPath()
    });
    return files.map(path.dirname);
  }

  /**
   * Prompt the user to choose the application he would like to add the extension to when the generator is executed from the workspace.
   */
  _chooseApplication() {
    return this.prompt([{
      type: 'list',
      name: 'plugin',
      choices: this._findPluginsInWorkspace(),
      message: 'Plugin/Application',
      // default: 'web',
      when: this._isWorkspace()
    }]);
  }

  /**
   * Check if current directory is the workspace.
   */
  _isWorkspace() {
    return fs.existsSync(this.destinationPath('.yo-rc-workspace.json'));
  }

  /**
   * Reads a key in the `.yo.rc.json` either from the current directory or a subdirectory.
   * @param {string} path Directory name of the plugin, i.e., `phovea_core/`.
   * @param {string} key Key in the config file.
   * @return {string} The value of the key. Throws an error if the `.yo.rc.json` file has an invalid structure.
   */
  _readConfig(path, key) {
    try {
      if (path) {
        const config = this.fs.readJSON(this.destinationPath(path + '.yo-rc.json'), {})[GENERATOR_PHOVEA_CONFIG];
        return config[key]

      } else {
        this.config.get(key);
      }
    } catch (e) {
      throw new Error(chalk.red('Invalid `yo-rc.json` file in ' + path))
    }
  }

  /**
   * Saves configuration to the `.yo-rc.json file` either in the current directory or inside the plugin folder if the generator is executed from the workspace.
   * @param {*} path  Directory name of the plugin, i.e., `phovea_core/`.
   * @param {*} key Key in the config file.
   * @param {*} value Value to assign to key.
   */
  _writeConfig(path, key, value) {
    if (path) {
      const configFile = this.fs.readJSON(this.destinationPath(path + '.yo-rc.json'));
      configFile[GENERATOR_PHOVEA_CONFIG][key] = value;
      this.fs.writeJSON(this.destinationPath(path + '.yo-rc.json'), configFile);

    } else {
      this.config.set(key, value);
    }
  }

  async prompting() {
    const {plugin} = await this._chooseApplication();
    this.cwd = plugin ? plugin + '/' : '';

    const type = this._readConfig(this.cwd, 'type');
    const isHybridType = plugins.isTypeHybrid({type});

    return this.prompt([{
      type: 'list',
      name: 'basetype',
      choices: ['web', 'server'],
      message: 'Base Type',
      default: 'web',
      when: isHybridType
    }, {
      name: 'type',
      message: 'Type',
      required: true
    }, {
      name: 'id',
      message: 'ID',
      required: true
    }, {
      name: 'module',
      message: 'File Name',
      required: true
    }, {
      type: 'editor',
      name: 'extras',
      message: 'Extras (key=value)'
    }]).then((props) => {
      this.basetype = 'web';
      if ((isHybridType && props.basetype === 'server') || (!isHybridType && plugins.isTypeServer({type}))) {
        this.basetype = 'server';
      }
      this.new_ = {
        type: props.type,
        id: props.id,
        module: props.module,
        extras: toJSONFromText(props.extras)
      };
    });
  }

  writing() {
    const basekey = this.basetype === 'web' ? 'extensions' : 'sextensions';
    const arr = this._readConfig(this.cwd, basekey);
    arr.push(this.new_);
    this._writeConfig(this.cwd, basekey, arr);
    // inject new extension

    const d = stringifyAble(this.new_);

    if (this.basetype === 'web') {
      this._injectWebExtension(d);
    } else {
      this._injectServerExtension(d);
    }
  }

  _injectWebExtension(d) {
    const pathToRegistry = fs.existsSync('src/phovea.ts') ? 'src/phovea.ts' : 'phovea.js'; // check if the project has a phovea.ts file in src folder or a phovea.js in plugin root
    const file = this.destinationPath(pathToRegistry);
    const old = this.fs.read(file);
    let absFile = '';
    let importFunction = '';

    if(fs.existsSync('src/phovea.ts')) {
      absFile = d.module.startsWith('~') ? d.module.slice(1) : `./${d.module.includes('.') ? d.module.slice(0, d.module.lastIndexOf('.')) : d.module}`;
      importFunction = `() => System.import('${absFile}')`; // TODO remove System.import for Typescript case when switching to Webpack 4 (see https://github.com/phovea/generator-phovea/issues/286#issuecomment-566553497)
    } else {
      absFile = d.module.startsWith('~') ? d.module.slice(1) : `./src/${d.module.includes('.') ? d.module.slice(0, d.module.lastIndexOf('.')) : d.module}`;
      importFunction = `function() { return import('${absFile}'); }`;
    }
    const text = `\n\n  registry.push('${d.type}', '${d.id}', ${importFunction}, ${d.stringify(d.extras, ' ')});\n  // generator-phovea:end`;
    const new_ = old.replace('  // generator-phovea:end', text);
    this.fs.write(file, new_);

    const target = this.destinationPath(`src/${d.module}${d.module.includes('.') ? '' : '.ts'}`);
    if (absFile.startsWith('.') && !fs.existsSync(target)) {
      let source = this.templatePath(`${d.type}.tmpl.ts`);
      if (!fs.existsSync(source)) {
        source = this.templatePath('template.tmpl.ts');
      }
      const config = this._getModuleConfig(target);
      this.fs.copyTpl(source, target, Object.assign(config, d));
    }
  }

  _injectServerExtension(d) {
    const name = this.config.get('name');
    const file = this.destinationPath(`${name}/__init__.py`);
    const old = this.fs.read(file);
    const text = `\n\n  registry.append('${d.type}', '${d.id}', '${name}.${d.module}', ${d.stringifyPython(d.extras, '  ')})\n  # generator-phovea:end`;
    const new_ = old.replace('  # generator-phovea:end', text);
    this.fs.write(file, new_);

    const target = this.destinationPath(`${name}/${d.module}.py`);
    if (!fs.existsSync(target)) {
      let source = this.templatePath(`${d.type}.tmpl.py`);
      if (!fs.existsSync(source)) {
        source = this.templatePath('template.tmpl.py');
      }
      const config = this._getModuleConfig(target);
      this.fs.copyTpl(source, target, Object.assign(config, d));
    }
  }

  _getModuleConfig(target) {
    return {
      moduleName: path.basename(target, path.extname(target))
    };
  }
}

module.exports = Generator;
