/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

import {libraries, modules, entries, ignores, type} from './phovea.js';
import {resolve} from 'path';
import * as pkg from './package.json';
import * as webpack from 'webpack';
import * as ExtractTextPlugin from 'extract-text-webpack-plugin';

const year = (new Date()).getFullYear();
const banner = '/*! ' + (pkg.title || pkg.name) + ' - v' + pkg.version + ' - ' + year + '\n' +
  (pkg.homepage ? '* ' + pkg.homepage + '\n' : '') +
  '* Copyright (c) ' + year + ' ' + pkg.author.name + ';' +
  ' Licensed ' + pkg.license + '*/\n';


//list of loaders and their mappings
const webpackloaders = [
  {test: /\.scss$/, loader: 'style!css!sass'},
  {test: /\.tsx?$/, loader: 'awesome-typescript-loader'},
  {test: /\.json$/, loader: 'json-loader'},
  {test: /\.png$/, loader: 'url-loader?mimetype=image/png'},
  {test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'url-loader?limit=10000&mimetype=application/font-woff'},
  {test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'file-loader'}
];

/**
 * creates a shallow copy of an object
 *
 **/
function simpleCopy(obj, r) {
  r = r || {};
  Object.keys(obj).forEach(function (d) {
    r[d] = obj[d];
  });
  return r;
}
/**
 * tests whether the given phovea module name is matching the requested file and if so convert it to an external lookup
 * depending on the loading type
 **/
function testPhoveaModule(moduleName, request) {
  if (!(new RegExp('^' + moduleName + '/src.*')).test(request)) {
    return false;
  }
  const subModule = request.match(/.*\/src\/?(.*)/)[1];
  //skip empty modules = root
  const path = subModule === '' ? [moduleName] : [moduleName, subModule];
  //phovea_<name> ... phovea.name
  const rootPath = /phovea_.*/.test(moduleName) ? ['phovea', moduleName.slice(7)].concat(path.slice(1)) : path;
  return {
    root: rootPath,
    commonjs2: path,
    commonjs: path,
    amd: request + (subModule === '' ? '/main' : '')
  };
}

function testPhoveaModules(modules) {
  return (context, request, callback) => {
    for (let i = 0; i < modules.length; ++i) {
      var r = testPhoveaModule(modules[i], request);
      if (r) {
        return callback(null, r);
      }
    }
    callback();
  };
}

/**
 * inject the registry to be included
 * @param entry
 * @param basedir
 * @returns {*}
 */
function injectRegistry(entry, basedir) {
  //build also the registry
  if (typeof entry === 'string') {
    return [basedir + '/phovea_registry.js'].concat(entry);
  } else {
    var transformed = {};
    Object.keys(entry).forEach((eentry) => {
      transformed[eentry] = [basedir + '/phovea_registry.js'].concat(entry[eentry]);
    });
    return transformed;
  }

}
/**
 * generate a webpack configuration
 */
export function generateWebpack(options) {
  var base = {
    entry: injectRegistry(options.entries, options.basedir),
    output: {
      path: resolve(options.basedir + '/build'),
      filename: (options.name || (pkg.name + (options.bundle ? '_bundle' : ''))) + (options.min ? '.min' : '') + '.js',
      publicPath: '/'
    },
    resolve: {
      // Add `.ts` and `.tsx` as a resolvable extension.
      extensions: ['.webpack.js', '.web.js', '.ts', '.tsx', '.js'],
      alias: simpleCopy(options.libs || {}),
      //fallback to the directory above if they are siblings
      modules: [
        'node_modules',
        resolve(options.basedir + '/../')
      ]
    },
    plugins: [
      new webpack.BannerPlugin({
        banner: banner,
        raw: true
      }),
      //define magic constants that are replaced
      new webpack.DefinePlugin({
        __VERSION__: JSON.stringify(pkg.version),
        __LICENSE__: JSON.stringify(pkg.license)
      })
      //rest depends on type
    ],
    externals: [],
    module: {
      loaders: webpackloaders.slice()
    },
    devServer: {
      proxy: {
        '/api/*': {
          target: 'http://localhost:9000',
          secure: false
        }
      },
      contentBase: resolve(options.basedir + '/build')
    }
  };
  if (options.library) {
    //generate a library, i.e. output the last entry element
    //create library name
    var libName = /phovea_.*/.test(pkg.name) ? ['phovea', pkg.name.slice(7)] : pkg.name;
    if (options.moduleBundle) {
      libName = 'phovea';
    }
    base.output.library = libName;
    base.output.libraryTarget = 'umd';
    base.output.umdNamedDefine = false; //anonymous require module
  }


  if (!options.bundle) {
    //if we don't bundle don't include external libraries and other phovea modules
    base.externals.push.apply(base.externals, Object.keys(options.libs || {}));

    //ignore all phovea modules
    if (options.modules) {
      base.externals.push(testPhoveaModules(options.modules));
    }

    //ignore extra modules
    (options.ignore || []).forEach(function (d) {
      base.module.loaders.push({test: d, loader: 'null'}); //use null loader
    });
    //ingore phovea module registry calls
    (options.modules || []).forEach(function (m) {
      base.module.loaders.push({test: new RegExp('.*[\\\\/]' + m + '[\\\\/]phovea.js'), loader: 'null'}); //use null loader
    });

    //extract the included css file to own file
    var p = new ExtractTextPlugin('style' + (options.min ? '.min' : '') + '.css');
    base.plugins.push(p);
    base.module.loaders[0] = {
      test: /\.scss$/,
      loader: p.extract(['css', 'sass'])
    };
  }
  if (options.commons) {
    //build a commons plugin
    base.plugins.push(new webpack.optimize.CommonsChunkPlugin({
      // The order of this array matters
      names: ['common'],
      minChunks: 2
    }));
  }
  if (options.min) {
    //use a minifier
    base.plugins.push(
      new webpack.LoaderOptionsPlugin({
        minimize: true,
        debug: false
      }),
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false
        },
        output: {
          comments: false
        },
        sourceMap: false
      }));
  } else {
    //generate source maps
    base.devtool = 'source-map';
  }
  return base;
}

export default function generateWebpackConfig(env) {
  const isTest = env === 'test';
  const isProduction = env === 'prod';
  const isDev = !isProduction && !isTest;

  const base = {
    entries: entries,
    libs: libraries,
    modules: modules,
    ignore: ignores,
    basedir: '.'
  };

  if (isTest) {
    return generateWebpack(simpleCopy(base, {
      bundle: true
    }));
  }

  if (type === 'app') {
    base.bundle = true; //bundle everything together
    base.name = '[name]'; //multiple entries case
    base.commons = true; //extract commons module
  } else if (type === 'bundle') {
    base.library = true; //expose as library
    base.moduleBundle = true; //expose as library 'phovea'
    base.bundle = true;
  } else { //type === 'lib'
    base.library = true;
  }

  //single generation
  if (isDev) {
    return generateWebpack(base);
  } else { //isProduction
    return [
      //plain
      generateWebpack(base),
      //minified
      generateWebpack(simpleCopy(base, {
        min: true
      }))
    ];
  }
}