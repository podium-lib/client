'use strict';

const Cache = require('../lib/resolver.cache.js');

test('resolver.cache() - object tag - should be PodletClientCacheResolver', () => {
    const cache = new Cache();
    expect(Object.prototype.toString.call(cache)).toEqual(
        '[object PodletClientCacheResolver]'
    );
});
