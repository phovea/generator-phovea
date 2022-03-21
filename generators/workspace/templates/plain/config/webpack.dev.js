module.exports = (env, options) => {
    const {CleanWebpackPlugin} = require('clean-webpack-plugin');
    // Webpack plugins
    const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
    const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
    const HtmlWebpackPlugin = require('html-webpack-plugin');
    const CopyWebpackPlugin = require('copy-webpack-plugin');
    const Dotenv = require('dotenv-webpack');
    const MiniCssExtractPlugin = require('mini-css-extract-plugin');
    const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
    // for debugging issues
    const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
    
    // helper module
    const webpackHelper = require('./webpackHelper');
    // general constants
    const path = require('path');
    const webpack = require('webpack');
    const resolve = require('path').resolve;
    
    const workspacePath = resolve(__dirname, '../');
    const buildId = webpackHelper.getBuildId();
    
    // Extract mode from options
    const { mode } = options;
    const isDev = mode === 'development';
    const isProd = !isDev;
    
    console.log(`Running webpack in ${mode.toUpperCase()}-mode`);
    
    // workspace constants
    const workspaceYoRcFile = require(path.join(workspacePath, '.yo-rc-workspace.json'));
    const workspacePkg = require(path.join(workspacePath, 'package.json'));
    const workspaceBuildInfoFile = path.join(workspacePath, 'package-lock.json');
    const workspaceMetaDataFile = path.join(workspacePath, 'metaData.json');
    const workspaceRegistryFile = path.join(workspacePath, 'phovea_registry.js');
    const workspaceAliases = workspaceYoRcFile.workspaceAliases || [];
    const workspaceRegistry = workspaceYoRcFile.registry || [];
    const workspaceVendors = workspaceYoRcFile.vendors || []; // TODO: only in dev
    const workspaceName = workspacePath.substring(workspacePath.lastIndexOf('/') + 1);
    const workspaceProxy = workspaceYoRcFile.devServerProxy || {}; // TODO: only in dev
    const workspaceRepos = workspaceYoRcFile.frontendRepos || [];
    const workspaceMaxChunkSize = workspaceYoRcFile.maxChunkSize || 5000000; // TODO: only in prod
    
    // app constants
    const envApp = process.argv.filter((e) => e.startsWith('--app='));
    const defaultApp = envApp.length > 0 ? envApp[0].substring(6).trim() : workspaceYoRcFile.defaultApp;
    const defaultAppPath = path.join(workspacePath, defaultApp);
    const appPkg = require(path.join(defaultAppPath, 'package.json'));
    const libName = appPkg.name;
    const libDesc = appPkg.description;
    const {entries, registry, vendors, libraryAliases, filesToLoad, copyFiles} = require(path.join(defaultAppPath, '.yo-rc.json'))['generator-phovea'];
    const fileLoaderRegex = filesToLoad && filesToLoad['file-loader'] ? RegExp(String.raw`(.*)\/(${filesToLoad['file-loader']})\.(html|txt)$`) : RegExp(/^$/);
    const copyAppFiles = copyFiles ? copyFiles.map((file) => ({from: path.join(defaultAppPath, file), to: path.join(workspacePath, 'bundles', path.basename(file)) })) : [];
    // TODO: banner info only in prod
    const year = new Date().getFullYear();
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
    const mergedVendors = { // TODO: only in dev
        ...vendors,
        ...workspaceVendors
    };
    // Regex for cacheGroups
    const workspaceRegex = new RegExp(String.raw`[\\/]${workspaceName}[\\/](${workspaceRepos.join('|')})[\\/]`);
    const vendorRegex = Object.assign({}, // TODO: only in dev
        ...Object.entries(mergedVendors).
            map((item) => ({[item[0]]: new RegExp(`[\\/]node_modules[\\/](${item[1]})`)})
            )
    );
    const vendorWorkspaceRegex = Object.assign({}, // TODO: only in dev
        ...Object.entries(mergedVendors).
            map((item) => ({[item[0]]: new RegExp(`[\\/]${workspaceName}[\\/](${item[1]})`)})
            )
    );
    
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
        mode: mode,
        // TODO: Evaluate proper devtool mapping. This is the one recommended by webpack.
        devtool: 'eval-cheap-module-source-map', // TODO: only in dev, but should use source-map in prod: https://webpack.js.org/guides/production/#source-mapping
        output: {
            // The build folder.
            path: path.join(workspacePath, 'bundles'),
            // There will be one main bundle, and one file per asynchronous chunk.
            filename: '[name].[contenthash:8].js',
            // There are also additional JS chunk files if you use code splitting.
            chunkFilename: '[name].[contenthash:8].chunk.js',
            assetModuleFilename: 'assets/[name].[hash][ext]',
            // webpack uses `publicPath` to determine where the app is being served from.
            // It requires a trailing slash, or the file assets will get an incorrect path.
            // We inferred the "public path" (such as / or /my-project) from homepage.
            publicPath: '/',
            // Add /* filename */ comments to generated require()s in the output.
            pathinfo: isDev,
            // Clean the build folder
            clean: true,

            // TODO:
            library: libName, // TODO: Required?
            libraryTarget: 'umd', // TODO: Required?
            umdNamedDefine: false, // TODO: Required?
        },
        entry: webpackHelper.injectRegistry(workspacePath, defaultAppPath, [workspaceRegistryFile], entries),
        resolve: {
            cacheWithContext: false, // for performance: we don't use context specific plugins TODO: only in dev
            symlinks: false, // don't need symlinks because of alias for workspace TODO: only in dev
            extensions: ['.tsx', '.ts', '.js'],
            alias: Object.assign({},
                    // Because '<repo>' now points directly to src, we need to "unrewrite" other imports like phovea_registry.
                    // TODO: Ideally, no workspace repos import from other workspace repos from dist directly. 
                    ...workspaceRepos.map((repo) => ({
                        // TODO: phovea_registry.js should be part of /src?
                        [`${repo}/phovea_registry.js$`]: path.join(workspacePath, repo, 'phovea_registry.js'),
                        // Rewrite all '<repo>' imports to '<repo>/src'.
                        [`${repo}/dist`]: path.join(workspacePath, repo, 'src'),
                        [repo]: path.join(workspacePath, repo, 'src')
                    })),
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
        devServer: isDev ? { // TODO: only in dev
            // TODO: In dev, this is not required I guess?
            // static: resolve(workspacePath, 'bundles'),
            host: 'localhost',
            hot: true,
            client: {
                // Do not show the full-page error overlay
                overlay: false,
            },
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
            }, workspaceProxy)
        } : undefined,
        watchOptions: isDev ? {
            // poll: true,
            // aggregateTimeout: 500,
            // TODO: Should it ignore dist changes?
            ignored: /node_modules/
        } : undefined,
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
                                ...(isDev ? ["react-refresh/babel"] : [])
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
                  use: [ MiniCssExtractPlugin.loader, 'css-loader' ]
                },
                {
                    test: /\.(scss)$/,
                    use: [ MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader' ]
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
                    loader: 'file-loader',
                    options: {
                        name: '[name].[ext]'
                    }
                }
                // TODO: Avoid legacy loaders and use asset modules instead: https://webpack.js.org/guides/asset-modules/#replacing-inline-loader-syntax
            ],
        },
        optimization: {
            nodeEnv: false, // will be set by DefinePlugin
            minimize: isProd, // only in dev mode
            minimizer: isProd ? [
                new CssMinimizerPlugin()
            ] : [],
            moduleIds: 'deterministic',
            runtimeChunk: 'single', //one runtime instance for all entries
            // splitChunks: {
            //     chunks: 'all',
            //     minSize: isProd ? 10000 : undefined,
            //     maxSize: isProd ? workspaceMaxChunkSize : undefined,
            //     cacheGroups: {
            //         ...Object.assign({}, ...workspaceRepos.map((repo) => ({
            //             [repo]: {
            //                 test: new RegExp(String.raw`[\\/]${workspaceName}[\\/](${repo})[\\/]`),
            //                 priority: -5,
            //                 name: repo
            //             }
            //         }))),
            //         // workspace: {
            //         //     test: workspaceRegex,
            //         //     priority: -5,
            //         //     name: isProd ? 'vendor' : (module) => {
            //         //         const key = Object.keys(mergedVendors).find((key) => vendorWorkspaceRegex[key].test(module.context));
            //         //         return key ? key : 'workspace';
            //         //     },
            //         //     enforce: isProd ? true : undefined
            //         // },
            //         vendors: {
            //             test: /[\\/]node_modules[\\/]/,
            //             priority: -10,
            //             name: isProd ? 'vendor' : (module) => {
            //                 const key = Object.keys(mergedVendors).find((key) => vendorRegex[key].test(module.context));
            //                 return key ? key : 'vendors';
            //             },
            //             enforce: isProd ? true : undefined
            //         }
            //     }
            // },
        },
        plugins: [
            // For each workspace repo, create an instance of the TS checker to compile typescript.
            ...workspaceRepos.map((repo) => new ForkTsCheckerWebpackPlugin({
                typescript: {
                    // Actually build and emit the /dist and don't just type-check
                    build: true,
                    // Recommended for use with babel-loader
                    mode: "write-references",
                    // Use the corresponding config file of the repo folder
                    configFile: path.join(workspacePath, repo, 'tsconfig.json'),
                    // TODO: Add eslint
                    configOverwrite: {
                        compilerOptions: {
                            // Similarly to the webpack-alias definition, we need to define the same alias for typescript
                            baseUrl: ".",
                            paths: Object.assign({},
                                ...workspaceRepos.map((repo) => ({
                                    [`${repo}/phovea_registry.js`]: [path.join(workspacePath, repo, 'phovea_registry.js')],
                                    [`${repo}/*`]: [path.join(workspacePath, repo, 'src/*')],
                                    [repo]: [path.join(workspacePath, repo, 'src/index.ts')]
                                }))
                            )
                        }
                    }
                },
            })),
            new MiniCssExtractPlugin(), // TODO: Was below HtmlWebpackPlugin in dev
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
            new webpack.DefinePlugin({
                'process.env.NODE_ENV': JSON.stringify(mode),
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
                            const customProperties = webpackHelper.generateMetaDataFile(defaultAppPath, {
                                buildId,
                                version: isProd ? workspacePkg.version : undefined // override app version with workspace version in product build
                            });
                            return isProd ? webpackHelper.generateMetaDataFile(defaultAppPath, customProperties) : customProperties;
                        }
                    },
                    //use package-lock json as buildInfo
                    {from: workspaceBuildInfoFile, to: path.join(workspacePath, 'bundles', 'buildInfo.json')}
                ]
            )}),
            ...(isProd ? [
                // Additional production plugins
                new webpack.BannerPlugin({
                    banner: banner,
                    raw: true
                })
            ] : [
                // Additional development plugins
                // Allow HMR for React
                new ReactRefreshWebpackPlugin({
                    // Do not show the full-page error overlay
                    overlay: false
                }),
            ]),
            // For debugging issues
            // new BundleAnalyzerPlugin({
            //     // set to 'server' to start analyzer during build
            //     analyzerMode: 'disabled',
            //     generateStatsFile: true,
            //     statsOptions: {source: false}
            // })
        ]
    };
    
    // For debugging the loader performance, wrap the config before exporting:
    // TODO: Currently broken because of mini-css-extract-plugin: https://github.com/stephencookdev/speed-measure-webpack-plugin/issues/167
    // const SpeedMeasurePlugin = require("speed-measure-webpack-plugin");
    // const smp = new SpeedMeasurePlugin({
    //     outputFormat: 'humanVerbose',
    //     loaderTopFiles: 5,
    //     granularLoaderData: true
    // });
    // return smp.wrap(config);
    
    return config;
};
