'use strict';
const pkg = require('../../package.json');
const generators = require('yeoman-generator');
const updateNotifier = require('update-notifier');

let hasBeenNotified = false;

function runUpdateNotifier() {
  if (hasBeenNotified) {
    return;
  }
  hasBeenNotified = true;
  const notifier = updateNotifier({
    pkg,
    updateCheckInterval: 1000 * 60 * 60 * 24 * 2// 2 days
  });

  notifier.notify({isGlobal: true});
}

class VersionGenerator extends generators.Base {

  initializing() {
    runUpdateNotifier();
  }
}

module.exports = VersionGenerator;
