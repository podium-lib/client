import tap from 'tap';
import * as utils from '../lib/utils.js';

/**
 * .isHeaderDefined()
 */

tap.test('.isHeaderDefined() - header exist is headers object - should return true', t => {
    t.ok(utils.isHeaderDefined({ foo: 'bar' }, 'foo'));
    t.end();
});

tap.test('.isHeaderDefined() - header does not exist in headers object - should return false', t => {
    t.notOk(utils.isHeaderDefined({}, 'foo'));
    t.end();
});

tap.test('.isHeaderDefined() - header exist as empty string in headers object - should return false', t => {
    t.notOk(utils.isHeaderDefined({ foo: '' }, 'foo'));
    t.end();
});

tap.test('.isHeaderDefined() - header exist as whitespace in headers object - should return false', t => {
    t.notOk(utils.isHeaderDefined({ foo: '  ' }, 'foo'));
    t.end();
});

/**
 * .hasManifestChange()
 */

tap.test('.hasManifestChange() - new value is same as old value - should return false', t => {
    const item = {
        oldVal: {
            version: '1.0.0',
        },
        newVal: {
            version: '1.0.0',
        },
    };

    t.notOk(utils.hasManifestChange(item));
    t.end();
});

tap.test('.hasManifestChange() - new value is newer then old value - should return true', t => {
    const item = {
        oldVal: {
            version: '1.0.0',
        },
        newVal: {
            version: '2.0.0',
        },
    };

    t.ok(utils.hasManifestChange(item));
    t.end();
});

tap.test('.hasManifestChange() - old value is newer then new value - should return true', t => {
    const item = {
        oldVal: {
            version: '2.0.0',
        },
        newVal: {
            version: '1.0.0',
        },
    };

    t.ok(utils.hasManifestChange(item));
    t.end();
});

tap.test('.hasManifestChange() - new value is not defined, old value is defined - should return true', t => {
    const item = {
        oldVal: {
            version: '2.0.0',
        },
    };

    t.ok(utils.hasManifestChange(item));
    t.end();
});

tap.test('.hasManifestChange() - old value is not defined, new value is defined - should return true', t => {
    const item = {
        newVal: {
            version: '2.0.0',
        },
    };

    t.ok(utils.hasManifestChange(item));
    t.end();
});

tap.test('.hasManifestChange() - both old and new value is not defined - should return false', t => {
    const item = {};
    t.notOk(utils.hasManifestChange(item));
    t.end();
});
