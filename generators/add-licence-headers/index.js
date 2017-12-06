'use strict';
const fs = require('fs');
const Base = require('yeoman-generator').Base;
const chalk = require('chalk');
const glob = require('glob');
const path = require('path');
const os = require('os');

const defaultLicenceFileName = 'licence.txt';
const defaultLicencePath = `./${defaultLicenceFileName}`;

const comments = {
  ts: {
    begin: '/*',
    body: '*',
    end: '*/',
    aligningSpaces: 1
  },
  py: {
    begin: '##',
    body: '#',
    end: '##',
    aligningSpaces: 0
  },
  scss: {
    begin: '/*',
    body: '*',
    end: '*/',
    aligningSpaces: 1
  }
};

class Generator extends Base {
  constructor(args, options) {
    super(args, options);

    this.comments = {};

    this.option('licencePath', {
      alias: 'l',
      default: defaultLicencePath,
      type: String,
      desc: `Relative path to a ${chalk.blue(defaultLicenceFileName)} file`
    });

    this.option('excludedFileTypes', {
      alias: 'e',
      default: '',
      type: String,
      desc: 'Comma separated list (without spaces) to exclude specific file types (e.g. only add to .ts files by excluding .scss and .py)'
    });
  }

  prompting() {
    return this.prompt([
      {
        type: 'input',
        name: 'licencePath',
        message: `Please enter the relative path to a text file with a licence (defaults to ${chalk.blue(defaultLicencePath)})`,
        when: this.options.licencePath === defaultLicencePath
      },
      {
        type: 'checkbox',
        name: 'excludedFileTypes',
        message: 'Exclude file types from adding headers',
        choices: Object.keys(comments),
        when: this.options.excludedFileTypes.length === 0
      }
    ]).then((props) => {
      this.licencePath = props.licencePath || this.options.licencePath || defaultLicencePath;
      const excludedFileTypes = props.excludedFileTypes || this.options.excludedFileTypes.split(',');

      // filter out excluded file types
      this.fileTypes = Object.keys(comments).filter((type) => !excludedFileTypes.includes(type));

      // TODO: How to abort the generator correctly?
      return this._readLicenceFile();
    }).catch((e) => this._abort(e));
  }

  writing() {
    this._generateComments();

    try {
      const sourceFolders = this._getSourceFolders();

      sourceFolders.forEach((folderName) => {
        const sourcePath = this.destinationPath(folderName);
        if (fs.existsSync(sourcePath)) {
          this.fileTypes.forEach((type) => this._addComments(sourcePath, type));
        }
      });
    } catch (e) {
      this._abort(e);
    }
  }

  _readLicenceFile() {
    try {
      this.licenceText = this.fs.read(this.licencePath);
    } catch (e) {
      return this._abort(e);
    }
  }

  _generateComments() {
    // get maximum line length by looping through all lines, returning the line length and passing them to Math.max
    const lineArray = this.licenceText.split(os.EOL);
    const maxLineLength = Math.max(...lineArray.map((line) => line.length));

    const align = (string, threshold, timesSpaces) => {
      if (!timesSpaces) {
        timesSpaces = threshold;
      }

      if (string.length > threshold) {
        return ' '.repeat(timesSpaces);
      }
      return '';
    };

    Object.keys(comments).forEach((fileType) => {
      const commentStyle = comments[fileType];
      let comment = commentStyle.begin + commentStyle.body.repeat(maxLineLength) + os.EOL;
      lineArray.forEach((line) => {
        // only add a space character when the opening comment contains more than one charcters (e.g. to align the asterisks in .ts files vs. aligning the hashes in .py files)
        comment += align(commentStyle.begin, commentStyle.aligningSpaces);
        comment += `${commentStyle.body}${align(line, 0, 1) + line}${os.EOL}`;
      });

      comment += align(commentStyle.begin, commentStyle.aligningSpaces);
      comment += `${commentStyle.body.repeat(maxLineLength)}${commentStyle.end}`;
      this.comments[fileType] = comment;
    });
  }

  _getSourceFolders() {
    const backendSourcePath = path.basename(this.destinationPath());
    return ['src', backendSourcePath];
  }

  _abort(msg) {
    return Promise.reject(msg ? msg : 'Step Failed: Aborting');
  }

  _addComments(path, fileExtension) {
    const folderContents = glob.sync(`**/*.${fileExtension}`, {cwd: path});

    if (folderContents.length === 0) {
      return;
    }

    const header = this.comments[fileExtension];

    folderContents.forEach((file) => {
      const filePath = path + '/' + file;
      let fileContents = this.fs.read(filePath);

      // TODO: override any comment if the file starts with one (e.g. when the licence changes)
      // whenever a file starts with our licence header skip for now
      if (fileContents.startsWith(header)) {
        return;
      }

      fileContents = this._findAndRemoveHeader(fileContents, fileExtension);

      const newContents = header + os.EOL + os.EOL + fileContents;
      this.fs.write(filePath, newContents);
    });
  }

  /**
   * remove a multiline comment at the beginning of a file (e.g. licence header) if it exists
   * @param fileContents
   * @param fileExtension
   * @returns {string}
   * @private
   */
  _findAndRemoveHeader(fileContents, fileExtension) {
    const commentConfig = comments[fileExtension];

    if (!fileContents.startsWith(commentConfig.begin)) {
      return fileContents;
    }
    const linesArray = fileContents.split(os.EOL);
    let line = linesArray.shift();
    while (line.startsWith(commentConfig.begin) || line.indexOf(commentConfig.body) === commentConfig.aligningSpaces) {
      line = linesArray.shift();
    }

    return linesArray.join(os.EOL);
  }
}

module.exports = Generator;
