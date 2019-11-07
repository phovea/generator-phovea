'use strict';
const { series, src, watch } = require('gulp');
const eslint = require('gulp-eslint');
const excludeGitignore = require('gulp-exclude-gitignore');
const mocha = require('gulp-mocha');
const istanbul = require('gulp-istanbul');
const plumber = require('gulp-plumber');


function lint() {
  return src(['generators/*/*.js','test/**.js','utils/**.js', 'generators/*/templates/plain/**.js', 'generators/*/templates/sample_plain/**.js'])
    .pipe(excludeGitignore())
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
}

function lintWatch() {
  watch(['generators/*/*.js','test/**.js','utils/**.js', 'generators/*/templates/plain/**.js', 'generators/*/templates/sample_plain/**.js'], lint);
}

function preTest() {
  return src('generators/*/*.js')
    .pipe(excludeGitignore())
    .pipe(istanbul({
      includeUntested: true
    }))
    .pipe(istanbul.hookRequire());
}

function runTest(cb) {
  let mochaErr;

  return src('test/**/*.js')
    .pipe(plumber())
    .pipe(mocha({reporter: 'spec'}))
    .on('error', function (err) {
      mochaErr = err;
    })
    .pipe(istanbul.writeReports())
    .on('end', function () {
      cb(mochaErr);
    });
}

const test = series(preTest, runTest);

function testWatch() {
  watch(['generators/*/*.js', 'test/**'], runTest);
}

exports.test = test;
exports.testWatch = series(test, testWatch);
exports.lint = lint;
exports.lintWatch = series(lint, lintWatch);
exports.prepublish = series(lint, test);
exports.default = series(lint, test);
