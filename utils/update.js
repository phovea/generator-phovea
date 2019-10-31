const updateNotifier = require('update-notifier');
const pkg = require('../package.json');

const notifier = updateNotifier({
  pkg,
  updateCheckInterval: 1000 * 60 * 60 * 24 * 7// 1 week
});

module.exports = {
  notifier
}
