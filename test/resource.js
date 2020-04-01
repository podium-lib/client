/* eslint-disable import/order */

'use strict';

/* eslint no-unused-vars: "off" */

const { test } = require('tap');
const getStream = require('get-stream');
const stream = require('readable-stream');
const Cache = require('ttl-mem-cache');

const Resource = require('../lib/resource');
const State = require('../lib/state');
const { PodletServer } = require('@podium/test-utils');
const Client = require("..");

const URI = 'http://example.org';

/**
 * Constructor
 */

test('Resource() - object tag - should be PodletClientResource', t => {
    const resource = new Resource(new Cache(), new State(), { uri: URI });
    t.equal(
        Object.prototype.toString.call(resource),
        '[object PodiumClientResource]',
    );
    t.end();
});

test('Resource() - no "registry" - should throw', t => {
    t.throws(() => {
        const resource = new Resource();
    }, 'you must pass a "registry" object to the PodiumClientResource constructor');
    t.end();
});

test('Resource() - instantiate new resource object - should have "fetch" method', t => {
    const resource = new Resource(new Cache(), new State(), { uri: URI });
    t.ok(resource.fetch instanceof Function);
    t.end();
});

test('Resource() - instantiate new resource object - should have "stream" method', t => {
    const resource = new Resource(new Cache(), new State(), { uri: URI });
    t.ok(resource.stream instanceof Function);
    t.end();
});

/**
 * .fetch()
 */

test('resource.fetch() - should return a promise', async t => {
    const server = new PodletServer({ version: '1.0.0' });
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
    const fetch = resource.fetch({});
    t.ok(fetch instanceof Promise);

    await fetch;

    await server.close();
    t.end();
});

test('resource.fetch(podiumContext) - should pass it on', async t => {
    t.plan(2);

    const server = new PodletServer({ version: '1.0.0' });
    const service = await server.listen();
    server.on('req:content', (count, req) => {
        t.equal(req.headers['podium-locale'], 'nb-NO');
        t.equal(req.headers['podium-mount-origin'], 'http://www.example.org');
    });

    const resource = new Resource(new Cache(), new State(), service.options);
    await resource.fetch({
        'podium-locale': 'nb-NO',
        'podium-mount-origin': 'http://www.example.org',
    });

    await server.close();
    t.end();
});

test('resource.fetch() - returns an object with content, headers, js and css keys', async t => {
    const server = new PodletServer({
        assets: { js: 'http://fakejs.com', css: 'http://fakecss.com' },
    });
    const service = await server.listen();
    const resource = new Resource(new Cache(), new State(), service.options);

    const result = await resource.fetch({});
    result.headers.date = '<replaced>';

    t.equal(result.content, '<p>content component</p>');
    t.same(result.headers, {
        connection: 'close',
        'content-length': '24',
        'content-type': 'text/html; charset=utf-8',
        date: '<replaced>',
        'podlet-version': '1.0.0',
    });
    t.same(result.css, [
        {
            type: 'text/css',
            value: 'http://fakecss.com',
        },
    ]);
    t.same(result.js, [
        {
            type: 'default',
            value: 'http://fakejs.com',
        },
    ]);

    await server.close();
    t.end();
});

test('resource.fetch() - returns empty array for js and css when no assets are present in manifest', async t => {
    const server = new PodletServer();
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
    const result = await resource.fetch({});
    result.headers.date = '<replaced>';

    t.equal(result.content, '<p>content component</p>');
    t.same(result.headers, {
        connection: 'close',
        'content-length': '24',
        'content-type': 'text/html; charset=utf-8',
        date: '<replaced>',
        'podlet-version': '1.0.0',
    });
    t.same(result.css, []);
    t.same(result.js, []);

    await server.close();
    t.end();
});

test('resource.fetch() - redirectable flag - podlet responds with 302 redirect - redirect property is populated', async t => {
    const server = new PodletServer();
    server.headersContent = {
        location: 'http://redirects.are.us.com',
    };
    server.statusCode = 302;
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), {
        ...service.options,
        redirectable: true,
    });
    const result = await resource.fetch({});
    result.headers.date = '<replaced>';

    t.equal(result.content, '');
    t.same(result.headers, {
        connection: 'close',
        'content-length': '24',
        'content-type': 'text/html; charset=utf-8',
        date: '<replaced>',
        'podlet-version': '1.0.0',
        location: 'http://redirects.are.us.com',
    });
    t.same(result.redirect, {
        statusCode: 302,
        location: 'http://redirects.are.us.com',
    });
    t.same(result.css, []);
    t.same(result.js, []);

    await server.close();
    t.end();
});

