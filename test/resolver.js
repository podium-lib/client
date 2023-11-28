import tap from 'tap';
import TtlMemCache from 'ttl-mem-cache';
import Resolver from '../lib/resolver.js';

tap.test('resolver() - object tag - should be PodletClientResolver', t => {
    const resolver = new Resolver(new TtlMemCache());
    t.equal(
        Object.prototype.toString.call(resolver),
        '[object PodletClientResolver]',
    );
    t.end();
});

tap.test('resolver() - "registry" not provided to constructor - should throw', t => {
    t.throws(() => {
        // eslint-disable-next-line no-unused-vars
        const resolver = new Resolver();
    }, 'you must pass a "registry" object to the PodletClientResolver constructor');
    t.end();
});
