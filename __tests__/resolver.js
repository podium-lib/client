'use strict';

const { test } = require('tap');
const TtlMemCache = require('ttl-mem-cache');
const Resolver = require('../lib/resolver');

test('resolver() - object tag - should be PodletClientResolver', t => {
    const resolver = new Resolver(new TtlMemCache());
    t.equal(
        Object.prototype.toString.call(resolver),
        '[object PodletClientResolver]',
    );
    t.end();
});

test('resolver() - "registry" not provided to constructor - should throw', t => {
    t.throws(() => {
        // eslint-disable-next-line no-unused-vars
        const resolver = new Resolver();
    }, 'you must pass a "registry" object to the PodletClientResolver constructor');
    t.end();
});
