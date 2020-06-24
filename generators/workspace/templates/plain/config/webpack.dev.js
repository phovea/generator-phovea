const path = require('path');
const webpack = require('webpack');
const resolve = require('path').resolve;
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const ManifestPlugin = require('webpack-manifest-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const workspaceYoRcFile = require('../.yo-rc-workspace.json');
const defaultApp = workspaceYoRcFile.defaultApp;
const appPkg = require('./../' + defaultApp + '/package.json');

const libName = appPkg.name;
const libDesc = appPkg.description;

const now = new Date();
const prefix = (n) => n < 10 ? ('0' + n) : n.toString();
const buildId = `${now.getUTCFullYear()}${prefix(now.getUTCMonth() + 1)}${prefix(now.getUTCDate())}-${prefix(now.getUTCHours())}${prefix(now.getUTCMinutes())}${prefix(now.getUTCSeconds())}`;
appPkg.version = appPkg.version.replace('SNAPSHOT', buildId);

const appBuildInfo = require('./../' + defaultApp + '/buildInfo.js');
const {entries, registry, libraryAliases, libraryExternals, filesToLoad} = require('./../' + defaultApp + '/.yo-rc.json')['generator-phovea'];
console.log('registry', registry);
const year = (new Date()).getFullYear();
const banner = '/*! ' + (appPkg.title || appPkg.name) + ' - v' + appPkg.version + ' - ' + year + '\n' +
    (appPkg.homepage ? '* ' + appPkg.homepage + '\n' : '') +
    '* Copyright (c) ' + year + ' ' + appPkg.author.name + ';' +
    ' Licensed ' + appPkg.license + '*/\n';

const WorkspaceRegistryFile = './phovea_registry.js';
const actMetaData = `${appBuildInfo.metaDataTmpFile(appPkg)}`;
const actBuildInfoFile = `${appBuildInfo.tmpFile()}`;
console.log('METADATA');
console.log(actMetaData);
console.log('BUILDINFO');
console.log(actBuildInfoFile);

const base = resolve(__dirname, '../');

/**
 * inject the registry to be included
 * @param entry
 * @returns {*}
 */
function injectRegistry(entry) {
    const extraFiles = [WorkspaceRegistryFile, actMetaData, actBuildInfoFile];
    // build also the registry
    if (typeof entry === 'string') {
        return extraFiles.concat(entry);
    }
    const transformed = {};
    Object.keys(entry).forEach((key) => {
        transformed[key] = extraFiles.concat(entry[key]);
    });
    console.log(transformed);
    return transformed;
}

const preCompilerFlags = {flags: (registry || {}).flags || {}};
const includeFeature = registry ? (extension, id) => {
    const exclude = registry.exclude || [];
    const include = registry.include || [];
    if (!exclude && !include) {
        return true;
    }
    const test = (f) => Array.isArray(f) ? extension.match(f[0]) && (id || '').match(f[1]) : extension.match(f);
    return include.every(test) && !exclude.some(test);
} : () => true;

const config = {
    mode: 'development',
    devtool: 'inline-source-map',
    output: {
        path: path.join(__dirname, './../bundles'),
        filename: '[name].js',
        publicPath: '',
        library: libName,
        libraryTarget: 'umd',
        umdNamedDefine: false
    },
    entry: injectRegistry(entries),
    resolve: {
        extensions: ['.js'],
        alias:
            Object.assign({},
                ...Object.entries(libraryAliases).
                    map((item) => ({[item[0]]: (!(libraryExternals.includes(item[0]))) ? base + `/${item[1]}` : item[1]})
                    ))
        ,
        modules: [
            // only use node_modules on root level
            path.resolve(__dirname, '../node_modules')
        ]
    },
    devServer: {
        publicPath: resolve(__dirname, './../'),
        contentBase: resolve(__dirname, './../bundles/'),
        host: 'localhost',
        open: true,
        proxy: {
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
            },
            watchOptions: {
                poll: true,
                aggregateTimeout: 500,
                ignored: /node_modules/
            }
        },
        watchOptions: {
            poll: true,
            aggregateTimeout: 500,
            ignored: /node_modules/
        }
    },
    module: {
        rules: [
            {test: /\.(xml)$/, use: 'xml-loader'},
            {test: /\.(txt)$/, use: 'raw-loader'},
            {test: /\.(html)$/, use: 'html-loader'},
            {
                test: /\.(png|jpg|gif|webp)$/,
                use: [
                    {
                        loader: 'file-loader'
                    },
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
                test: /\.css$/i,
                use: [
                    {
                        loader: 'style-loader',
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            modules: true,
                        },
                    },
                ],
            },
            {
                test: /\.(scss)$/,
                use: [
                    'style-loader', 'css-loader', 'sass-loader'
                ]
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
                use: [
                    {
                        loader: 'expose-loader',
                        options: 'window.jQuery'
                    }, {
                        loader: 'expose-loader',
                        options: 'jQuery'
                    }, {
                        loader: 'expose-loader',
                        options: '$'
                    }]
            },
            // used to remove inline loaders
            {test: /bootstrap-sass\/assets\/javascripts\//, loader: 'imports-loader?jQuery=jquery'},
            {test: /tmp\/metaData([a-z0-9]+)\.(txt)$/, loader: 'file-loader?name=phoveaMetaData.json'},
            {test: /tmp\/buildInfo([a-z0-9]+)\.(txt)$/, loader: 'file-loader?name=buildInfo.json'},
            {test: new RegExp(String.raw`(.*)\/(${filesToLoad['file-loader']})\.(html|txt)$`), loader: 'file-loader?name=[name].[ext]'}
        ],
    },
    optimization: {
        splitChunks: {
            cacheGroups: {
                commons: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all'
                }
            }
        }
    },
    plugins: [
        new CleanWebpackPlugin({
            cleanOnceBeforeBuildPatterns: [
                '**/*',
                path.join(process.cwd(), '../bundles/**/*')
            ]
        }),
        new HtmlWebpackPlugin({
            filename: 'index.html',
            title: libName,
            template: defaultApp + '/dist/index.template.ejs',
            inject: true,
            chunksSortMode: 'auto',
            meta: {
                description: libDesc
            }
        }),
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('development'),
            __VERSION__: JSON.stringify(appPkg.version),
            __LICENSE__: JSON.stringify(appPkg.license),
            __BUILD_ID__: JSON.stringify(buildId),
            __APP_CONTEXT__: JSON.stringify('/')
        }),
        new BundleAnalyzerPlugin({
            // set to 'server' to start analyzer during build
            analyzerMode: 'disabled',
            generateStatsFile: true,
            statsOptions: {source: false}
        }),
        new ManifestPlugin(),
        new webpack.BannerPlugin({
            banner: banner,
            raw: true
        })
    ],
};

console.log(config);

module.exports = config;