'use strict';
const WorkspaceUtils = require('../utils/WorkspaceUtils');


describe('Find default app in product object', () => {

    it('returns null if product is undefined', () => {
        const product = undefined;
        expect(WorkspaceUtils.findDefaultApp(product)).toBe(null);
    });

    it('returns null if product has no entry type `web`', () => {
        const product = [
            {
                type: 'api',
                label: 'phovea_ui',
                repo: 'phovea/phovea_ui',
                branch: 'develop',
                additional: []

            }];
        expect(WorkspaceUtils.findDefaultApp(product)).toBe(null);
    });

    it('returns parsed repo name when entry has type `web`', () => {
        const product = [
            {
                type: 'web',
                label: 'ordino',
                repo: 'Caleydo/ordino_public',
                branch: 'develop',
                additional: []

            },
            {
                type: 'api',
                label: 'repo',
                repo: 'org/repo',
                branch: 'develop',
                additional: []

            }];
        expect(WorkspaceUtils.findDefaultApp(product)).toBe('ordino_public');
    });
});