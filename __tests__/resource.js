'use strict';

/* eslint no-unused-vars: "off" */

const Resource = require('../lib/resource');
const Faker = require('../test/faker');
const stream = require('stream');
const Cache = require('ttl-mem-cache');
const getStream = require('get-stream');

const REGISTRY = new Cache();
const URI = 'http://example.org';

/**
 * Constructor
 */

test('Resource() - object tag - should be PodletClientResource', () => {
    const resource = new Resource(REGISTRY, { uri: URI });
    expect(Object.prototype.toString.call(resource)).toEqual(
        '[object PodletClientResource]'
    );
});

test('Resource() - no "registry" - should throw', () => {
    expect.hasAssertions();
    expect(() => {
        const resource = new Resource();
    }).toThrowError(
        'you must pass a "registry" object to the PodletClientResource constructor'
    );
});

test('Resource() - set "options.uri" - should set value on "this.options.uri"', () => {
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

test('resource.fetch() - should return a promise', async () => {
    const server = new Faker({ version: '1.0.0' });
    const service = await server.listen();

    const resource = new Resource(REGISTRY, service.options);
    const fetch = resource.fetch({});
    expect(fetch).toBeInstanceOf(Promise);

    await fetch;

    await server.close();
});

test('resource.fetch(podiumContext) - should pass it on', async () => {
    expect.assertions(2);

    const server = new Faker({ version: '1.0.0' });
    const service = await server.listen();
    server.on('req:content', (count, req) => {
        expect(req.headers['podium-locale']).toBe('nb-NO');
        expect(req.headers['podium-mount-origin']).toBe(
            'http://www.example.org'
        );
    });

    const resource = new Resource(REGISTRY, service.options);
    await resource.fetch({
        'podium-locale': 'nb-NO',
        'podium-mount-origin': 'http://www.example.org',
    });

    await server.close();
});

/**
 * .stream()
 */

test('resource.stream() - should return a stream', async () => {
    const server = new Faker({ version: '1.0.0' });
    const service = await server.listen();

    const resource = new Resource(REGISTRY, service.options);
    const strm = resource.stream({});
    expect(strm).toBeInstanceOf(stream);

    await getStream(strm);

    await server.close();
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
    const resource = new Resource(REGISTRY, { uri: URI, name: 'someName' });
    expect(resource.name).toBe('someName');
});
