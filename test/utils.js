'use strict';

const { test } = require('tap');
const utils = require('../lib/utils');
const { AssetJs } = require('@podium/utils');

/**
 * .isHeaderDefined()
 */

test('.isHeaderDefined() - header exist is headers object - should return true', t => {
    t.ok(utils.isHeaderDefined({ foo: 'bar' }, 'foo'));
    t.end();
});

test('.isHeaderDefined() - header does not exist in headers object - should return false', t => {
    t.notOk(utils.isHeaderDefined({}, 'foo'));
    t.end();
});

test('.isHeaderDefined() - header exist as empty string in headers object - should return false', t => {
    t.notOk(utils.isHeaderDefined({ foo: '' }, 'foo'));
    t.end();
});

test('.isHeaderDefined() - header exist as whitespace in headers object - should return false', t => {
    t.notOk(utils.isHeaderDefined({ foo: '  ' }, 'foo'));
    t.end();
});

/**
 * .hasManifestChange()
 */

test('.hasManifestChange() - new value is same as old value - should return false', t => {
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

test('.hasManifestChange() - new value is newer then old value - should return true', t => {
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

test('.hasManifestChange() - old value is newer then new value - should return true', t => {
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

test('.hasManifestChange() - new value is not defined, old value is defined - should return true', t => {
    const item = {
        oldVal: {
            version: '2.0.0',
        },
    };

    t.ok(utils.hasManifestChange(item));
    t.end();
});

test('.hasManifestChange() - old value is not defined, new value is defined - should return true', t => {
    const item = {
        newVal: {
            version: '2.0.0',
        },
    };

    t.ok(utils.hasManifestChange(item));
    t.end();
});

test('.hasManifestChange() - both old and new value is not defined - should return false', t => {
    const item = {};
    t.notOk(utils.hasManifestChange(item));
    t.end();
});

test('.filterAssets() - scope content - filters out fallback scoped scripts', t => {
    const assets = utils.filterAssets("content", [
      new AssetJs({ value: "/foo", scope: "content" }),
      new AssetJs({ value: "/foo", scope: "all" }),
      new AssetJs({ value: "/foo", scope: "fallback" }),
      new AssetJs({ value: "/foo" }),
    ]);

    t.equal(assets.length, 3);
    t.equal(assets[0].scope, "content");
    t.equal(assets[1].scope, "all");
    t.equal(assets[2].scope, undefined);
    t.end();
});

test('.filterAssets() - scope fallback - filters out content scoped scripts', t => {
    const assets = utils.filterAssets("fallback", [
      new AssetJs({ value: "/foo", scope: "content" }),
      new AssetJs({ value: "/foo", scope: "all" }),
      new AssetJs({ value: "/foo", scope: "fallback" }),
      new AssetJs({ value: "/foo" }),
    ]);

    t.equal(assets.length, 3);
    t.equal(assets[0].scope, "all");
    t.equal(assets[1].scope, "fallback");
    t.equal(assets[2].scope, undefined);
    t.end();
});
