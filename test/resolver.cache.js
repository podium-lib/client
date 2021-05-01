/* eslint-disable import/order */

import tap from 'tap';
import Cache from '../lib/resolver.cache.js';
import TtlMemCache from 'ttl-mem-cache';

tap.test('resolver.cache() - object tag - should be PodletClientCacheResolver', t => {
    const cache = new Cache(new TtlMemCache());
    t.equal(
        Object.prototype.toString.call(cache),
        '[object PodletClientCacheResolver]',
    );
    t.end();
});

tap.test('resolver.cache() - "registry" not provided to constructor - should throw', t => {
    t.throws(() => {
        // eslint-disable-next-line no-unused-vars
        const cache = new Cache();
    }, 'you must pass a "registry" object to the PodletClientCacheResolver constructor');
    t.end();
});
