const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
//for debugging issues
//const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
//helper module
const webpackHelper = require('./webpackHelper');
//general constants
const path = require('path');
const webpack = require('webpack');
const resolve = require('path').resolve;
const workspacePath = resolve(__dirname, '../');
const now = new Date();
const year = (new Date()).getFullYear();
const prefix = (n) => n < 10 ? ('0' + n) : n.toString();
const buildId = `${now.getUTCFullYear()}${prefix(now.getUTCMonth() + 1)}${prefix(now.getUTCDate())}-${prefix(now.getUTCHours())}${prefix(now.getUTCMinutes())}${prefix(now.getUTCSeconds())}`;
const envMode = process.argv.indexOf('--mode') >= 0 ? process.argv[process.argv.indexOf('--mode') + 1].trim().toLowerCase() : 'production';
const isDev = envMode === 'development';
//workspace constants
const workspaceYoRcFile = require(path.join(workspacePath, '.yo-rc-workspace.json'));
const workspacePkg = require(path.join(workspacePath, 'package.json'));
const workspaceBuildInfoFile = path.join(workspacePath, 'package-lock.json');
const workspaceMetaDataFile = path.join(workspacePath, 'metaData.json');
const workspaceRegistryFile = path.join(workspacePath, 'phovea_registry.js');
const workspaceAliases = workspaceYoRcFile.workspaceAliases || [];
const workspaceRegistry = workspaceYoRcFile.registry || [];
const workspaceName = workspacePath.substr(workspacePath.lastIndexOf('/') + 1);
const workspaceRepos = workspaceYoRcFile.frontendRepos || [];
const workspaceMaxChunkSize = workspaceYoRcFile.maxChunkSize || 5000000;
//app constants
const envApp = process.argv.filter((e) => e.startsWith('--app='));
const defaultApp = envApp.length > 0 ? envApp[0].substring(6).trim() : workspaceYoRcFile.defaultApp;
const defaultAppPath = path.join(workspacePath, defaultApp);
const appPkg = require(path.join(defaultAppPath, 'package.json'));
appPkg.version = appPkg.version.replace('SNAPSHOT', buildId);
const libName = appPkg.name;
const libDesc = appPkg.description;
const {entries, registry, libraryAliases, filesToLoad, copyFiles} = require(path.join(defaultAppPath, '.yo-rc.json'))['generator-phovea'];
const fileLoaderRegex = filesToLoad && filesToLoad['file-loader'] ? RegExp(String.raw`(.*)\/(${filesToLoad['file-loader']})\.(html|txt)$`) : RegExp(/^$/);
const copyAppFiles = copyFiles ? copyFiles.map((file) => ({from: path.join(defaultAppPath, file), to: path.join(workspacePath, 'bundles', path.basename(file)) })) : [];
//banner info
const banner = '/*! ' + (appPkg.title || appPkg.name) + ' - v' + appPkg.version + ' - ' + year + '\n' +
    (appPkg.homepage ? '* ' + appPkg.homepage + '\n' : '') +
    '* Copyright (c) ' + year + ' ' + appPkg.author.name + ';' +
    ' Licensed ' + appPkg.license + '*/\n';
// Merge app and workspace properties
const mergedAliases = {
    ...libraryAliases,
    ...workspaceAliases
};
const mergedRegistry = {
    ...registry,
    ...workspaceRegistry
};
// Regex for cacheGroups
const workspaceRegex = new RegExp(String.raw`[\\/]${workspaceName}[\\/](${workspaceRepos.join('|')})[\\/]`);

// include/exclude feature of the registry
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

