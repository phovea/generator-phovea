const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
//for debugging issues
//const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
//helper module
const webpackHelper = require('./webpackHelper');
//general constants
const path = require('path');
const webpack = require('webpack');
const resolve = require('path').resolve;
const base = resolve(__dirname, '../');
const now = new Date();
const prefix = (n) => n < 10 ? ('0' + n) : n.toString();
const buildId = `${now.getUTCFullYear()}${prefix(now.getUTCMonth() + 1)}${prefix(now.getUTCDate())}-${prefix(now.getUTCHours())}${prefix(now.getUTCMinutes())}${prefix(now.getUTCSeconds())}`;
const envMode = process.argv.indexOf('--mode') >= 0 ? process.argv[process.argv.indexOf('--mode') + 1].trim().toLowerCase() : 'development';
const isDev = envMode === 'development';
//workspace constants
const workspaceYoRcFile = require('../.yo-rc-workspace.json');
const workspaceBuildInfoFile = base + '/package-lock.json';
const workspaceMetaDataFile = base + '/metaData.json';
const workspaceRegistryFile = base + '/phovea_registry.js';
const workspaceAliases = workspaceYoRcFile.workspaceAliases || [];
const workspaceRegistry = workspaceYoRcFile.registry || [];
const workspaceVendors = workspaceYoRcFile.vendors || [];
const workspaceName = base.substr(base.lastIndexOf('/') + 1);
const workspaceProxy = workspaceYoRcFile.devServerProxy || {};
const workspaceRepos = workspaceYoRcFile.frontendRepos || [];
//app constants
const envApp = process.argv.filter((e) => e.startsWith('--app='));
const defaultApp = envApp.length > 0 ? envApp[0].substring(6).trim() : workspaceYoRcFile.defaultApp;
const appPkg = require('./../' + defaultApp + '/package.json');
const libName = appPkg.name;
const libDesc = appPkg.description;
const {entries, registry, vendors, libraryAliases, filesToLoad} = require('./../' + defaultApp + '/.yo-rc.json')['generator-phovea'];
const fileLoaderRegex = filesToLoad && filesToLoad['file-loader'] ? RegExp(String.raw`(.*)\/(${filesToLoad['file-loader']})\.(html|txt)$`) : RegExp(/^$/);
// Merge app and workspace properties
const mergedAliases = {
    ...libraryAliases,
    ...workspaceAliases
};
const mergedRegistry = {
    ...registry,
    ...workspaceRegistry
};
const mergedVendors = {
    ...vendors,
    ...workspaceVendors
};
// Regex for cacheGroups
const workspaceRegex = new RegExp(String.raw`[\\/]${workspaceName}[\\/](${workspaceRepos.join('|')})[\\/]`);
const vendorRegex = Object.assign({},
    ...Object.entries(mergedVendors).
        map((item) => ({[item[0]]: new RegExp(`[\\/]node_modules[\\/](${item[1]})`)})
        )
);
const vendorWorkspaceRegex = Object.assign({},
    ...Object.entries(mergedVendors).
        map((item) => ({[item[0]]: new RegExp(`[\\/]${workspaceName}[\\/](${item[1]})`)})
        )
);
// html webpack entries
let HtmlWebpackPlugins = [];
Object.values(entries).map(function (entry) {
    HtmlWebpackPlugins.push(new HtmlWebpackPlugin({
        inject: true,
        template: `./${defaultApp}/` + entry['template'],
        filename: entry['html'],
        title: libName,
        excludeChunks: entry['excludeChunks'],
        chunksSortMode: 'auto',
        minify: {
            removeComments: true,
            collapseWhitespace: true
        },
        meta: {
            description: libDesc
        }
    }));
});
//include/exclude feature of the registry
const preCompilerFlags = {flags: (mergedRegistry || {}).flags || {}};
const includeFeature = mergedRegistry ? (extension, id) => {
    const exclude = mergedRegistry.exclude || [];
    const include = mergedRegistry.include || [];
    if (!exclude && !include) {
        return true;
    }
    const test = (f) => Array.isArray(f) ? extension.match(f[0]) && (id || '').match(f[1]) : extension.match(f);
    return include.every(test) && !exclude.some(test);
} : () => true;
//webpack config
const config = {
    mode: envMode,
    devtool: 'inline-source-map',
    output: {
        path: path.join(__dirname, './../bundles'),
        filename: '[name].[contenthash].js',
        publicPath: '',
        library: libName,
        libraryTarget: 'umd',
        umdNamedDefine: false
    },
    entry: webpackHelper.injectRegistry(defaultApp, [workspaceRegistryFile], entries),
    resolve: {
        cacheWithContext: false, //for performance: we don't use context specific plugins
        symlinks: false, //don't need symlinks because of alias for workspace
        extensions: ['.js'],
        alias:
            Object.assign({},
                ...workspaceRepos.map((item) => ({[item]: (base + `/${item}`)})),
                ...Object.entries(mergedAliases).map((item) => ({[item[0]]: (base + `/node_modules/${item[1]}`)}))
            ),
        modules: [
            path.join(__dirname, '../node_modules')
        ],
    },
    devServer: {
        contentBase: resolve(__dirname, './../bundles/'),
        compress: true,
        host: 'localhost',
        open: false,
        proxy: Object.assign({
            '/api/*': {
                target: 'http://localhost:9000',
                secure: false,
                ws: true
            },
            '/login': {
                target: 'http://localhost:9000',
                secure: false
            },
            '/logout': {
                target: 'http://localhost:9000',
                secure: false
            },
            '/loggedinas': {
                target: 'http://localhost:9000',
                secure: false
            }
        }, workspaceProxy),
        watchOptions: {
            poll: true,
            aggregateTimeout: 30000,
            ignored: /node_modules/
        }
    },
    module: {
        rules: [
            {
              test: /\.(css)$/,
              use: [
                  MiniCssExtractPlugin.loader, 'css-loader'
              ]
            },
            {
                test: /\.(scss)$/,
                use: [
                    MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'
                ]
            },
            {
                test: /\.js$/,
                enforce: 'pre',
                use: ['source-map-loader'],
                exclude: /[\\/]node_modules[\\/](lineupjs|lineupengine)[\\/]/
            },
            {test: /\.(xml)$/, use: 'xml-loader'},
            {test: /\.(txt)$/, use: 'raw-loader'},
            {test: /\.(html)$/, use: 'html-loader'},
            {
                test: /\.(png|jpg|gif|webp)$/,
                use: [
                    {
                        loader: `url-loader`,
                        options: {
                            esModule: false
                        }
                    }]
            },
            {
                test: /(.*)\/phovea(_registry)?\.(js|ts)$/, use: [{
                    loader: 'ifdef-loader',
                    options: Object.assign({include: includeFeature}, preCompilerFlags),

                }]
            },
            {
                test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: 'url-loader',
                options: {
                    limit: 10000, // inline <= 10kb
                    mimetype: 'application/font-woff'
                }
            },
            {
                test: /\.svg(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: 'url-loader',
                options: {
                    limit: 10000, // inline <= 10kb
                    mimetype: 'image/svg+xml',
                    esModule: false
                }
            },
            {test: /\.(ttf|eot)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'file-loader'},
            {
                test: require.resolve('jquery'),
                loader: 'expose-loader',
                options: {
                    exposes: ['window.jQuery', '$']
                }
            },
            // used to remove inline loaders
            {test: fileLoaderRegex, loader: 'file-loader?name=[name].[ext]'}
        ],
    },
    optimization: {
        nodeEnv: false, // will be set by DefinePlugin
        minimize: false, // only in dev mode
        namedModules: true, // only in dev mode
        namedChunks: true, // only in dev mode
        removeAvailableModules: false, // only in dev mode, because of performance issue
        removeEmptyChunks: true, // should always be set to true
        mergeDuplicateChunks: true, // should always be set to true
        providedExports: true, // should always be set to true
        usedExports: true, // should always be set to true
        sideEffects: true, // should always be set to true as long as we don't change our code
        portableRecords: false, // should always be set to false
        flagIncludedChunks: false, // only in dev mode
        occurrenceOrder: false, // only in dev mode
        concatenateModules: false, // only in dev mode
        moduleIds: 'hashed',
        chunkIds: 'named', // only in dev mode
        runtimeChunk: 'single', //one runtime instance for all entries
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                workspace: {
                    test: workspaceRegex,
                    priority: -5,
                    name(module) {
                        const key = Object.keys(mergedVendors).find((key) => vendorWorkspaceRegex[key].test(module.context));
                        return key ? key : 'workspace';
                    }
                },
                vendors: {
                    test: /[\\/]node_modules[\\/]/,
                    priority: -10,
                    name(module) {
                        const key = Object.keys(mergedVendors).find((key) => vendorRegex[key].test(module.context));
                        return key ? key : 'vendors';
                    }
                }
            }
        },
    },
    plugins: [
        new CleanWebpackPlugin({
            cleanOnceBeforeBuildPatterns: [
                '**/*',
                path.join(process.cwd(), '../bundles/**/*')
            ]
        }),
        ...HtmlWebpackPlugins,
        new MiniCssExtractPlugin(),
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(envMode),
            'process.env.__VERSION__': JSON.stringify(appPkg.version),
            'process.env.__LICENSE__': JSON.stringify(appPkg.license),
            'process.env.__BUILD_ID__': JSON.stringify(buildId),
            'process.env.__APP_CONTEXT__': JSON.stringify('/'),
            'process.env.__DEBUG__': JSON.stringify(isDev)
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: workspaceMetaDataFile, to: base + '/bundles/phoveaMetaData.json',
                    //generate meta data file
                    transform() {
                        return webpackHelper.generateMetaDataFile(resolve(__dirname, '../' + defaultApp), {buildId});
                    }
                },
                //use package-lock json as buildInfo
                {from: workspaceBuildInfoFile, to: base + '/bundles/buildInfo.json'}
            ]
        }),
        //for debugging issues
        /*new BundleAnalyzerPlugin({
            // set to 'server' to start analyzer during build
            analyzerMode: 'disabled',
            generateStatsFile: true,
            statsOptions: {source: false}
        })*/
    ],
    stats: {
        //for source-map-loader: lineup/js warnings
        warningsFilter: [/Failed to parse source map/],
    }
};
//console.log(JSON.stringify(config, null, '\t'));
module.exports = config;
