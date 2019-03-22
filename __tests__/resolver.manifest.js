/* eslint-disable import/order */

'use strict';

const HttpOutgoing = require('../lib/http-outgoing');
const Manifest = require('../lib/resolver.manifest');
const Client = require('../');
const Faker = require('../test/faker');
const lolex = require('lolex');

/**
 * NOTE I:
 * Cache control based on headers subract the time of the request
 * so we will not have an exact number to test on. Due to this, we
 * check if cache time are within a range.
 */

test('resolver.manifest() - object tag - should be PodletClientManifestResolver', () => {
    const manifest = new Manifest();
    expect(Object.prototype.toString.call(manifest)).toEqual(
        '[object PodletClientManifestResolver]',
    );
});

test('resolver.manifest() - "outgoing.manifest" holds a manifest - should resolve with same manifest', async () => {
    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: 'http://does.not.mather.com',
    });
    outgoing.manifest = { name: 'component' };

    await manifest.resolve(outgoing);

    expect(outgoing.manifest.name).toBe('component');
});

test('resolver.manifest() - remote has no cache header - should set outgoing.maxAge to default', async () => {
    const server = new Faker();
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.options.uri,
        maxAge: 40000,
    });

    await manifest.resolve(outgoing);

    expect(outgoing.maxAge).toBe(40000);

    await server.close();
});

test('resolver.manifest() - remote has "cache-control: public, max-age=10" header - should set outgoing.maxAge to header value', async () => {
    const server = new Faker();
    const service = await server.listen();
    server.headersManifest = {
        'cache-control': 'public, max-age=10',
    };

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.options.uri,
        maxAge: 40000,
    });

    await manifest.resolve(outgoing);

    // See NOTE I for details
    expect(outgoing.maxAge < 11000 && outgoing.maxAge > 8500).toBeTruthy();

    await server.close();
});

test('resolver.manifest() - remote has "cache-control: no-cache" header - should set outgoing.maxAge to default', async () => {
    const server = new Faker();
    const service = await server.listen();
    server.headersManifest = {
        'cache-control': 'no-cache',
    };

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.options.uri,
        maxAge: 40000,
    });

    await manifest.resolve(outgoing);

    expect(outgoing.maxAge).toBe(40000);

    await server.close();
});

test('resolver.manifest() - remote has "expires" header - should set outgoing.maxAge to header value', async () => {
    const clock = lolex.install();

    const server = new Faker();
    const service = await server.listen();

    // Set expire header time to two hours into future
    server.headersManifest = {
        expires: new Date(Date.now() + 1000 * 60 * 60 * 2).toUTCString(),
    };

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.options.uri,
        maxAge: 40000,
    });

    await manifest.resolve(outgoing);

    expect(outgoing.maxAge).toBe(1000 * 60 * 60 * 2); // 2 hours

    await server.close();
    clock.uninstall();
});

test('resolver.manifest() - one remote has "expires" header second none - should set and timout one and use default for second', async () => {
    const clock = lolex.install();

    const serverA = new Faker({
        name: 'aa',
    });
    const serverB = new Faker({
        name: 'bb',
    });

    const serviceA = await serverA.listen();
    const serviceB = await serverB.listen();

    // Set expires by http headers two hours into future
    serverA.headersManifest = {
        expires: new Date(Date.now() + 1000 * 60 * 60 * 2).toUTCString(),
    };

    // Set default expires four hours into future
    const client = new Client({ maxAge: 1000 * 60 * 60 * 4 });
    const a = client.register(serviceA.options);
    const b = client.register(serviceB.options);

    await a.fetch({});
    await b.fetch({});

    expect(serverA.metrics.manifest).toEqual(1);
    expect(serverB.metrics.manifest).toEqual(1);

    // Tick clock three hours into future
    clock.tick(1000 * 60 * 60 * 3);

    await a.fetch({});
    await b.fetch({});

    // Cache for server A should now have timed out
    expect(serverA.metrics.manifest).toEqual(2);
    expect(serverB.metrics.manifest).toEqual(1);

    await serverA.close();
    await serverB.close();
    clock.uninstall();
});

test('resolver.manifest() - remote can not be resolved - "outgoing.manifest" should be {_fallback: ""}', async () => {
    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: 'http://does.not.exist.finn.no/manifest.json',
        throwable: false,
    });

    await manifest.resolve(outgoing);
    expect(outgoing.manifest).toEqual({ _fallback: '' });
});

test('resolver.manifest() - remote responds with http 500 - "outgoing.manifest" should be {_fallback: ""}', async () => {
    const server = new Faker();
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.error,
        throwable: false,
    });

    await manifest.resolve(outgoing);
    expect(outgoing.manifest).toEqual({ _fallback: '' });

    await server.close();
});

test('resolver.manifest() - manifest is not valid - "outgoing.manifest" should be {_fallback: ""}', async () => {
    const server = new Faker();
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.content,
        throwable: false,
    });

    await manifest.resolve(outgoing);
    expect(outgoing.manifest).toEqual({ _fallback: '' });

    await server.close();
});

