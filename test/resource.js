'use strict';

const Resource = require('../lib/resource');
const stream = require('readable-stream');
const test = require('ava');
const LRU = require('lru-cache');

const REGISTRY = LRU({
    max: 20
});
const URI = 'http://example.org';


test('resource - new Resource() - set "registry" - should be persisted on "this.registry"', t => {
    const resource = new Resource(REGISTRY, {uri: URI});
    t.is(resource.registry.max, 20);
});

test('resource - new Resource() - set "options.uri" - should be 20 items', t => {
    const resource = new Resource(REGISTRY, {uri: URI});
    t.is(resource.options.uri, URI);
});

test('resource - new Resource() - instantiate new resource object - should have "fetch" method', t => {
    const resource = new Resource(REGISTRY, {uri: URI});
    t.true(typeof resource.fetch === 'function');
});

test('resource - new Resource() - instantiate new resource object - should have "stream" method', t => {
    const resource = new Resource(REGISTRY, {uri: URI});
    t.true(typeof resource.stream === 'function');
});

test('resource - .fetch() - should return a promise', t => {
    const resource = new Resource(REGISTRY, {uri: URI});
    const fetch = resource.fetch();
    t.true(fetch instanceof Promise);
});

test('resource - .stream() - should return a stream', t => {
    const resource = new Resource(REGISTRY, {uri: URI});
    const strm = resource.stream();
    t.true(strm instanceof stream);
});
