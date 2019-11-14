'use strict';
const pkg = require('../../package.json');
const Generator = require('yeoman-generator');
const updateNotifier = require('update-notifier');

/**
 * This flag avoids to show the update notification again,
 * in case this version check generator is called multiple times
 * within the same yeoman command.
 */
let hasBeenNotified = false;

function runUpdateNotifier() {
  if (hasBeenNotified) {
    return;
  }
  hasBeenNotified = true;
  const notifier = updateNotifier({
    pkg,
    updateCheckInterval: 1000 * 60 * 60 * 24 * 2 // 2 days
  });

  notifier.notify({isGlobal: true});
}

class VersionGenerator extends Generator {

  initializing() {
    runUpdateNotifier();
  }
}

module.exports = VersionGenerator;
