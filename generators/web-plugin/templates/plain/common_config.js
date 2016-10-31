/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

const path = require('path');
const pkg = require('./package.json');
const year = (new Date()).getFullYear();
const banner = '/*! ' + (pkg.title || pkg.name) + ' - v' + pkg.version + ' - ' + year + '\n' +
  (pkg.homepage ? '* ' + pkg.homepage + '\n' : '') +
  '* Copyright (c) ' + year + ' ' + pkg.author.name + ';' +
  ' Licensed ' + pkg.license + '*/\n';


const webpack = require('webpack');

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
function simpleCopy(obj) {
  var r = {};
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
  return function (context, request, callback) {
    for (var i = 0; i < modules.length; ++i) {
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
 * @returns {*}
 */
function injectRegistry(entry) {
  //build also the registry
  if (typeof entry === 'string') {
    return ['./phovea_registry.js'].concat(entry);
  } else {
    var transformed = {};
    Object.keys(entry).forEach(function (eentry) {
      transformed[eentry] = ['./phovea_registry.js'].concat(entry[eentry]);
    });
    return transformed;
  }

}
/**
 * generate a webpack configuration
 */
function generateWebpack(options) {
  const ExtractTextPlugin = require('extract-text-webpack-plugin');

  var base = {
    entry: injectRegistry(options.entries || './index.js'),
    output: {
      path: path.resolve('./build'),
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
        path.resolve('../')
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
      contentBase: path.resolve('./build')
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

module.exports.webpack = {};
module.exports.webpack.lib = function (libraries, modules, ignores) {
  const library = generateWebpack({
    libs: libraries,
    modules: modules,
    ignore: ignores,
    library: true,
    bundle: false,
    min: false
  });
  const library_min = generateWebpack({
    libs: libraries,
    modules: modules,
    ignore: ignores,
    library: true,
    bundle: false,
    min: true
  });

  return function(env) {
    return env === 'prod' ? [library, library_min] : library;
  };
};

module.exports.webpack.bundle = function (libraries, modules) {
  const library = generateWebpack({
    libs: libraries,
    library: true,
    bundle: false,
    moduleBundle: true,
    min: false
  });
  const library_min = generateWebpack({
    libs: libraries,
    library: true,
    bundle: false,
    moduleBundle: true,
    min: true
  });

  const bundle = generateWebpack({
    libs: libraries,
    library: true,
    bundle: true,
    moduleBundle: true,
    min: false
  });
  const bundle_min = generateWebpack({
    libs: libraries,
    library: true,
    bundle: true,
    moduleBundle: true,
    min: true
  });

  return function(env) {
    return env === 'prod' ? [library, library_min, bundle, bundle_min] : library;
  };
};
module.exports.webpack.app = function (entries, libraries) {
  const bundle = generateWebpack({
    entries: entries,
    libs: libraries,
    bundle: true,
    min: false,
    commons: true,
    name: '[name]'
  });
  const bundle_min = generateWebpack({
    entries: entries,
    libs: libraries,
    bundle: true,
    min: true,
    commons: true,
    name: '[name]'
  });

  return function(env) {
    return env === 'prod' ? [bundle, bundle_min] : bundle;
  };
};

/**
 * generate a karma webpack configuration
 * @param options
 **/
function generateKarma(options) {
  var base = {
    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],

    // list of files / patterns to load in the browser
    files: [
      'tests.webpack.js' //just load this file
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      // add webpack as preprocessor
      'tests.webpack.js': ['webpack', 'sourcemap']
    },

    webpack: {
      // webpack configuration
      devtool: 'inline-source-map',

      resolve: {
        //fallback to the directory above if they are siblings
        modules: [
          'node_modules',
          path.resolve('../')
        ],
        // Add `.ts` and `.tsx` as a resolvable extension.
        extensions: ['.webpack.js', '.web.js', '.ts', '.tsx', '.js'],
        alias: options.libs || {}
      },
      module: {
        loaders: webpackloaders.slice()
      }
    },

	failOnEmptyTestSuite: false,

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,


    browsers: [process.env.CONTINUOUS_INTEGRATION ? 'Firefox' : 'Chrome'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true
  };

  return base;
}

module.exports.karma = {};
module.exports.karma.lib = function (libraries) {
  return function (config) {
    config.set(generateKarma({
      libs: libraries
    }));
  };
};
