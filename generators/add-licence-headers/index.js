'use strict';
const fs = require('fs');
const Base = require('yeoman-generator').Base;
const chalk = require('chalk');
const glob = require('glob');

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

    this.option('plugins', {
      alias: 'p',
      default: '',
      type: String,
      desc: 'Comma separated list (without spaces) of plugins to prepend the licence to'
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
        message: `Please enter the relative path to the ${chalk.blue(defaultLicenceFileName)} file`,
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
      this.licencePath = props.licencePath || this.options.licencePath;
      const excludedFileTypes = props.excludedFileTypes || this.options.excludedFileTypes.split(',');

      // filter out excluded file types
      this.fileTypes = Object.keys(comments).filter((type) => !excludedFileTypes.includes(type));

      // TODO: How to abort the generator correctly?
      return this._readLicenceFile();
    }).catch((err) => this.log(err));
  }

  writing() {
    this._generateComments();

    try {
      const sourceFolders = this._getSourceFolders();

      sourceFolders.forEach((folderName) => {
        const pluginPath = this.destinationPath(folderName);
        if (fs.existsSync(pluginPath)) {
          this.fileTypes.forEach((type) => this._addComments(pluginPath, type));
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
    const lineArray = this.licenceText.split('\n');
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
      let comment = commentStyle.begin + commentStyle.body.repeat(maxLineLength) + '\n';
      lineArray.forEach((line) => {
        // only add a space character when the opening comment contains more than one charcters (e.g. to align the asterisks in .ts files vs. aligning the hashes in .py files)
        comment += align(commentStyle.begin, commentStyle.aligningSpaces);
        comment += `${commentStyle.body}${align(line, 0, 1) + line}\n`;
      });

      comment += align(commentStyle.begin, commentStyle.aligningSpaces);
      comment += `${commentStyle.body.repeat(maxLineLength)}${commentStyle.end}`;
      this.comments[fileType] = comment;
    });
  }

  _getSourceFolders() {
    const path = this.destinationPath().split('/');
    return ['src', path[path.length - 1]];
  }

  _abort(msg) {
    console.log('ABORTING');
    return Promise.reject(msg ? msg : 'Step Failed: Aborting');
  }

  _addComments(path, fileExtension) {
    glob(`**/*.${fileExtension}`, {cwd: path}, (err, files) => {
      if (err) {
        throw err;
      }

      if (files.length === 0) {
        return;
      }

      files.forEach((file) => {
        const filePath = path + '/' + file;
        let fileContents = this.fs.read(filePath);

        // TODO: override any comment if the file starts with one (e.g. when the licence changes)
        // whenever a file starts with our licence header skip for now
        if (fileContents.startsWith(this.comments[fileExtension])) {
          return;
        }

        fileContents = this._findAndRemoveHeader(fileContents, fileExtension);

        const newContents = this.comments[fileExtension] + '\n\n' + fileContents;
        this.fs.write(filePath, newContents);
      });
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
    if (fileContents.startsWith(comments[fileExtension].begin)) {
      const linesArray = fileContents.split('\n');
      let line = linesArray[0];
      while (line.startsWith(comments[fileExtension].begin) || line.indexOf(comments[fileExtension].body) > -1) {
        line = linesArray.splice(0, 1)[0];
      }

      return linesArray.join('\n');
    }

    return fileContents;
  }
}

module.exports = Generator;
