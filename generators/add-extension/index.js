'use strict';
const Base = require('yeoman-generator').Base;

const known = require('../../utils/known');
const plugins = known.plugins;
const libs = known.libs;
const stringifyAble = require('../../utils').stringifyAble;

function toJSONFromText(text) {
  const r = {};
  text.split('\n').forEach((line) => {
    var [key, value] = line.split('=');
    value = value.trim();
    try {
      value = parseFloat(value);
    }
    var obj = r;
    const keys = key.trim().split('.');
    keys.slice(0, keys.length - 1).forEach((k) => {
      obj = obj[k] || {};
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

  prompting() {
    const type = this.config.get('type');
    const isHybridType = known.plugins.isTypeHybrid({type});

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
      if ((isHybridType && props.basetype === 'server') || (!isHybridType && known.plugins.isTypeServer({type}))) {
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
    const arr = this.config.get(basekey);
    arr.push(this.new_);
    this.config.set(basekey, arr);

    // inject new extension

    const d = stringifyAble(this.new_);

    if (this.basetype === 'web') {
      this._injectWebExtension(d);
    } else {
      this._injectServerExtension(d);
    }
  }

  _injectWebExtension(d) {
    const file = this.destinationPath('phovea.js');
    const old = this.fs.read(file);
    const text = `\n\n  registry.push('${d.type}', '${d.id}', function() { return System.import('./src/${d.module}'); }, ${d.stringify(d.extras, ' ')});\n  // generator-phovea:end`;
    const new_ = old.replace('  // generator-phovea:end', text);
    this.fs.write(file, new_);
  }

  _injectServerExtension(d) {
    const file = this.destinationPath(`${this.config.get('name')}/__init__.py`);
    const old = this.fs.read(file);
    const text = `\n\n  registry.append('${d.type}', '${d.id}', '${this.config.get('name')}.${d.module}', ${d.stringifyPython(d.extras, '  ')})\n  # generator-phovea:end`;
    const new_ = old.replace('  # generator-phovea:end', text);
    this.fs.write(file, new_);
  }
}

module.exports = Generator;
