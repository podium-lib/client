'use strict';

const TtlMemCache = require('ttl-mem-cache');
const Resolver = require('../lib/resolver.js');

const REGISTRY = new TtlMemCache();

test('resolver() - object tag - should be PodletClientResolver', () => {
    const resolver = new Resolver(REGISTRY);
    expect(Object.prototype.toString.call(resolver)).toEqual(
        '[object PodletClientResolver]'
    );
});

test('resolver() - "registry" not provided to constructor - should throw', () => {
    expect(() => {
        // eslint-disable-next-line no-unused-vars
        const resolver = new Resolver();
    }).toThrowError(
        'you must pass a "registry" object to the PodletClientResolver constructor'
    );
});
