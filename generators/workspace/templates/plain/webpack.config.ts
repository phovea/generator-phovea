import * as path from "path";
import * as fs from "fs";
import * as webpack from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import ReactRefreshWebpackPlugin from "@pmmmwh/react-refresh-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import Dotenv from "dotenv-webpack";
import TerserPlugin from "terser-webpack-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import ESLintPlugin from "eslint-webpack-plugin";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import CopyPlugin from "copy-webpack-plugin";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
// in case you run into any typescript error when configuring `devServer`
import "webpack-dev-server";

export default (env, argv) => {
  const mode = argv.mode;
  const isEnvDevelopment = mode === "development";
  const isEnvProduction = mode === "production";
  if (!isEnvDevelopment && !isEnvProduction) {
    throw Error(`Invalid mode passed: ${mode}`);
  }

  const now = new Date();
  const year = now.getFullYear();
  // workspace constants
  const workspacePath = path.resolve(__dirname); // TODO: Add , '../') if you move this file in a subdirectory
  const workspaceYoRcFile: {
    workspaceAliases: { [key: string]: string };
    registry: any;
    frontendRepos: any;
    maxChunkSize?: number;
    defaultApp: string;
    // TODO: This is not required anymore, because we let webpack split chunks?
    vendors: any;
    devServerProxy: any;
  } = require(path.join(workspacePath, ".yo-rc-workspace.json"));
  const workspacePkg = require(path.join(workspacePath, "package.json"));
  const workspaceBuildInfoFile = path.join(workspacePath, "package-lock.json");
  const workspaceMetaDataFile = path.join(workspacePath, "metaData.json");
  const workspaceRegistryFile = path.join(workspacePath, "phovea_registry.js");
  const workspaceAliases = workspaceYoRcFile.workspaceAliases || [];
  const workspaceRegistry = workspaceYoRcFile.registry || [];
  // TODO: This is not required anymore, because we let webpack split chunks?
  const workspaceVendors = workspaceYoRcFile.vendors || [];
  // TODO: This is not required anymore, because we let webpack split chunks?
  const workspaceName = workspacePath.substring(
    workspacePath.lastIndexOf("/") + 1
  );
  const workspaceProxy = workspaceYoRcFile.devServerProxy || {};
  const workspaceRepos = workspaceYoRcFile.frontendRepos || [];
  const workspaceMaxChunkSize = workspaceYoRcFile.maxChunkSize || 5000000;

  //app constants
  const envApp = process.argv.filter((e) => e.startsWith("--app="));
  const defaultApp =
    envApp.length > 0
      ? envApp[0].substring(6).trim()
      : workspaceYoRcFile.defaultApp;
  const defaultAppPath = path.join(workspacePath, defaultApp);
  const appPkg = require(path.join(defaultAppPath, "package.json"));
  const libName = appPkg.name;
  const libDesc = appPkg.description;
  const {
    entries,
    registry,
    // TODO: This is not required anymore, because we let webpack split chunks?
    vendors,
    libraryAliases,
    filesToLoad,
    copyFiles,
  }: {
    entries: {
      [chunkName: string]: {
        js: string;
        html: string;
        template: string;
        excludeChunks: string[];
        scss?: string;
      };
    };
    registry: any;
    // TODO: This is not required anymore, because we let webpack split chunks?
    vendors: { [key: string]: string };
    libraryAliases: { [key: string]: string };
    filesToLoad: any;
    copyFiles?: string[];
  } = require(path.join(defaultAppPath, ".yo-rc.json"))["generator-phovea"];
  // TODO: This is not required anymore, or is it?
  // const fileLoaderRegex =
  //   filesToLoad && filesToLoad["file-loader"]
  //     ? RegExp(String.raw`(.*)\/(${filesToLoad["file-loader"]})\.(html|txt)$`)
  //     : RegExp(/^$/);
  const copyAppFiles =
    copyFiles?.map((file) => ({
      from: path.join(defaultAppPath, file),
      to: path.join(workspacePath, "bundles", path.basename(file)),
    })) || [];
  // Merge app and workspace properties
  const mergedAliases = {
    ...libraryAliases,
    ...workspaceAliases,
  };
  const mergedRegistry = {
    ...registry,
    ...workspaceRegistry,
  };

  return {
    mode,
    // Webpack noise constrained to errors and warnings
    stats: "errors-warnings",
    devtool: isEnvDevelopment ? "cheap-module-source-map" : "source-map",
    // These are the "entry points" to our application.
    // This means they will be the "root" imports that are included in JS bundle.
    entry: Object.fromEntries(
      Object.entries(entries).map(([key, entry]) => [
        key,
        [
          workspaceRegistryFile,
          path.join(defaultAppPath, entry.js),
          entry.scss
            ? path.join(defaultAppPath, entry.scss)
            : "./workspace.scss",
        ],
      ])
    ),
    devServer: isEnvDevelopment
      ? {
          static: path.resolve(workspacePath, "bundles"),
          compress: true,
          host: "localhost",
          open: false,
          proxy: {
            // Append on top to allow overriding /api/v1/ for example
            ...workspaceProxy,
            ...{
              "/api/*": {
                target: "http://localhost:9000",
                secure: false,
                ws: true,
              },
              "/login": {
                target: "http://localhost:9000",
                secure: false,
              },
              "/logout": {
                target: "http://localhost:9000",
                secure: false,
              },
              "/loggedinas": {
                target: "http://localhost:9000",
                secure: false,
              },
              // Append on bottom to allow override of exact key matches like /api/*
              ...workspaceProxy,
            },
          },
          client: {
            // Do not show the full-page error overlay
            overlay: false,
          },
        }
      : undefined,
    output: {
      // The build folder.
      path: path.join(workspacePath, "bundles"),
      // Add /* filename */ comments to generated require()s in the output.
      pathinfo: isEnvDevelopment,
      // There will be one main bundle, and one file per asynchronous chunk.
      filename: "[name].[contenthash:8].js",
      // There are also additional JS chunk files if you use code splitting.
      chunkFilename: "[name].[contenthash:8].chunk.js",
      assetModuleFilename: "assets/[name].[hash][ext]",
      // webpack uses `publicPath` to determine where the app is being served from.
      // It requires a trailing slash, or the file assets will get an incorrect path.
      // We inferred the "public path" (such as / or /my-project) from homepage.
      publicPath: "",
    },
    cache: {
      type: "filesystem",
      // TODO: Check if we need that
      // version: createEnvironmentHash(env.raw),
      cacheDirectory: path.join(workspacePath, "webpack_cache"),
      store: "pack",
      buildDependencies: {
        defaultWebpack: ["webpack/lib/"],
        config: [__filename],
        // tsconfig: [paths.appTsConfig, paths.appJsConfig].filter((f) =>
        //   fs.existsSync(f)
        // ),
      },
    },
    optimization: {
      nodeEnv: false, // will be set by DefinePlugin
      minimize: isEnvProduction,
      minimizer: [
        // This is only used in production mode
        new TerserPlugin({
          terserOptions: {
            parse: {
              // We want terser to parse ecma 8 code. However, we don't want it
              // to apply any minification steps that turns valid ecma 5 code
              // into invalid ecma 5 code. This is why the 'compress' and 'output'
              // sections only apply transformations that are ecma 5 safe
              // https://github.com/facebook/create-react-app/pull/4234
              // ecma: 8, TODO:
            },
            compress: {
              ecma: 5,
              // Disabled because of an issue with Uglify breaking seemingly valid code:
              // https://github.com/facebook/create-react-app/issues/2376
              // Pending further investigation:
              // https://github.com/mishoo/UglifyJS2/issues/2011
              comparisons: false,
              // Disabled because of an issue with Terser breaking valid code:
              // https://github.com/facebook/create-react-app/issues/5250
              // Pending further investigation:
              // https://github.com/terser-js/terser/issues/120
              inline: 2,
            },
            mangle: {
              safari10: true,
            },
            // Added for profiling in devtools
            keep_classnames: true,
            keep_fnames: true,
            output: {
              ecma: 5,
              comments: false,
              // Turned on because emoji and regex is not minified properly using default
              // https://github.com/facebook/create-react-app/issues/2488
              ascii_only: true,
            },
          },
        }),
        // This is only used in production mode
        // TODO: Somehow this breaks with lineup: /media/LineUpJS.d518227895a66b92cfd7.css:1:1: Unknown word [media/LineUpJS.d518227895a66b92cfd7.css:1,1]
        // new CssMinimizerPlugin(),
      ],
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js"],
      alias: Object.assign(
        {},
        // Add aliases for all the workspace repos
        ...workspaceRepos.map((repo) => ({
          // Add a direct reference to the phovea_registry.js as it is outside of the src/ folder
          [`${repo}/phovea_registry.js$`]: path.join(
            workspacePath,
            repo,
            "phovea_registry.js"
          ),
          // Rewrite all '<repo>/dist' imports to '<repo>/src'
          [`${repo}/dist`]: path.join(workspacePath, repo, "src"),
          // Rewrite all '<repo>' imports to '<repo>/src' instead of the '<repo>/dist' default defined in the package.json
          [`${repo}`]: path.join(workspacePath, repo, "src"),
        }))
        // TODO: Do we need other aliases pointing to the node_modules?
        // ...Object.entries(mergedAliases).map(([key, value]) => ({
        //   [key]: path.join(workspacePath, "node_modules", value),
        // }))
      ),
      modules: [path.join(workspacePath, "node_modules")],
    },
    module: {
      strictExportPresence: true,
      rules: [
        // Handle node_modules packages that contain sourcemaps
        {
          enforce: "pre",
          exclude: /@babel(?:\/|\\{1,2})runtime/,
          test: /\.(js|mjs|jsx|ts|tsx|css)$/,
          loader: "source-map-loader",
        },
        {
          // "oneOf" will traverse all following loaders until one will
          // match the requirements. When no loader matches it will fall
          // back to the "file" loader at the end of the loader list.
          oneOf: [
            // "url" loader works like "file" loader except that it embeds assets
            // smaller than specified limit in bytes as data URLs to avoid requests.
            // A missing `test` is equivalent to a match.
            {
              test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
              type: "asset",
              parser: {
                dataUrlCondition: {
                  maxSize: workspaceMaxChunkSize,
                },
              },
            },
            {
              test: /\.svg$/,
              use: [
                {
                  loader: "@svgr/webpack",
                  options: {
                    prettier: false,
                    svgo: false,
                    svgoConfig: {
                      plugins: [{ removeViewBox: false }],
                    },
                    titleProp: true,
                    ref: true,
                  },
                },
                {
                  loader: "file-loader",
                  options: {
                    name: "media/[name].[hash].[ext]",
                  },
                },
              ],
              issuer: {
                and: [/\.(ts|tsx|js|jsx|md|mdx)$/],
              },
            },
            // Process application JS with Babel.
            // The preset includes JSX, Flow, TypeScript, and some ESnext features.
            {
              test: /\.(js|mjs|jsx|ts|tsx)$/,
              exclude: /node_modules/,
              loader: "babel-loader",
              options: {
                presets: [
                  [
                    "@babel/preset-env",
                    { targets: { browsers: "last 2 Chrome versions" } },
                  ],
                  "@babel/preset-typescript",
                  "@babel/preset-react",
                ],
                plugins: [
                  // https://exerror.com/babel-referenceerror-regeneratorruntime-is-not-defined/#Solution_3_For_Babel_7_User
                  [
                    "@babel/transform-runtime",
                    {
                      regenerator: true,
                    },
                  ],
                  // plugin-proposal-decorators is only needed if you're using experimental decorators in TypeScript
                  ["@babel/plugin-proposal-decorators", { legacy: true }],
                  // ["@babel/plugin-proposal-class-properties", { loose: false }],
                  // Enable hmr for react components in dev mode
                  isEnvDevelopment && "react-refresh/babel",
                ].filter(Boolean),
                babelrc: false,
                configFile: false,
                // This is a feature of `babel-loader` for webpack (not Babel itself).
                // It enables caching results in ./node_modules/.cache/babel-loader/
                // directory for faster rebuilds.
                cacheDirectory: true,
                // See create-react-app#6846 for context on why cacheCompression is disabled
                cacheCompression: false,
                compact: isEnvProduction,
              },
            },
            {
              test: /\.s[ac]ss$/i,
              use: [
                // In production, we use MiniCSSExtractPlugin to extract that CSS
                // to a file, but in development "style" loader enables hot editing of CSS.
                isEnvProduction && MiniCssExtractPlugin.loader,
                // "style" loader turns CSS into JS modules that inject <style> tags.
                isEnvDevelopment && "style-loader",
                // "css" loader resolves paths in CSS and adds assets as dependencies.
                "css-loader",
                // Compiles Sass to CSS
                "sass-loader",
              ].filter(Boolean),
              // Don't consider CSS imports dead code even if the
              // containing package claims to have no side effects.
              // Remove this when webpack adds a warning or an error for this.
              // See https://github.com/webpack/webpack/issues/6571
              sideEffects: true,
            },
            // TODO: This is legacy stuff, should it be included as well?
            {
              test: /(.*)\/phovea(_registry)?\.(js|ts)$/,
              use: [
                {
                  loader: "ifdef-loader",
                  options: {
                    include: mergedRegistry
                      ? (extension, id) => {
                          const exclude = mergedRegistry.exclude || [];
                          const include = mergedRegistry.include || [];
                          if (!exclude && !include) {
                            return true;
                          }
                          const test = (f) =>
                            Array.isArray(f)
                              ? extension.match(f[0]) && (id || "").match(f[1])
                              : extension.match(f);
                          return include.every(test) && !exclude.some(test);
                        }
                      : () => true,
                    ...{ flags: (mergedRegistry || {}).flags || {} },
                  },
                },
              ],
            },
            // TODO: Is this legacy stuff, should it be included as well?
            {
              test: require.resolve("jquery"),
              loader: "expose-loader",
              options: {
                exposes: ["window.jQuery", "$"],
              },
            },
            // "file" loader makes sure those assets get served by WebpackDevServer.
            // When you `import` an asset, you get its (virtual) filename.
            // In production, they would get copied to the `build` folder.
            // This loader doesn't use a "test" so it will catch all modules
            // that fall through the other loaders.
            {
              // Exclude `js` files to keep "css" loader working as it injects
              // its runtime that would otherwise be processed through "file" loader.
              // Also exclude `html`, `ejs` and `json` extensions so they get processed
              // by webpacks internal loaders.
              exclude: [
                /^$/,
                /\.(js|mjs|jsx|ts|tsx)$/,
                /\.html$/,
                /\.ejs$/,
                /\.json$/,
              ],
              type: "asset/resource",
            },
            // ** STOP ** Are you adding a new loader?
            // Make sure to add the new loader(s) before the "file" loader.
          ],
        },
      ],
    },
    plugins: [
      new CleanWebpackPlugin(),
      isEnvDevelopment &&
        new ReactRefreshWebpackPlugin({
          overlay: false,
        }),
      ...Object.entries(entries).map(
        ([key, entry]) =>
          new HtmlWebpackPlugin({
            inject: true,
            template: path.join(defaultAppPath, entry.template),
            filename: entry.html,
            title: libName,
            excludeChunks: entry.excludeChunks,
            meta: {
              description: libDesc,
            },
            ...(isEnvProduction
              ? {
                  minify: {
                    removeComments: true,
                    collapseWhitespace: true,
                    removeRedundantAttributes: true,
                    useShortDoctype: true,
                    removeEmptyAttributes: true,
                    removeStyleLinkTypeAttributes: true,
                    keepClosingSlash: true,
                    minifyJS: true,
                    minifyCSS: true,
                    minifyURLs: true,
                  },
                }
              : {}),
          })
      ),
      isEnvProduction &&
        new MiniCssExtractPlugin({
          // Options similar to the same options in webpackOptions.output
          // both options are optional
          // filename: "[name].[contenthash:8].css",
          // chunkFilename: "[name].[contenthash:8].chunk.css",
        }),
      new webpack.DefinePlugin({
        "process.env.NODE_ENV": JSON.stringify(mode),
        // TODO: Add others..., or even better: env.stringified from https://github.com/facebook/create-react-app/blob/main/packages/react-scripts/config/webpack.config.js#L653
      }),
      new Dotenv({
        path: path.join(workspacePath, ".env"), // load this now instead of the ones in '.env'
        safe: false, // load '.env.example' to verify the '.env' variables are all set. Can also be a string to a different file.
        allowEmptyValues: true, // allow empty variables (e.g. `FOO=`) (treat it as empty string, rather than missing)
        systemvars: true, // load all the predefined 'process.env' variables which will trump anything local per dotenv specs.
        silent: true, // hide any errors
        defaults: false, // load '.env.defaults' as the default values if empty.
      }),
      new CopyPlugin({
        patterns: copyAppFiles.concat([
          {
            from: workspaceMetaDataFile,
            to: path.join(workspacePath, "bundles", "phoveaMetaData.json"),
            // @ts-ignore TODO: check why https://webpack.js.org/plugins/copy-webpack-plugin/#transform is not in the typing.
            transform: () => {
              function resolveScreenshot(appDirectory: string) {
                const f = path.join(appDirectory, "./media/screenshot.png");
                if (!fs.existsSync(f)) {
                  return null;
                }
                const buffer = Buffer.from(fs.readFileSync(f)).toString(
                  "base64"
                );
                return `data:image/png;base64,${buffer}`;
              }

              const prefix = (n) => (n < 10 ? "0" + n : n.toString());
              const buildId = `${now.getUTCFullYear()}${prefix(
                now.getUTCMonth() + 1
              )}${prefix(now.getUTCDate())}-${prefix(
                now.getUTCHours()
              )}${prefix(now.getUTCMinutes())}${prefix(now.getUTCSeconds())}`;

              return JSON.stringify(
                {
                  name: appPkg.name,
                  displayName: appPkg.displayName || appPkg.name,
                  version: isEnvDevelopment
                    ? appPkg.version
                    : workspacePkg.version,
                  repository: appPkg.repository?.url,
                  homepage: appPkg.homepage,
                  description: appPkg.description,
                  screenshot: resolveScreenshot(defaultAppPath),
                  buildId,
                },
                null,
                2
              );
            },
          },
          // use package-lock json as buildInfo
          {
            from: workspaceBuildInfoFile,
            to: path.join(workspacePath, "bundles", "buildInfo.json"),
          },
        ]),
      }),
      // For each workspace repo, create an instance of the TS checker to typecheck.
      ...workspaceRepos.map(
        (repo) =>
          new ForkTsCheckerWebpackPlugin({
            async: isEnvDevelopment,
            typescript: {
              diagnosticOptions: {
                semantic: true,
                syntactic: true,
              },
              // Build the repo and type-check
              build: true,
              // Recommended for use with babel-loader
              mode: "write-references",
              // Use the corresponding config file of the repo folder
              configFile: path.join(workspacePath, repo, "tsconfig.json"),
              // TODO: Add explanation
              configOverwrite: {
                compilerOptions: {
                  // Similarly to the webpack-alias definition, we need to define the same alias for typescript
                  baseUrl: ".",
                  paths: Object.assign(
                    {},
                    ...workspaceRepos.map((repo) => ({
                      [`${repo}/phovea_registry.js`]: [
                        path.join(workspacePath, repo, "phovea_registry.js"),
                      ],
                      [`${repo}/dist`]: [
                        path.join(workspacePath, repo, "src/*"),
                      ],
                      [repo]: [path.join(workspacePath, repo, "src/index.ts")],
                    }))
                  ),
                },
              },
            },
          })
      ),
      /*
      // For each workspace repo, create an instance of the ESLint plugin
      ...workspaceRepos.map(
        (repo) =>
          new ESLintPlugin({
            // Plugin options
            // context: path.join(workspacePath, repo),
            cache: true,
            // cacheLocation: path.join(
            //   paths.appNodeModules,
            //   '.cache/.eslintcache'
            // ),
            // ESLint class options
            cwd: path.join(workspacePath, repo),
            // resolvePluginsRelativeTo: __dirname,
          })
      ),
      */
      isEnvProduction &&
        new webpack.BannerPlugin({
          banner:
            "/*! " +
            (appPkg.title || appPkg.name) +
            " - v" +
            appPkg.version +
            " - " +
            year +
            "\n" +
            (appPkg.homepage ? "* " + appPkg.homepage + "\n" : "") +
            "* Copyright (c) " +
            year +
            " " +
            appPkg.author?.name +
            ";" +
            " Licensed " +
            appPkg.license +
            "*/\n",
          raw: true,
        }),
      // For debugging issues
      false &&
        new BundleAnalyzerPlugin({
          // set to 'server' to start analyzer during build
          analyzerMode: "disabled",
          generateStatsFile: true,
          statsOptions: { source: false },
        }),
    ].filter(Boolean),
  } as webpack.Configuration;
};
