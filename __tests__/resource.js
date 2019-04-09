/* eslint-disable import/order */

'use strict';

/* eslint no-unused-vars: "off" */

const getStream = require('get-stream');
const stream = require('readable-stream');
const Cache = require('ttl-mem-cache');

const Resource = require('../lib/resource');
const State = require('../lib/state');
const Faker = require('../test/faker');
const Client = require('../');

// const REGISTRY = new Cache();
const URI = 'http://example.org';

/**
 * Constructor
 */

test('Resource() - object tag - should be PodletClientResource', () => {
    const resource = new Resource(new Cache(), new State(), { uri: URI });
    expect(Object.prototype.toString.call(resource)).toEqual(
        '[object PodiumClientResource]',
    );
});

test('Resource() - no "registry" - should throw', () => {
    expect.hasAssertions();
    expect(() => {
        const resource = new Resource();
    }).toThrowError(
        'you must pass a "registry" object to the PodiumClientResource constructor',
    );
});

test('Resource() - instantiate new resource object - should have "fetch" method', () => {
    const resource = new Resource(new Cache(), new State(), { uri: URI });
    expect(resource.fetch).toBeInstanceOf(Function);
});

test('Resource() - instantiate new resource object - should have "stream" method', () => {
    const resource = new Resource(new Cache(), new State(), { uri: URI });
    expect(resource.stream).toBeInstanceOf(Function);
});

/**
 * .fetch()
 */

test('resource.fetch() - should return a promise', async () => {
    const server = new Faker({ version: '1.0.0' });
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
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
            'http://www.example.org',
        );
    });

    const resource = new Resource(new Cache(), new State(), service.options);
    await resource.fetch({
        'podium-locale': 'nb-NO',
        'podium-mount-origin': 'http://www.example.org',
    });

    await server.close();
});

test('resource.fetch() - returns an object with content, headers, js and css keys', async () => {
    expect.assertions(1);

    const server = new Faker({
        assets: { js: 'http://fakejs.com', css: 'http://fakecss.com' },
    });
    const service = await server.listen();
    const resource = new Resource(new Cache(), new State(), service.options);

    const result = await resource.fetch({});
    result.headers.date = '<replaced>';

    expect(result).toEqual({
        content: '<p>content component</p>',
        js: 'http://fakejs.com',
        css: 'http://fakecss.com',
        headers: {
            connection: 'close',
            'content-length': '24',
            'content-type': 'text/html; charset=utf-8',
            date: '<replaced>',
            'podlet-version': '1.0.0',
        },
    });

    await server.close();
});

test('resource.fetch() - returns empty strings for js and css when no assets are present in manifest', async () => {
    expect.assertions(1);

    const server = new Faker();
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
    const result = await resource.fetch({});
    result.headers.date = '<replaced>';

    expect(result).toEqual({
        content: '<p>content component</p>',
        js: '',
        css: '',
        headers: {
            connection: 'close',
            'content-length': '24',
            'content-type': 'text/html; charset=utf-8',
            date: '<replaced>',
            'podlet-version': '1.0.0',
        },
    });

    await server.close();
});

/**
 * .stream()
 */

test('resource.stream() - should return a stream', async () => {
    const server = new Faker({ version: '1.0.0' });
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
    const strm = resource.stream({});
    expect(strm).toBeInstanceOf(stream);

    await getStream(strm);

    await server.close();
});

test('resource.stream() - should emit beforeStream event with no assets', async () => {
    expect.assertions(3);

    const server = new Faker({ version: '1.0.0' });
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
    const strm = resource.stream({});
    strm.once('beforeStream', ({ headers, js, css }) => {
        expect(headers['podlet-version']).toEqual('1.0.0');
        expect(js).toEqual('');
        expect(css).toEqual('');
    });

    await getStream(strm);

    await server.close();
});

test('resource.stream() - should emit js event when js assets defined', async () => {
    expect.assertions(1);

    const server = new Faker({ assets: { js: 'http://fakejs.com' } });
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
    const strm = resource.stream({});
    strm.once('beforeStream', ({ js }) => {
        expect(js).toEqual('http://fakejs.com');
    });

    await getStream(strm);

    await server.close();
});

test('resource.stream() - should emit css event when css assets defined', async () => {
    expect.assertions(1);

    const server = new Faker({ assets: { css: 'http://fakecss.com' } });
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
    const strm = resource.stream({});
    strm.once('beforeStream', ({ css }) => {
        expect(css).toEqual('http://fakecss.com');
    });

    await getStream(strm);

    await server.close();
});

test('resource.stream() - should emit beforeStream event before emitting data', async () => {
    expect.assertions(3);

    const server = new Faker({
        assets: { js: 'http://fakejs.com', css: 'http://fakecss.com' },
    });
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
    const strm = resource.stream({});
    const items = [];

    strm.once('beforeStream', beforeStream => {
        items.push(beforeStream);
    });
    strm.on('data', data => {
        items.push(data.toString());
    });

    await getStream(strm);

    expect(items[0].css).toBe('http://fakecss.com');
    expect(items[0].js).toBe('http://fakejs.com');
    expect(items[1]).toBe('<p>content component</p>');

    await server.close();
});

/**
 * .refresh()
 */

test('resource.refresh() - should return a promise', async () => {
    const server = new Faker({ version: '1.0.0' });
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
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
    const resource = new Resource(new Cache(), new State(), { uri: URI });
    expect(resource.uri).toBe(URI);
});

/**
 * .name
 */

test('Resource().name - instantiate new resource object - expose own name', () => {
    const resource = new Resource(new Cache(), new State(), { uri: URI, name: 'someName' });
    expect(resource.name).toBe('someName');
});
