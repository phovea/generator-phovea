'use strict';
const Base = require('yeoman-generator');

class Generator extends Base {
  constructor(args, options) {
    super(args, options);

    this.argument('publish', {
      required: true
    });
  }
  initializing() {
    if (this.args[0] === 'npm') {
      this._publishToNpm()
    } else if (this.args[0] === 'PyPi') {
      this._publishToPyPi()
    }
  }
  _publishToNpm() {
    this.spawnCommandSync('cd', 'phovea');
    this.spawnCommandSync('npm', 'install');
    this.spawnCommandSync('npm', ['run', 'build:web']);
    // publish:
    // docker:
    //   - image: circleci/<language>:<version TAG>
    // steps:
    //   - checkout
    //   - run:
    //       name: Publish to NPM
    //       command: |
    //         npm set //registry.npmjs.org/:_authToken=$npm_Token
    //         npm publish
  }
  _publishToPyPi() {
    this.spawnCommandSync('cd', 'phovea');
    this.spawnCommandSync('pip', ['install', '-r', 'requirements.txt']);
    this.spawnCommandSync('pip', ['install', '-r', 'requirements_dev.txt']);
    this.spawnCommandSync('pip', ['install', 'twine']);
    this.spawnCommandSync('npm', ['run', 'dist:python']);
    // Ensure only two files are in the dist directory (*.whl and *.tar.gz)
    // Ensure that both files contain the new version number
    // Login with caleydo-bot
    this.spawnCommandSync('twine', ['upload', '--repository-url', 'https://upload.pypi.org/legacy/ dist/*'])//
    // - run:
    // name: init .pypirc
    // command: |
    //   echo -e "[pypi]" >> ~/.pypirc
    //   echo -e "username = oliverxx" >> ~/.pypirc
    //   echo -e "password = $PYPI_PASSWORD" >> ~/.pypirc
    // - run:
    // name: upload to pypi
    // command: |
    //   twine upload dist/*

  //   workflows:
  // version: 2
  // build_and_deploy:
  //   jobs:
  //     - build:
  //         filters:
  //           tags:
  //             only: /.*/
  //     - deploy:
  //         requires:
  //           - build
  //         filters:
  //           tags:
  //             only: /[0-9]+(\.[0-9]+)*/
  //           branches:
  //             ignore: /.*/
  }

}


module.exports = Generator;
