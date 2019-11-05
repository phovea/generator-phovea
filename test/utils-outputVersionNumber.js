'use-strict';
const outputVersionNumber = require('../utils/outputVersionNumber');
const assert = require('yeoman-assert');

describe('outputVersionNumber() behaves as expected', () => {
  beforeEach(() => {
    outputVersionNumber.resetVersionHasBeenShown();
  });

  it('installed node and npm version is lower than required', () => {
    const versions = {
      installed: {
        node: 1,
        npm: 1
      },
      required: {
        node: 2,
        npm: 2
      },
      isSatisfied: false
    };

    try {
      const message = outputVersionNumber.checkRequiredVersion(versions);
      assert.equal(message, outputVersionNumber.successMessage(versions));
    } catch (e) {
      assert(e.message, outputVersionNumber.errorMessage(versions));
    }
  });

  it('installed node and npm version is greater than required', () => {
    const versions = {
      installed: {
        node: 3,
        npm: 3
      },
      required: {
        node: 2,
        npm: 2
      },
      isSatisfied: false
    };

    const message = outputVersionNumber.checkRequiredVersion(versions);
    assert.equal(message, outputVersionNumber.warningMessage(versions));
  });
});
