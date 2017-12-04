'use strict';

const Cache = require('../lib/resolver.cache.js');
const TtlMemCache = require('ttl-mem-cache');

const REGISTRY = new TtlMemCache();

test('resolver.cache() - object tag - should be PodletClientCacheResolver', () => {
    const cache = new Cache(REGISTRY);
    expect(Object.prototype.toString.call(cache)).toEqual(
        '[object PodletClientCacheResolver]'
    );
});

test('resolver.cache() - "registry" not provided to constructor - should throw', () => {
    expect(() => {
        // eslint-disable-next-line no-unused-vars
        const cache = new Cache();
    }).toThrowError(
        'you must pass a "registry" object to the PodletClientCacheResolver constructor'
    );
});
