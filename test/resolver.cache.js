/* eslint-disable import/order */

'use strict';

const { test } = require('tap');
const Cache = require('../lib/resolver.cache');
const TtlMemCache = require('ttl-mem-cache');

test('resolver.cache() - object tag - should be PodletClientCacheResolver', t => {
    const cache = new Cache(new TtlMemCache());
    t.equal(
        Object.prototype.toString.call(cache),
        '[object PodletClientCacheResolver]',
    );
    t.end();
});

test('resolver.cache() - "registry" not provided to constructor - should throw', t => {
    t.throws(() => {
        // eslint-disable-next-line no-unused-vars
        const cache = new Cache();
    }, 'you must pass a "registry" object to the PodletClientCacheResolver constructor');
    t.end();
});
