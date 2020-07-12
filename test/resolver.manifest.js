/* eslint-disable import/order */

'use strict';

const { test } = require('tap');
const { PodletServer } = require('@podium/test-utils');
const { HttpIncoming } = require('@podium/utils');
const HttpOutgoing = require('../lib/http-outgoing');
const Manifest = require('../lib/resolver.manifest');
const Client = require("..");
const lolex = require('@sinonjs/fake-timers');

// Fake headers
const headers = {};


/**
 * NOTE I:
 * Cache control based on headers subract the time of the request
 * so we will not have an exact number to test on. Due to this, we
 * check if cache time are within a range.
 */

test('resolver.manifest() - object tag - should be PodletClientManifestResolver', t => {
    const manifest = new Manifest();
    t.equal(
        Object.prototype.toString.call(manifest),
        '[object PodletClientManifestResolver]',
    );
    t.end();
});

test('resolver.manifest() - "outgoing.manifest" holds a manifest - should resolve with same manifest', async t => {
    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: 'http://does.not.mather.com',
    }, {}, new HttpIncoming({ headers }));
    outgoing.manifest = { name: 'component' };

    await manifest.resolve(outgoing);

    t.equal(outgoing.manifest.name, 'component');
    t.end();
});

test('resolver.manifest() - remote has no cache header - should set outgoing.maxAge to default', async t => {
    const server = new PodletServer();
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.options.uri,
        maxAge: 40000,
    }, {}, new HttpIncoming({ headers }));

    await manifest.resolve(outgoing);

    t.equal(outgoing.maxAge, 40000);

    await server.close();
    t.end();
});

test('resolver.manifest() - remote has "cache-control: public, max-age=10" header - should set outgoing.maxAge to header value', async t => {
    const server = new PodletServer();
    const service = await server.listen();
    server.headersManifest = {
        'cache-control': 'public, max-age=10',
    };

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.options.uri,
        maxAge: 40000,
    }, {}, new HttpIncoming({ headers }));

    await manifest.resolve(outgoing);

    // See NOTE I for details
    t.ok(outgoing.maxAge < 11000 && outgoing.maxAge > 8500);

    await server.close();
    t.end();
});

test('resolver.manifest() - remote has "cache-control: no-cache" header - should set outgoing.maxAge to default', async t => {
    const server = new PodletServer();
    const service = await server.listen();
    server.headersManifest = {
        'cache-control': 'no-cache',
    };

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.options.uri,
        maxAge: 40000,
    }, {}, new HttpIncoming({ headers }));

    await manifest.resolve(outgoing);

    t.equal(outgoing.maxAge, 40000);

    await server.close();
    t.end();
});

test('resolver.manifest() - remote has "expires" header - should set outgoing.maxAge to header value', async t => {
    const server = new PodletServer();
    const service = await server.listen();

    // Set expire header time to two hours into future
    server.headersManifest = {
        expires: new Date(Date.now() + 7200000).toUTCString(),
    };

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.options.uri,
        maxAge: 40000,
    }, {}, new HttpIncoming({ headers }));

    await manifest.resolve(outgoing);

    t.ok(outgoing.maxAge <= 7200000 && outgoing.maxAge > 7195000); // 2 hours

    await server.close();
    t.end();
});

