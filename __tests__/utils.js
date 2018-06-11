'use strict';

const utils = require('../lib/utils');

/**
 * .isHeaderDefined()
 */

test('.isHeaderDefined() - header exist is headers object - should return true', () => {
    expect(utils.isHeaderDefined({ foo: 'bar' }, 'foo')).toBeTruthy();
});

test('.isHeaderDefined() - header does not exist in headers object - should return false', () => {
    expect(utils.isHeaderDefined({}, 'foo')).toBeFalsy();
});

test('.isHeaderDefined() - header exist as empty string in headers object - should return false', () => {
    expect(utils.isHeaderDefined({ foo: '' }, 'foo')).toBeFalsy();
});

test('.isHeaderDefined() - header exist as whitespace in headers object - should return false', () => {
    expect(utils.isHeaderDefined({ foo: '  ' }, 'foo')).toBeFalsy();
});

/**
 * .hasManifestChange()
 */

test('.hasManifestChange() - new value is same as old value - should return false', () => {
    const item = {
        oldVal: {
            version: '1.0.0',
        },
        newVal: {
            version: '1.0.0',
        },
    };

    expect(utils.hasManifestChange(item)).toBeFalsy();
});

test('.hasManifestChange() - new value is newer then old value - should return true', () => {
    const item = {
        oldVal: {
            version: '1.0.0',
        },
        newVal: {
            version: '2.0.0',
        },
    };

    expect(utils.hasManifestChange(item)).toBeTruthy();
});

test('.hasManifestChange() - old value is newer then new value - should return true', () => {
    const item = {
        oldVal: {
            version: '2.0.0',
        },
        newVal: {
            version: '1.0.0',
        },
    };

    expect(utils.hasManifestChange(item)).toBeTruthy();
});

test('.hasManifestChange() - new value is not defined, old value is defined - should return true', () => {
    const item = {
        oldVal: {
            version: '2.0.0',
        },
    };

    expect(utils.hasManifestChange(item)).toBeTruthy();
});

test('.hasManifestChange() - old value is not defined, new value is defined - should return true', () => {
    const item = {
        newVal: {
            version: '2.0.0',
        },
    };

    expect(utils.hasManifestChange(item)).toBeTruthy();
});

test('.hasManifestChange() - both old and new value is not defined - should return false', () => {
    const item = {};
    expect(utils.hasManifestChange(item)).toBeFalsy();
});