// webpack config
const config = {
    mode: envMode,
    output: {
        filename: '[name].[fullhash:8].js',
        sourceMapFilename: '[name].[fullhash:8].map',
        chunkFilename: '[id].[fullhash:8].js',
        assetModuleFilename: 'assets/[hash][ext][query]',
        path: path.join(workspacePath, 'bundles'),
        pathinfo: false,
        publicPath: '',
        library: libName,
        libraryTarget: 'umd',
        umdNamedDefine: true
    },
    entry: webpackHelper.injectRegistry(workspacePath, defaultAppPath, [workspaceRegistryFile], entries),
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        alias: Object.assign({},
                // Because '<repo>' now points to src, we need to "unrewrite" other imports like phovea_registry or dist.
                // TODO: Ideally, no workspace repos import from other workspace repos from dist directly. 
                // TODO: phovea_registry.js should be part of /src?
                ...workspaceRepos.map((repo) => ({[`${repo}/phovea_registry.js$`]: path.join(workspacePath, repo, 'phovea_registry.js')})),
                ...workspaceRepos.map((repo) => ({[`${repo}/dist`]: path.join(workspacePath, repo, 'dist')})),
                // Rewrite all '<repo>' imports to '<repo>/src'.
                ...workspaceRepos.map((repo) => ({[repo]: path.join(workspacePath, repo, 'src')})),
                // Other aliases point to the node_modules
                ...Object.entries(mergedAliases).map((item) => ({[item[0]]: path.join(workspacePath, 'node_modules', item[1])}))
            ),
        modules: [
            path.join(workspacePath, 'node_modules')
        ],
        fallback: {
            util: require.resolve("util/")
        }
    },
    module: {
        rules: [
            {
                test: /\.(j|t)sx?$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        cacheDirectory: true,
                        babelrc: false,
                        presets: [
                            [
                                "@babel/preset-env",
                                // TODO: Define target of build
                                { targets: { browsers: "last 2 versions" } }
                            ],
                            "@babel/preset-typescript",
                            "@babel/preset-react"
                        ],
                        plugins: [
                            // https://exerror.com/babel-referenceerror-regeneratorruntime-is-not-defined/#Solution_3_For_Babel_7_User
                            "@babel/transform-runtime",
                            // plugin-proposal-decorators is only needed if you're using experimental decorators in TypeScript
                            ["@babel/plugin-proposal-decorators", { legacy: true }],
                            ["@babel/plugin-proposal-class-properties", { loose: false }],
                            "react-refresh/babel"
                        ]
                    }
                }
            },
            {
                test: [
                    /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                    /\.(ttf|eot)(\?v=[0-9]\.[0-9]\.[0-9])?$/
                ],
                type: 'asset'
            },
            {
                test: /\.svg(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                // css-loader is messing up SVGs: https://github.com/webpack/webpack/issues/13835
                // Pin css-loader and always load them as file-resource.
                type: 'asset/resource'
            },
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
                test: /\.(xml)$/,
                use: 'xml-loader'
            },
            {
                test: /\.(txt)$/, 
                type: 'asset/source'
            },
            {
                test: /\.(html)$/, 
                use: 'html-loader'
            },
            {
                test: /\.(png|jpg|gif|webp)$/,
                type: 'asset/inline'
            },
            {
                test: /(.*)\/phovea(_registry)?\.(js|ts)$/,
                use: {
                    loader: 'ifdef-loader',
                    options: Object.assign({include: includeFeature}, preCompilerFlags),
                }
            },
            {
                test: require.resolve('jquery'),
                loader: 'expose-loader',
                options: {
                    exposes: ['window.jQuery', '$']
                }
            },
            // used to remove inline loaders
            {
                test: fileLoaderRegex,
                loader: 'file-loader', options: {
                    name: '[name].[ext]'
                }
            }
            // TODO: Avoid legacy loaders and use asset modules instead: https://webpack.js.org/guides/asset-modules/#replacing-inline-loader-syntax
        ],
    },
    optimization: {
        nodeEnv: false, // will be set by DefinePlugin
        minimize: true, // only in prod mode
        minimizer: [
            new CssMinimizerPlugin()
          ],
        moduleIds: 'deterministic', // only in prod mode
        chunkIds: 'deterministic', // only in prod mode
        removeAvailableModules: true, // only in prod mode
        removeEmptyChunks: true, // should always be set to true
        mergeDuplicateChunks: true, // should always be set to true
        providedExports: true, // should always be set to true
        usedExports: true, // should always be set to true
        sideEffects: true, // should always be set to true as long as we don't change our code
        portableRecords: false, // should always be set to false
        flagIncludedChunks: true, // only in prod mode
        concatenateModules: true, // only in prod mode
        runtimeChunk: 'single', //one runtime instance for all entries
        splitChunks: {
            chunks: 'all',
            minSize: 10000,
            maxSize: workspaceMaxChunkSize,
            cacheGroups: {
                workspace: {
                    test: workspaceRegex,
                    priority: -5,
                    name: 'vendor',
                    enforce: true,
                },
                vendors: {
                    test: /[\\/]node_modules[\\/]/,
                    priority: -10,
                    name: 'vendor',
                    enforce: true,
                }
            }
        },
    },
    plugins: [
        // For each workspace repo, create an instance of the TS checker to compile typescript.
        ...workspaceRepos.map((repo) => new ForkTsCheckerWebpackPlugin({
            typescript: {
                diagnosticOptions: {
                    semantic: true,
                    syntactic: true,
                },
                // Actually build the repo and don't just type-check
                build: true,
                // Recommended for use with babel-loader
                mode: "write-references",
                // Use the corresponding config file of the repo folder
                configFile: path.join(workspacePath, repo, 'tsconfig.json')
            },
        })),
        new CleanWebpackPlugin({
            cleanOnceBeforeBuildPatterns: [
                '**/*',
                path.join(workspacePath, 'bundles/**/*')
            ]
        }),
        ...Object.values(entries).map((entry) => new HtmlWebpackPlugin({
            inject: true,
            template: path.join(defaultAppPath, entry['template']),
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
        })),
        new MiniCssExtractPlugin(),
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(envMode),
            'process.env.__VERSION__': JSON.stringify(appPkg.version),
            'process.env.__LICENSE__': JSON.stringify(appPkg.license),
            'process.env.__BUILD_ID__': JSON.stringify(buildId),
            'process.env.__APP_CONTEXT__': JSON.stringify('/'),
            'process.env.__DEBUG__': JSON.stringify(isDev)
        }),
        new Dotenv({
            path: path.join(workspacePath, '.env'), // load this now instead of the ones in '.env'
            safe: false, // load '.env.example' to verify the '.env' variables are all set. Can also be a string to a different file.
            allowEmptyValues: true, // allow empty variables (e.g. `FOO=`) (treat it as empty string, rather than missing)
            systemvars: true, // load all the predefined 'process.env' variables which will trump anything local per dotenv specs.
            silent: true, // hide any errors
            defaults: false // load '.env.defaults' as the default values if empty.
        }),
        new CopyWebpackPlugin({
            patterns: copyAppFiles.concat([
                {
                    from: workspaceMetaDataFile, to: path.join(workspacePath, 'bundles', 'phoveaMetaData.json'),
                    //generate meta data file
                    transform() {
                        const customProperties = {
                          buildId,
                          version: workspacePkg.version // override app version with workspace version in product build
                        };
                        return webpackHelper.generateMetaDataFile(defaultAppPath, customProperties);
                    }
                },
                //use package-lock json as buildInfo
                {from: workspaceBuildInfoFile, to: path.join(workspacePath, 'bundles', 'buildInfo.json')}
            ]
        )}),
        // For debugging issues
        /*new BundleAnalyzerPlugin({
            // set to 'server' to start analyzer during build
            analyzerMode: 'disabled',
            generateStatsFile: true,
            statsOptions: {source: false}
        })*/
        new webpack.BannerPlugin({
            banner: banner,
            raw: true
        })
    ]
};

// For debugging the loader performance, wrap the config before exporting:
// TODO: Currently broken because of mini-css-extract-plugin: https://github.com/stephencookdev/speed-measure-webpack-plugin/issues/167
// const SpeedMeasurePlugin = require("speed-measure-webpack-plugin");
// const smp = new SpeedMeasurePlugin();
// module.exports = smp.wrap(config);

module.exports = config;