test('resolver.manifest() - "content" in manifest is relative - "outgoing.manifest.content" should be absolute', async () => {
    const server = new Faker();
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
    });

    await manifest.resolve(outgoing);
    expect(outgoing.manifest.content).toEqual(service.content);

    await server.close();
});

test('resolver.manifest() - "content" in manifest is absolute - "outgoing.manifest.content" should be absolute', async () => {
    const server = new Faker({
        content: 'http://does.not.mather.com',
    });
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
    });

    await manifest.resolve(outgoing);
    expect(outgoing.manifest.content).toEqual('http://does.not.mather.com');

    await server.close();
});

test('resolver.manifest() - "fallback" in manifest is relative - "outgoing.manifest.fallback" should be absolute', async () => {
    const server = new Faker({
        fallback: '/fallback.html',
    });

    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
    });

    await manifest.resolve(outgoing);
    expect(outgoing.manifest.fallback).toEqual(`${service.address}/fallback.html`);

    await server.close();
});

test('resolver.manifest() - "fallback" in manifest is absolute - "outgoing.manifest.fallback" should be absolute', async () => {
    const server = new Faker({
        fallback: 'http://does.not.mather.com',
    });
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
    });

    await manifest.resolve(outgoing);
    expect(outgoing.manifest.fallback).toEqual('http://does.not.mather.com');

    await server.close();
});

test('resolver.manifest() - "css" in manifest is relative, "resolveCss" is unset - "outgoing.manifest.assets.css" should be relative', async () => {
    const server = new Faker({ assets: { css: 'a.css' } });
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
    });

    await manifest.resolve(outgoing);
    expect(outgoing.manifest.assets.css).toEqual(server.assets.css);

    await server.close();
});

test('resolver.manifest() - "css" in manifest is relative, "resolveCss" is "true" - "outgoing.manifest.assets.css" should be absolute to podlet', async () => {
    const server = new Faker({ assets: { css: 'a.css' } });
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
        resolveCss: true,
    });

    await manifest.resolve(outgoing);
    expect(outgoing.manifest.assets.css).toEqual(
        `${service.address}/${server.assets.css}`,
    );

    await server.close();
});

test('resolver.manifest() - "css" in manifest is absolute, "resolveCss" is "true" - "outgoing.manifest.assets.css" should be absolute to whats in manifest', async () => {
    const server = new Faker({
        assets: { css: 'http://does.not.mather.com/a.css' },
    });
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
        resolveCss: true,
    });

    await manifest.resolve(outgoing);
    expect(outgoing.manifest.assets.css).toEqual(
        'http://does.not.mather.com/a.css',
    );

    await server.close();
});

test('resolver.manifest() - "js" in manifest is relative, "resolveJs" is unset - "outgoing.manifest.assets.js" should be relative', async () => {
    const server = new Faker({ assets: { js: 'a.js' } });
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
    });

    await manifest.resolve(outgoing);
    expect(outgoing.manifest.assets.js).toEqual(server.assets.js);

    await server.close();
});

test('resolver.manifest() - "js" in manifest is relative, "resolveJs" is "true" - "outgoing.manifest.assets.js" should be absolute to podlet', async () => {
    const server = new Faker({ assets: { js: 'a.js' } });
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
        resolveJs: true,
    });

    await manifest.resolve(outgoing);
    expect(outgoing.manifest.assets.js).toEqual(
        `${service.address}/${server.assets.js}`,
    );

    await server.close();
});

test('resolver.manifest() - "js" in manifest is absolute, "resolveJs" is "true" - "outgoing.manifest.assets.js" should be absolute to whats in manifest', async () => {
    const server = new Faker({
        assets: { js: 'http://does.not.mather.com/a.js' },
    });
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
        resolveJs: true,
    });

    await manifest.resolve(outgoing);
    expect(outgoing.manifest.assets.js).toEqual('http://does.not.mather.com/a.js');

    await server.close();
});

test('resolver.manifest() - a "proxy" target in manifest is relative - should convert it to be absolute', async () => {
    const server = new Faker({
        proxy: {
            foo: '/api/foo',
        },
    });
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
    });

    await manifest.resolve(outgoing);
    expect(outgoing.manifest.proxy.foo).toEqual(`${service.address}/api/foo`);

    await server.close();
});

test('resolver.manifest() - a "proxy" target in manifest is absolute - should keep it absolute', async () => {
    const server = new Faker({
        proxy: {
            bar: 'http://does.not.mather.com/api/bar',
        },
    });
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
    });

    await manifest.resolve(outgoing);
    expect(outgoing.manifest.proxy.bar).toEqual(
        'http://does.not.mather.com/api/bar',
    );

    await server.close();
});

test('resolver.manifest() - "proxy" targets in manifest is both absolute and relative - should keep absolute URIs and alter relative URIs', async () => {
    const server = new Faker({
        proxy: {
            bar: 'http://does.not.mather.com/api/bar',
            foo: '/api/foo',
        },
    });
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
    });

    await manifest.resolve(outgoing);
    expect(outgoing.manifest.proxy.bar).toEqual(
        'http://does.not.mather.com/api/bar',
    );
    expect(outgoing.manifest.proxy.foo).toEqual(`${service.address}/api/foo`);

    await server.close();
});
