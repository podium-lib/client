/* eslint-disable no-unused-vars */

import tap from 'tap';
import TtlMemCache from 'ttl-mem-cache';
import Cache from '../lib/resolver.cache.js';

tap.test(
    'resolver.cache() - object tag - should be PodletClientCacheResolver',
    (t) => {
        const cache = new Cache(new TtlMemCache());
        t.equal(
            Object.prototype.toString.call(cache),
            '[object PodletClientCacheResolver]',
        );
        t.end();
    },
);

tap.test(
    'resolver.cache() - "registry" not provided to constructor - should throw',
    (t) => {
        t.throws(() => {
            const cache = new Cache();
        }, 'you must pass a "registry" object to the PodletClientCacheResolver constructor');
        t.end();
    },
);