test('resolver.manifest() - one remote has "expires" header second none - should set and timout one and use default for second', async t => {
    const now = Date.now();
    const clock = lolex.install({ now });

    const serverA = new PodletServer({
        name: 'aa',
    });
    const serverB = new PodletServer({
        name: 'bb',
    });

    const serviceA = await serverA.listen();
    const serviceB = await serverB.listen();

    // Set expires by http headers two hours into future
    serverA.headersManifest = {
        expires: new Date(now + 1000 * 60 * 60 * 2).toUTCString(),
    };

    // Set default expires four hours into future
    const client = new Client({
        name: 'podiumClient',
        maxAge: 1000 * 60 * 60 * 4,
    });
    const a = client.register(serviceA.options);
    const b = client.register(serviceB.options);
    
    await a.fetch(new HttpIncoming({ headers }));
    await b.fetch(new HttpIncoming({ headers }));

    t.equal(serverA.metrics.manifest, 1);
    t.equal(serverB.metrics.manifest, 1);

    // Tick clock three hours into future
    clock.tick(1000 * 60 * 60 * 3);

    await a.fetch(new HttpIncoming({ headers }));
    await b.fetch(new HttpIncoming({ headers }));

    // Cache for server A should now have timed out
    t.equal(serverA.metrics.manifest, 2);
    t.equal(serverB.metrics.manifest, 1);

    await serverA.close();
    await serverB.close();
    clock.uninstall();
    t.end();
});

test('resolver.manifest() - remote can not be resolved - "outgoing.manifest" should be {_fallback: ""}', async t => {
    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: 'http://does.not.exist.finn.no/manifest.json',
        throwable: false,
    }, {}, new HttpIncoming({ headers }));

    await manifest.resolve(outgoing);
    t.same(outgoing.manifest, { _fallback: '' });
    t.end();
});

test('resolver.manifest() - remote responds with http 500 - "outgoing.manifest" should be {_fallback: ""}', async t => {
    const server = new PodletServer();
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.error,
        throwable: false,
    }, {}, new HttpIncoming({ headers }));

    await manifest.resolve(outgoing);
    t.same(outgoing.manifest, { _fallback: '' });

    await server.close();
    t.end();
});

test('resolver.manifest() - manifest is not valid - "outgoing.manifest" should be {_fallback: ""}', async t => {
    const server = new PodletServer();
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.content,
        throwable: false,
    }, {}, new HttpIncoming({ headers }));

    await manifest.resolve(outgoing);
    t.same(outgoing.manifest, { _fallback: '' });

    await server.close();
    t.end();
});

test('resolver.manifest() - "content" in manifest is relative - "outgoing.manifest.content" should be absolute', async t => {
    const server = new PodletServer();
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
    }, {}, new HttpIncoming({ headers }));

    await manifest.resolve(outgoing);
    t.same(outgoing.manifest.content, service.content);

    await server.close();
    t.end();
});

test('resolver.manifest() - "content" in manifest is absolute - "outgoing.manifest.content" should be absolute', async t => {
    const server = new PodletServer({
        content: 'http://does.not.mather.com',
    });
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
    }, {}, new HttpIncoming({ headers }));

    await manifest.resolve(outgoing);
    t.equal(outgoing.manifest.content, 'http://does.not.mather.com');

    await server.close();
    t.end();
});

test('resolver.manifest() - "fallback" in manifest is relative - "outgoing.manifest.fallback" should be absolute', async t => {
    const server = new PodletServer({
        fallback: '/fallback.html',
    });

    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
    }, {}, new HttpIncoming({ headers }));

    await manifest.resolve(outgoing);
    t.equal(outgoing.manifest.fallback, `${service.address}/fallback.html`);

    await server.close();
    t.end();
});

test('resolver.manifest() - "fallback" in manifest is absolute - "outgoing.manifest.fallback" should be absolute', async t => {
    const server = new PodletServer({
        fallback: 'http://does.not.mather.com',
    });
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
    }, {}, new HttpIncoming({ headers }));

    await manifest.resolve(outgoing);
    t.equal(outgoing.manifest.fallback, 'http://does.not.mather.com');

    await server.close();
    t.end();
});

test('resolver.manifest() - "css" in manifest is relative, "resolveCss" is unset - "outgoing.manifest.assets.css" should be relative', async t => {
    const server = new PodletServer({ assets: { css: 'a.css' } });
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
    }, {}, new HttpIncoming({ headers }));

    await manifest.resolve(outgoing);
    t.same(outgoing.manifest.assets.css, server.assets.css);

    await server.close();
    t.end();
});

