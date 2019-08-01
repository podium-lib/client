'use strict';

const { PodletServer } = require('@podium/test-utils');
const HttpOutgoing = require('../lib/http-outgoing');
const Manifest = require('../lib/resolver.manifest');
const Client = require('../');

// NB; these tests are here only to test compatibility between
// V3 and V4 manifest changes. Can be removed when V3 manifest
// support is removed.

test('compatibility - default manifest from V4 podlet - v4 + v3 compatibility manifest - should be values on .js and .css in returned content Object', async () => {
    const server = new PodletServer({
        assets: {
            css: 'bar.css',
            js: 'foo.js',
        }
    });
    const service = await server.listen();

    const client = new Client({
        name: 'aa',
    });

    const podlet = client.register(service.options);
    const content = await podlet.fetch({});

    expect(content.css).toEqual([{ type: 'default', value: `${service.address}/bar.css` }]);
    expect(content.js).toEqual([{ type: 'default', value: `${service.address}/foo.js` }]);

    expect(client.css()).toEqual(['bar.css']);
    expect(client.js()).toEqual(['foo.js']);

    await server.close();
});

test('compatibility - v3 manifest - should be values on .js and .css in returned content Object', async () => {
    const server = new PodletServer();
    server.manifestBody = JSON.stringify({
        name: 'component',
        version: '1.0.0',
        content: '/index.html',
        fallback: '/fallback.html',
        assets: { js: 'foo.js', css: 'bar.css' },
        proxy: {},
        team: ''
    });
    const service = await server.listen();

    const client = new Client({
        name: 'aa',
    });

    const podlet = client.register(service.options);
    const content = await podlet.fetch({});

    expect(content.css).toEqual([{ type: 'module', value: `${service.address}/bar.css` }]);
    expect(content.js).toEqual([{ type: 'module', value: `${service.address}/foo.js` }]);

    expect(client.css()).toEqual(['bar.css']);
    expect(client.js()).toEqual(['foo.js']);

    await server.close();
});

test('compatibility - v4 manifest - should be values on .js and .css in returned content Object', async () => {
    const server = new PodletServer();
    server.manifestBody = JSON.stringify({
        name: 'component',
        version: '1.0.0',
        content: '/index.html',
        fallback: '/fallback.html',
        css: [{ value: 'bar.css', type: 'module' }],
        js: [{ value: 'foo.js', type: 'module' }],
        proxy: {},
        team: ''
    });
    const service = await server.listen();

    const client = new Client({
        name: 'aa',
    });

    const podlet = client.register(service.options);
    const content = await podlet.fetch({});

    expect(content.css).toEqual([{ type: 'module', value: `${service.address}/bar.css` }]);
    expect(content.js).toEqual([{ type: 'module', value: `${service.address}/foo.js` }]);

    expect(client.css()).toEqual(['bar.css']);
    expect(client.js()).toEqual(['foo.js']);

    await server.close();
});


// The following tests was moved from resolver.manifest to
// keep testing backwards compatibility
// These tests can be removed when V3 manifest is no longer
// supported.
test('compatibility - resolver.manifest() - "css" in manifest is relative, "resolveCss" is "true" - "outgoing.manifest.assets.css" should be absolute to podlet', async () => {
    const server = new PodletServer({ assets: { css: 'a.css' } });
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

test('compatibility - resolver.manifest() - "css" in manifest is absolute, "resolveCss" is "true" - "outgoing.manifest.assets.css" should be absolute to whats in manifest', async () => {
    const server = new PodletServer({
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

test('compatibility - resolver.manifest() - "js" in manifest is relative, "resolveJs" is unset - "outgoing.manifest.assets.js" should be relative', async () => {
    const server = new PodletServer({ assets: { js: 'a.js' } });
    const service = await server.listen();

    const manifest = new Manifest();
    const outgoing = new HttpOutgoing({
        uri: service.manifest,
    });

    await manifest.resolve(outgoing);
    expect(outgoing.manifest.assets.js).toEqual(server.assets.js);

    await server.close();
});

test('compatibility - resolver.manifest() - "js" in manifest is relative, "resolveJs" is "true" - "outgoing.manifest.assets.js" should be absolute to podlet', async () => {
    const server = new PodletServer({ assets: { js: 'a.js' } });
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

test('compatibility - resolver.manifest() - "js" in manifest is absolute, "resolveJs" is "true" - "outgoing.manifest.assets.js" should be absolute to whats in manifest', async () => {
    const server = new PodletServer({
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
