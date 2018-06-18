'use strict';

/* eslint no-unused-vars: "off" */

const Resource = require('../lib/resource');
const Faker = require('../test/faker');
const stream = require('stream');
const Cache = require('ttl-mem-cache');
const getStream = require('get-stream');
const Client = require('../');

// const REGISTRY = new Cache();
const URI = 'http://example.org';

/**
 * Constructor
 */

test('Resource() - object tag - should be PodletClientResource', () => {
    const resource = new Resource(new Cache(), { uri: URI });
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
    const resource = new Resource(new Cache(), { uri: URI });
    expect(resource.options.uri).toBe(URI);
});

test('Resource() - instantiate new resource object - should have "fetch" method', () => {
    const resource = new Resource(new Cache(), { uri: URI });
    expect(resource.fetch).toBeInstanceOf(Function);
});

test('Resource() - instantiate new resource object - should have "stream" method', () => {
    const resource = new Resource(new Cache(), { uri: URI });
    expect(resource.stream).toBeInstanceOf(Function);
});

/**
 * .fetch()
 */

test('resource.fetch() - should return a promise', async () => {
    const server = new Faker({ version: '1.0.0' });
    const service = await server.listen();

    const resource = new Resource(new Cache(), service.options);
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

    const resource = new Resource(new Cache(), service.options);
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

    const resource = new Resource(new Cache(), service.options);
    const strm = resource.stream({});
    expect(strm).toBeInstanceOf(stream);

    await getStream(strm);

    await server.close();
});

/**
 * .refresh()
 */

test('resource.refresh() - should return a promise', async () => {
    const server = new Faker({ version: '1.0.0' });
    const service = await server.listen();

    const resource = new Resource(new Cache(), service.options);
    const refresh = resource.refresh();
    expect(refresh).toBeInstanceOf(Promise);

    await refresh;

    await server.close();
});

test('resource.refresh() - manifest is available - should return "true"', async () => {
    const server = new Faker({ version: '1.0.0' });
    const service = await server.listen();

    const client = new Client();
    const component = client.register(service.options);

    const result = await component.refresh();

    expect(result).toBe(true);

    await server.close();
});

test('resource.refresh() - manifest is NOT available - should return "false"', async () => {
    const client = new Client();

    const component = client.register({
        name: 'component',
        uri: 'http://does.not.exist.finn.no/manifest.json',
    });

    const result = await component.refresh();

    expect(result).toBe(false);
});

test('resource.refresh() - manifest with fallback is available - should get manifest and fallback, but not content', async () => {
    const server = new Faker({ version: '1.0.0' });
    const service = await server.listen();

    server.fallback = `${service.address}/fallback.html`;

    const client = new Client();
    const component = client.register(service.options);

    await component.refresh();

    expect(server.metrics.manifest).toBe(1);
    expect(server.metrics.fallback).toBe(1);
    expect(server.metrics.content).toBe(0);

    await server.close();
});

/**
 * .uri
 */

test('Resource().uri - instantiate new resource object - expose own uri', () => {
    const resource = new Resource(new Cache(), { uri: URI });
    expect(resource.uri).toBe(URI);
});

/**
 * .name
 */

test('Resource().name - instantiate new resource object - expose own name', () => {
    const resource = new Resource(new Cache(), { uri: URI, name: 'someName' });
    expect(resource.name).toBe('someName');
});
