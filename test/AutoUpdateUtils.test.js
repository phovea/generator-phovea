'use strict';

const AutoUpdateUtils = require("../generators/auto-update/AutoUpdateUtils");


describe('Current', () => {

    it('it runs', () => {
        AutoUpdateUtils.autoUpdate('app-slib', '6.0.0', '6.0.1', '');
        expect(1).toBe(1);
    });
});