test('resolver.manifest() - "css" in manifest is relative, "resolveCss" is "true" - "outgoing.manifest.assets.css" should be absolute to podlet', async t => {
    const server = new PodletServer({ assets: { css: 'a.css' } });
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
        resolveCss: true,
    }, {}, new HttpIncoming({ headers }));

    await manifest.resolve(outgoing);

    t.same(outgoing.manifest.css, [
        { value: `${service.address}/${server.assets.css}`, type: 'text/css' },
    ]);

    await server.close();
    t.end();
});

test('resolver.manifest() - "css" in manifest is absolute, "resolveCss" is "true" - "outgoing.manifest.assets.css" should be absolute to whats in manifest', async t => {
    const server = new PodletServer({
        assets: { css: 'http://does.not.mather.com/a.css' },
    });
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
        resolveCss: true,
    }, {}, new HttpIncoming({ headers }));

    await manifest.resolve(outgoing);

    t.same(outgoing.manifest.css, [
        { value: 'http://does.not.mather.com/a.css', type: 'text/css' },
    ]);

    await server.close();
    t.end();
});

test('resolver.manifest() - "js" in manifest is relative, "resolveJs" is unset - "outgoing.manifest.js" should be relative', async t => {
    const server = new PodletServer({ assets: { js: 'a.js' } });
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
    }, {}, new HttpIncoming({ headers }));

    await manifest.resolve(outgoing);

    t.same(outgoing.manifest.assets.js, server.assets.js);

    await server.close();
    t.end();
});

test('resolver.manifest() - "js" in manifest is relative, "resolveJs" is "true" - "outgoing.manifest.js" should be absolute to podlet', async t => {
    const server = new PodletServer({ assets: { js: 'a.js' } });
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
        resolveJs: true,
    }, {}, new HttpIncoming({ headers }));

    await manifest.resolve(outgoing);

    t.same(outgoing.manifest.js, [
        { value: `${service.address}/${server.assets.js}`, type: 'default' },
    ]);

    await server.close();
    t.end();
});

test('resolver.manifest() - "js" in manifest is absolute, "resolveJs" is "true" - "outgoing.manifest.js" should be absolute to whats in manifest', async t => {
    const server = new PodletServer({
        assets: { js: 'http://does.not.mather.com/a.js' },
    });
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
        resolveJs: true,
    }, {}, new HttpIncoming({ headers }));

    await manifest.resolve(outgoing);

    t.same(outgoing.manifest.js, [
        { value: 'http://does.not.mather.com/a.js', type: 'default' },
    ]);

    await server.close();
    t.end();
});

test('resolver.manifest() - a "proxy" target in manifest is relative - should convert it to be absolute', async t => {
    const server = new PodletServer({
        proxy: {
            foo: '/api/foo',
        },
    });
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
    }, {}, new HttpIncoming({ headers }));

    await manifest.resolve(outgoing);
    t.equal(outgoing.manifest.proxy.foo, `${service.address}/api/foo`);

    await server.close();
    t.end();
});

test('resolver.manifest() - a "proxy" target in manifest is absolute - should keep it absolute', async t => {
    const server = new PodletServer({
        proxy: {
            bar: 'http://does.not.mather.com/api/bar',
        },
    });
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
    }, {}, new HttpIncoming({ headers }));

    await manifest.resolve(outgoing);
    t.equal(outgoing.manifest.proxy.bar, 'http://does.not.mather.com/api/bar');

    await server.close();
    t.end();
});

test('resolver.manifest() - "proxy" targets in manifest is both absolute and relative - should keep absolute URIs and alter relative URIs', async t => {
    const server = new PodletServer({
        proxy: {
            bar: 'http://does.not.mather.com/api/bar',
            foo: '/api/foo',
        },
    });
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
    }, {}, new HttpIncoming({ headers }));

    await manifest.resolve(outgoing);
    t.equal(outgoing.manifest.proxy.bar, 'http://does.not.mather.com/api/bar');
    t.equal(outgoing.manifest.proxy.foo, `${service.address}/api/foo`);

    await server.close();
    t.end();
});
