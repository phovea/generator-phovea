'use strict';
const Base = require('yeoman-generator').Base;

const known = require('../../utils/known');
const plugins = known.plugin;
const stringifyAble = require('../../utils').stringifyAble;

function toJSONFromText(text) {
  const r = {};
  text.split('\n').forEach((line) => {
    var [key, value] = line.split('=');
    value = value.trim();
    if (!isNaN(parseFloat(value))) {
      value = parseFloat(value);
    }
    var obj = r;
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

  prompting() {
    const type = this.config.get('type');
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

    if (!this.fs.exists(this.destinationPath(`src/${d.module}.ts`))) {
      this.fs.copy(this.templatePath('template.tmpl.ts'), this.destinationPath(`src/${d.module}.ts`));
    }
  }

  _injectServerExtension(d) {
    const name = this.config.get('name');
    const file = this.destinationPath(`${name}/__init__.py`);
    const old = this.fs.read(file);
    const text = `\n\n  registry.append('${d.type}', '${d.id}', '${name}.${d.module}', ${d.stringifyPython(d.extras, '  ')})\n  # generator-phovea:end`;
    const new_ = old.replace('  # generator-phovea:end', text);
    this.fs.write(file, new_);

    if (!this.fs.exists(this.destinationPath(`${name}/${d.module}.py`))) {
      this.fs.copy(this.templatePath(`${d.type === 'namespace' ? 'namespace' : 'template'}.tmpl.py`), this.destinationPath(`${name}/${d.module}.py`));
    }
  }
}

module.exports = Generator;
