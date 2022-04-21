'use strict';
const {series, src, watch} = require('gulp');
const eslint = require('gulp-eslint-new');
const excludeGitignore = require('gulp-exclude-gitignore');
const plumber = require('gulp-plumber');
const jest = require('gulp-jest').default;

function lint() {
  return src(['generators/*/*.js', 'test/**.js', 'utils/**.js', 'generators/*/templates/plain/**.js', 'generators/*/templates/sample_plain/**.js'])
    .pipe(excludeGitignore())
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
}

function lintWatch() {
  watch(['generators/*/*.js', 'test/**.js', 'utils/**.js', 'generators/*/templates/plain/**.js', 'generators/*/templates/sample_plain/**.js'], lint);
}

function runTest() {
  process.env.NODE_ENV = 'test';
  return src('test/')// using src('test/**/*.js') will cause the task to be run twice
    // TODO: why do we want to accept failing tests? gulp-plumber prevents pipe breaking caused by errors from gulp plugins
    .pipe(plumber())
    .pipe(jest());
}

function testWatch() {
  watch(['generators/*/*.js', 'test/**'], runTest);
}

exports.test = runTest;
exports.testWatch = series(runTest, testWatch);
exports.lint = lint;
exports.lintWatch = series(lint, lintWatch);
exports.prepublish = series(lint, runTest);
exports.default = series(lint, runTest);
