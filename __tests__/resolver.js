'use strict';

const TtlMemCache = require('ttl-mem-cache');
const Metrics = require('@metrics/client');
const Resolver = require('../lib/resolver');

test('resolver() - object tag - should be PodletClientResolver', () => {
    const resolver = new Resolver(new TtlMemCache(), new Metrics());
    expect(Object.prototype.toString.call(resolver)).toEqual(
        '[object PodletClientResolver]',
    );
});

test('resolver() - "registry" not provided to constructor - should throw', () => {
    expect(() => {
        // eslint-disable-next-line no-unused-vars
        const resolver = new Resolver();
    }).toThrowError(
        'you must pass a "registry" object to the PodletClientResolver constructor',
    );
});

test('resolver() - "metrics client" not provided to constructor - should throw', () => {
    expect(() => {
        // eslint-disable-next-line no-unused-vars
        const resolver = new Resolver({});
    }).toThrowError(
        'you must pass a @metrics/client to the PodletClientResolver constructor',
    );
});
