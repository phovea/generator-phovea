/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

import webpack from './webpack.config.js';

export default function (config) {
  config.set({
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

    webpack: webpack('test'),

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
  });
}