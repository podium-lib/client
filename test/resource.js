'use strict';

const Resource = require('../lib/resource');
const stream = require('stream');
const Cache = require('ttl-mem-cache');
const test = require('ava');

const REGISTRY = new Cache();
const URI = 'http://example.org';

/**
 * Constructor
 */

test('Resource() - set "registry" - should be persisted on "this.registry"', t => {
    const resource = new Resource(REGISTRY, { uri: URI });
    t.true(resource.registry !== undefined);
});

test('Resource() - set "options.uri" - should be 20 items', t => {
    const resource = new Resource(REGISTRY, { uri: URI });
    t.is(resource.options.uri, URI);
});

test('Resource() - instantiate new resource object - should have "fetch" method', t => {
    const resource = new Resource(REGISTRY, { uri: URI });
    t.true(typeof resource.fetch === 'function');
});

test('Resource() - instantiate new resource object - should have "stream" method', t => {
    const resource = new Resource(REGISTRY, { uri: URI });
    t.true(typeof resource.stream === 'function');
});

/**
 * .fetch()
 */

test('resource.fetch() - should return a promise', t => {
    const resource = new Resource(REGISTRY, { uri: URI });
    const fetch = resource.fetch();
    t.true(fetch instanceof Promise);
});

/**
 * .stream()
 */

test('resource.stream() - should return a stream', t => {
    const resource = new Resource(REGISTRY, { uri: URI });
    const strm = resource.stream();
    t.true(strm instanceof stream);
});

/**
 * .uri
 */

test('Resource().uri - instantiate new resource object - expose own uri', t => {
    const resource = new Resource(REGISTRY, { uri: URI });
    t.is(resource.uri, URI);
});
