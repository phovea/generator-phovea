'use strict';
const assert = require('yeoman-assert');
const installedVersions = require('../utils/installedVersions');

describe('installedVersions() behaves as expected', () => {
  beforeEach(() => {
    installedVersions.resetVersionHasBeenShown();
  });

  it('error: installed node and npm versions are less than the required', () => {
    const versions = {
      installed: {
        node: '1.0.0',
        npm: '1.0.0'
      },
      required: {
        node: '2.0.0',
        npm: '2.0.0'
      }
    };

    assert.throws(() => {
      installedVersions.checkRequiredVersion(versions);
    }, Error);
  });

  it('error: installed node and npm versions are equal and less than the required, respectively', () => {
    const versions = {
      installed: {
        node: '3.0.0',
        npm: '2.0.0'
      },
      required: {
        node: '^3.0.0',
        npm: '3.0.0'
      }
    };

    assert.throws(() => {
      installedVersions.checkRequiredVersion(versions);
    }, Error);
  });

  it('error: installed node and npm versions are less than and equal the required, respectively', () => {
    const versions = {
      installed: {
        node: '3.0.0',
        npm: '3.0.0'
      },
      required: {
        node: '4.0.0',
        npm: '3.0.0'
      }
    };

    assert.throws(() => {
      installedVersions.checkRequiredVersion(versions);
    }, Error);
  });

  it('error: installed node and npm versions are greater than and less than the required, respectively', () => {
    const versions = {
      installed: {
        node: '4.0.0',
        npm: '2.0.0'
      },
      required: {
        node: '^3.0.0',
        npm: '3.0.0'
      }
    };

    assert.throws(() => {
      installedVersions.checkRequiredVersion(versions);
    }, Error);
  });

  it('error: installed node  and npm versions are less than and  greater than the required, respectively', () => {
    const versions = {
      installed: {
        node: '3.0.0',
        npm: '5.0.0'
      },
      required: {
        node: '4.0.0',
        npm: '3.0.0'
      }
    };

    assert.throws(() => {
      installedVersions.checkRequiredVersion(versions);
    }, Error);
  });

  it('warning: installed node and npm versions are equal and greater than the required, respectively', () => {
    const versions = {
      installed: {
        node: '3.0.0',
        npm: '5.0.0'
      },
      required: {
        node: '3.0.0',
        npm: '3.0.0'
      }
    };

    const message = installedVersions.checkRequiredVersion(versions);
    assert.equal(message, installedVersions.warningMessage(versions));
  });
  it('warning: installed node and npm versions are greater than required', () => {
    const versions = {
      installed: {
        node: '12.13',
        npm: '3.0.0'
      },
      required: {
        node: '2.0.0',
        npm: '2.0.0'
      }
    };

    const message = installedVersions.checkRequiredVersion(versions);
    assert.equal(message, installedVersions.warningMessage(versions));
  });

  it('warning: installed node and npm versions are greater than and equal, respectively', () => {
    const versions = {
      installed: {
        node: '12.13',
        npm: '2.0.0'
      },
      required: {
        node: '2.0.0',
        npm: '2.0.0'
      }
    };

    const message = installedVersions.checkRequiredVersion(versions);
    assert.equal(message, installedVersions.warningMessage(versions));
  });

  it('success: installed node and npm version is equal to', () => {
    const versions = {
      installed: {
        node: '3.0',
        npm: '3'
      },
      required: {
        node: '3.0.0',
        npm: '3.0.0'
      }
    };

    const message = installedVersions.checkRequiredVersion(versions);
    assert.equal(message, installedVersions.successMessage(versions));
  });
});
