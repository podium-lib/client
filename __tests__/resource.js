'use strict';

const Resource = require('../lib/resource');
const stream = require('stream');
const Cache = require('ttl-mem-cache');

const REGISTRY = new Cache();
const URI = 'http://example.org';

/**
 * Constructor
 */

test('Resource() - set "registry" - should be persisted on "this.registry"', () => {
    const resource = new Resource(REGISTRY, { uri: URI });
    expect(resource.registry).not.toBeUndefined();
});

test('Resource() - set "options.uri" - should be 20 items', () => {
    const resource = new Resource(REGISTRY, { uri: URI });
    expect(resource.options.uri).toBe(URI);
});

test('Resource() - instantiate new resource object - should have "fetch" method', () => {
    const resource = new Resource(REGISTRY, { uri: URI });
    expect(resource.fetch).toBeInstanceOf(Function);
});

test('Resource() - instantiate new resource object - should have "stream" method', () => {
    const resource = new Resource(REGISTRY, { uri: URI });
    expect(resource.stream).toBeInstanceOf(Function);
});

/**
 * .fetch()
 */

test.skip('resource.fetch() - should return a promise', async () => {
    const resource = new Resource(REGISTRY, { uri: URI });
    const fetch = resource.fetch();
    expect(fetch instanceof Promise).toBe(true);

    await fetch;
});

/**
 * .stream()
 */

test.skip('resource.stream() - should return a stream', done => {
    const resource = new Resource(REGISTRY, { uri: URI });
    const strm = resource.stream();
    expect(strm instanceof stream).toBe(true);
    strm.on('end', done);
    strm.on('error', done);
});

/**
 * .uri
 */

test('Resource().uri - instantiate new resource object - expose own uri', () => {
    const resource = new Resource(REGISTRY, { uri: URI });
    expect(resource.uri).toBe(URI);
});

/**
 * .name
 */

test('Resource().name - instantiate new resource object - expose own name', () => {
    const resource = new Resource(REGISTRY, { uri: URI, name: 'some-name' });
    expect(resource.name).toBe('some-name');
});
