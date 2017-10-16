'use strict';

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
    const server = new Faker({ version: '1.0.0' });
    server.answerWithHeaders = true;
    const service = await server.listen();

    const resource = new Resource(REGISTRY, service.options);
    const response = JSON.parse(
        await resource.fetch({
            token: 'jwt',
            resourceMountPath: '/podium-resource',
        })
    );

    expect(response['podium-token']).toBe('jwt');
    expect(response['podium-resource-mount-path']).toBe(
        '/podium-resource/component'
    );

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
    const resource = new Resource(REGISTRY, { uri: URI, name: 'some-name' });
    expect(resource.name).toBe('some-name');
});
