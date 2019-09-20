'use strict';
const fs = require('fs');
const Generator = require('yeoman-generator');
const chalk = require('chalk');
const glob = require('glob');
const path = require('path');
const os = require('os');

const defaultLicenseFileName = 'LICENSE_FILE_HEADER.txt';
const defaultLicensePath = `./${defaultLicenseFileName}`;

const comments = {
  ts: {
    begin: '/*',
    body: '*',
    end: '*/',
    aligningSpaces: 1
  },
  tsx: {
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

class AddLicenseGenerator extends Generator {
  constructor(args, options) {
    super(args, options);

    this.comments = {};

    this.option('licensePath', {
      alias: 'l',
      default: defaultLicensePath,
      type: String,
      desc: `Relative path to a ${chalk.blue(defaultLicenseFileName)} file`
    });

    this.option('excludedFileTypes', {
      alias: 'e',
      default: '',
      type: String,
      desc: 'Comma separated list (without spaces) to exclude specific file types (e.g. only add to .ts files by excluding .scss and .py)'
    });
  }

  prompting() {
    return this.prompt([{
      type: 'input',
      name: 'licensePath',
      message: `Please enter the relative path to a text file with a license (defaults to ${chalk.blue(defaultLicensePath)})`,
      when: this.options.licensePath === defaultLicensePath
    }, {
      type: 'checkbox',
      name: 'excludedFileTypes',
      message: 'Exclude file types from adding headers',
      choices: Object.keys(comments),
      when: this.options.excludedFileTypes.length === 0
    }]).then((props) => {
      this.licensePath = props.licensePath || this.options.licensePath || defaultLicensePath;
      const excludedFileTypes = props.excludedFileTypes || this.options.excludedFileTypes.split(',');

      // filter out excluded file types
      this.fileTypes = Object.keys(comments).filter((type) => !excludedFileTypes.includes(type));

      // TODO: How to abort the generator correctly?
      return this._readLicenseFile();
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

  _readLicenseFile() {
    try {
      this.licenseText = this.fs.read(this.licensePath);
    } catch (e) {
      return this._abort(e);
    }
  }

  _generateComments() {
    // get maximum line length by looping through all lines, returning the line length and passing them to Math.max
    const lineArray = this.licenseText.split(/\r?\n/);
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
    return ['src', backendSourcePath, backendSourcePath.toLowerCase()];
  }

  _abort(msg) {
    return Promise.reject(msg ? msg : 'Step Failed: Aborting');
  }

  _addComments(path, fileExtension) {
    const folderContents = glob.sync(`**/*.${fileExtension}`, {
      cwd: path
    });

    if (folderContents.length === 0) {
      return;
    }

    const header = this.comments[fileExtension];

    folderContents.forEach((file) => {
      const filePath = path + '/' + file;
      let fileContents = this.fs.read(filePath);

      // whenever a file starts with our license header skip for now
      if (fileContents.startsWith(header)) {
        return;
      }

      fileContents = this._findAndRemoveHeader(fileContents, fileExtension);

      const newContents = header + os.EOL + os.EOL + os.EOL + fileContents;
      this.fs.write(filePath, newContents);
    });
  }

  /**
   * remove a multiline comment at the beginning of a file (e.g. license header) if it exists
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
    const linesArray = fileContents.split(/\r?\n/);

    // trim empty lines from top
    while (linesArray.length > 0 && linesArray[0].trim().length === 0) {
      linesArray.shift();
    }

    // remove old header
    let line = linesArray[0];
    while (line && (line.startsWith(commentConfig.begin) || line[commentConfig.aligningSpaces] === commentConfig.body)) {
      linesArray.shift();
      line = linesArray[0];
    }

    // trim empty lines from top
    while (linesArray.length > 0 && linesArray[0].trim().length === 0) {
      linesArray.shift();
    }

    return linesArray.join(os.EOL);
  }
}

module.exports = AddLicenseGenerator;