/**
 * .stream()
 */

test('resource.stream() - should return a stream', async t => {
    const server = new PodletServer({ version: '1.0.0' });
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
    const strm = resource.stream({});
    t.ok(strm instanceof stream);

    await getStream(strm);

    await server.close();
    t.end();
});

test('resource.stream() - should emit beforeStream event with no assets', async t => {
    t.plan(3);

    const server = new PodletServer({ version: '1.0.0' });
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
    const strm = resource.stream({});
    strm.once('beforeStream', ({ headers, js, css }) => {
        t.equal(headers['podlet-version'], '1.0.0');
        t.same(js, []);
        t.same(css, []);
    });

    await getStream(strm);

    await server.close();
    t.end();
});

test('resource.stream() - should emit js event when js assets defined', async t => {
    t.plan(1);

    const server = new PodletServer({ assets: { js: 'http://fakejs.com' } });
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
    const strm = resource.stream({});
    strm.once('beforeStream', ({ js }) => {
        t.same(js, [{ type: 'default', value: 'http://fakejs.com' }]);
    });

    await getStream(strm);

    await server.close();
    t.end();
});

test('resource.stream() - should emit css event when css assets defined', async t => {
    t.plan(1);

    const server = new PodletServer({ assets: { css: 'http://fakecss.com' } });
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
    const strm = resource.stream({});
    strm.once('beforeStream', ({ css }) => {
        t.same(css, [{ type: 'text/css', value: 'http://fakecss.com' }]);
    });

    await getStream(strm);

    await server.close();
    t.end();
});

test('resource.stream() - should emit beforeStream event before emitting data', async t => {
    const server = new PodletServer({
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

    t.same(items[0].css, [{ type: 'text/css', value: 'http://fakecss.com' }]);
    t.same(items[0].js, [{ type: 'default', value: 'http://fakejs.com' }]);
    t.equal(items[1], '<p>content component</p>');

    await server.close();
    t.end();
});

/**
 * .refresh()
 */

test('resource.refresh() - should return a promise', async t => {
    const server = new PodletServer({ version: '1.0.0' });
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
    const refresh = resource.refresh();
    t.ok(refresh instanceof Promise);

    await refresh;

    await server.close();
    t.end();
});

test('resource.refresh() - manifest is available - should return "true"', async t => {
    const server = new PodletServer({ version: '1.0.0' });
    const service = await server.listen();

    const client = new Client({ name: 'podiumClient' });
    const component = client.register(service.options);

    const result = await component.refresh();

    t.equal(result, true);

    await server.close();
    t.end();
});

test('resource.refresh() - manifest is NOT available - should return "false"', async t => {
    const client = new Client({ name: 'podiumClient' });

    const component = client.register({
        name: 'component',
        uri: 'http://does.not.exist.finn.no/manifest.json',
    });

    const result = await component.refresh();

    t.equal(result, false);
    t.end();
});

test('resource.refresh() - manifest with fallback is available - should get manifest and fallback, but not content', async t => {
    const server = new PodletServer({ version: '1.0.0' });
    const service = await server.listen();

    const client = new Client({ name: 'podiumClient' });
    const component = client.register(service.options);

    await component.refresh();

    t.equal(server.metrics.manifest, 1);
    t.equal(server.metrics.fallback, 1);
    t.equal(server.metrics.content, 0);

    await server.close();
    t.end();
});

/**
 * .uri
 */

test('Resource().uri - instantiate new resource object - expose own uri', t => {
    const resource = new Resource(new Cache(), new State(), { uri: URI });
    t.equal(resource.uri, URI);
    t.end();
});

/**
 * .name
 */

test('Resource().name - instantiate new resource object - expose own name', t => {
    const resource = new Resource(new Cache(), new State(), {
        uri: URI,
        name: 'someName',
    });
    t.equal(resource.name, 'someName');
    t.end();
});
