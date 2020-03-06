/* eslint-disable import/order */

'use strict';

const { test } = require('tap');
const HttpOutgoing = require('../lib/http-outgoing');
const Content = require('../lib/resolver.content');
const utils = require('@podium/utils');
const { destinationBufferStream, PodletServer } = require('@podium/test-utils');

/**
 * TODO I:
 * If "outgoing.reqOptions.podiumContext" does not exist the content resolver throws a
 * "Cannot read property 'resourceMountPath' of undefined" error.
 * This is britle in the implementation. Harden.
 *
 * TODO II:
 * Resolving URI's should happen in outgoing object and not in manifest resolver.
 */

test('resolver.content() - object tag - should be PodletClientContentResolver', t => {
    const content = new Content();
    t.equal(
        Object.prototype.toString.call(content),
        '[object PodletClientContentResolver]',
    );
    t.end();
});

test('resolver.content() - "podlet-version" header is same as manifest.version - should keep manifest on outgoing.manifest', async t => {
    const server = new PodletServer();
    const service = await server.listen();
    const outgoing = new HttpOutgoing({ uri: service.options.uri });

    // See TODO II
    const { manifest } = server;
    manifest.content = utils.uriRelativeToAbsolute(
        server.manifest.content,
        outgoing.manifestUri,
    );

    outgoing.manifest = manifest;
    outgoing.status = 'cached';

    // See TODO I
    outgoing.reqOptions.podiumContext = {};

    const content = new Content();
    await content.resolve(outgoing);

    t.ok(outgoing.manifest);
    await server.close();
    t.end();
});

test('resolver.content() - "podlet-version" header is empty - should keep manifest on outgoing.manifest', async t => {
    const server = new PodletServer();
    const service = await server.listen();
    server.headersContent = {
        'podlet-version': '',
    };

    const outgoing = new HttpOutgoing({ uri: service.options.uri });

    // See TODO II
    const { manifest } = server;
    manifest.content = utils.uriRelativeToAbsolute(
        server.manifest.content,
        outgoing.manifestUri,
    );

    outgoing.manifest = manifest;
    outgoing.status = 'cached';

    // See TODO I
    outgoing.reqOptions.podiumContext = {};

    const content = new Content();
    await content.resolve(outgoing);

    t.ok(outgoing.manifest);
    await server.close();
    t.end();
});

test('resolver.content() - "podlet-version" header is different than manifest.version - should set outgoing.status to "stale" and keep manifest', async t => {
    const server = new PodletServer();
    const service = await server.listen();
    server.headersContent = {
        'podlet-version': '2.0.0',
    };

    const outgoing = new HttpOutgoing({ uri: service.options.uri });

    // See TODO II
    const { manifest } = server;
    manifest.content = utils.uriRelativeToAbsolute(
        server.manifest.content,
        outgoing.manifestUri,
    );

    outgoing.manifest = manifest;
    outgoing.status = 'cached';

    // See TODO I
    outgoing.reqOptions.podiumContext = {};

    const content = new Content();
    await content.resolve(outgoing);

    t.equal(outgoing.manifest.version, server.manifest.version);
    t.equal(outgoing.status, 'stale');
    await server.close();
    t.end();
});

test('resolver.content() - throwable:true - remote can not be resolved - should throw', async t => {
    t.plan(2);

    const outgoing = new HttpOutgoing({
        uri: 'http://does.not.exist.finn.no/manifest.json',
        throwable: true,
    });

    // See TODO I
    outgoing.reqOptions.podiumContext = {};

    outgoing.manifest = {
        content: 'http://does.not.exist.finn.no/index.html',
    };
    outgoing.status = 'cached';

    const content = new Content();

    try {
        await content.resolve(outgoing);
    } catch (error) {
        t.match(error.message, /Error reading content/);
        t.notOk(outgoing.success);
    }
    t.end();
});

test('resolver.content() - throwable:true - remote responds with http 500 - should throw', async t => {
    t.plan(4);

    const server = new PodletServer();
    const service = await server.listen();

    const outgoing = new HttpOutgoing({
        uri: service.options.uri,
        throwable: true,
    });

    // See TODO I
    outgoing.reqOptions.podiumContext = {};

    outgoing.manifest = {
        content: service.error,
    };
    outgoing.status = 'cached';

    const content = new Content();

    try {
        await content.resolve(outgoing);
    } catch (error) {
        t.equal(error.statusCode, 500);
        t.equal(error.output.statusCode, 500); // backwards compat
        t.match(error.message, /Could not read content/);
        t.notOk(outgoing.success);
    }

    await server.close();
    t.end();
});

test('resolver.content() - throwable:true - remote responds with http 404 - should throw with error object reflecting status code podlet responded with', async t => {
    t.plan(4);

    const server = new PodletServer();
    const service = await server.listen();

    const outgoing = new HttpOutgoing({
        uri: service.options.uri,
        throwable: true,
    });

    // See TODO I
    outgoing.reqOptions.podiumContext = {};

    outgoing.manifest = {
        content: `${service.address}/404`,
    };
    outgoing.status = 'cached';

    const content = new Content();

    try {
        await content.resolve(outgoing);
    } catch (error) {
        t.equal(error.statusCode, 404);
        t.equal(error.output.statusCode, 404); // backwards compat
        t.match(error.message, /Could not read content/);
        t.notOk(outgoing.success);
    }

    await server.close();
    t.end();
});

test('resolver.content() - throwable:false - remote can not be resolved - "outgoing" should stream empty string', async t => {
    t.plan(2);

    const outgoing = new HttpOutgoing({
        uri: 'http://does.not.exist.finn.no/manifest.json',
        throwable: false,
    });

    // See TODO I
    outgoing.reqOptions.podiumContext = {};

    outgoing.manifest = {
        content: 'http://does.not.exist.finn.no/index.html',
    };
    outgoing.status = 'cached';

    const to = destinationBufferStream(result => {
        t.equal(result, '');
        t.ok(outgoing.success);
    });

    outgoing.pipe(to);

    const content = new Content();
    await content.resolve(outgoing);
    t.end();
});

test('resolver.content() - throwable:false with fallback set - remote can not be resolved - "outgoing" should stream fallback', async t => {
    t.plan(2);

    const outgoing = new HttpOutgoing({
        uri: 'http://does.not.exist.finn.no/manifest.json',
        throwable: false,
    });

    // See TODO I
    outgoing.reqOptions.podiumContext = {};

    outgoing.manifest = {
        content: 'http://does.not.exist.finn.no/index.html',
    };
    outgoing.status = 'cached';
    outgoing.fallback = '<p>haz fallback</p>';

    const to = destinationBufferStream(result => {
        t.equal(result, '<p>haz fallback</p>');
        t.ok(outgoing.success);
    });

    outgoing.pipe(to);

    const content = new Content();
    await content.resolve(outgoing);
    t.end();
});

test('resolver.content() - throwable:false - remote responds with http 500 - "outgoing" should stream empty string', async t => {
    t.plan(2);

    const server = new PodletServer();
    const service = await server.listen();

    const outgoing = new HttpOutgoing({
        uri: service.options.uri,
        throwable: false,
    });

    // See TODO I
    outgoing.reqOptions.podiumContext = {};

    outgoing.manifest = {
        content: service.error,
    };
    outgoing.status = 'cached';

    const to = destinationBufferStream(result => {
        t.equal(result, '');
        t.ok(outgoing.success);
    });

    outgoing.pipe(to);

    const content = new Content();
    await content.resolve(outgoing);

    await server.close();
    t.end();
});

test('resolver.content() - throwable:false with fallback set - remote responds with http 500 - "outgoing" should stream fallback', async t => {
    t.plan(2);

    const server = new PodletServer();
    const service = await server.listen();

    const outgoing = new HttpOutgoing({
        uri: service.options.uri,
        throwable: false,
    });

    // See TODO I
    outgoing.reqOptions.podiumContext = {};

    outgoing.manifest = {
        content: service.error,
    };
    outgoing.status = 'cached';
    outgoing.fallback = '<p>haz fallback</p>';

    const to = destinationBufferStream(result => {
        t.equal(result, '<p>haz fallback</p>');
        t.ok(outgoing.success);
    });

    outgoing.pipe(to);

    const content = new Content();
    await content.resolve(outgoing);

    await server.close();
    t.end();
});

test('resolver.content() - kill switch - throwable:true - recursions equals threshold - should throw', async t => {
    t.plan(2);

    const outgoing = new HttpOutgoing({
        uri: 'http://does.not.exist.finn.no/manifest.json',
        throwable: true,
    });

    // See TODO I
    outgoing.reqOptions.podiumContext = {};

    outgoing.manifest = {
        content: 'http://does.not.exist.finn.no/index.html',
    };
    outgoing.status = 'cached';
    outgoing.recursions = 4;

    const content = new Content();

    try {
        await content.resolve(outgoing);
    } catch (error) {
        t.match(
            error.message,
            /Recursion detected - failed to resolve fetching of podlet 4 times/,
        );
        t.notOk(outgoing.success);
    }
    t.end();
});

test('resolver.content() - kill switch - throwable:false - recursions equals threshold - "outgoing.success" should be true', async t => {
    t.plan(1);

    const outgoing = new HttpOutgoing({
        uri: 'http://does.not.exist.finn.no/manifest.json',
        throwable: false,
    });

    // See TODO I
    outgoing.reqOptions.podiumContext = {};

    outgoing.manifest = {
        content: 'http://does.not.exist.finn.no/index.html',
    };
    outgoing.status = 'cached';
    outgoing.killRecursions = 4;

    const content = new Content();
    await content.resolve(outgoing);

    t.ok(outgoing.success);
    t.end();
});

test('resolver.content() - "redirects" 302 status should also include location on decorated error object', async t => {
    const server = new PodletServer();
    server.headersContent = {
        location: 'http://redirects.are.us.com',
    };
    server.statusCode = 302;
    const service = await server.listen();
    const outgoing = new HttpOutgoing({
        uri: service.options.uri,
        throwable: true,
    });

    // See TODO II
    const { manifest } = server;
    manifest.content = utils.uriRelativeToAbsolute(
        server.manifest.content,
        outgoing.manifestUri,
    );

    outgoing.manifest = manifest;
    outgoing.status = 'cached';

    // See TODO I
    outgoing.reqOptions.podiumContext = {};

    const content = new Content();

    try {
        await content.resolve(outgoing);
    } catch (error) {
        t.equal(error.statusCode, 302);
        // Backwards compat property which cannot be set to anything < 400 because of how @hapi/boom works
        t.equal(error.output.statusCode, 500);
        t.equal(error.isRedirect, true);
        t.equal(error.redirectUrl, 'http://redirects.are.us.com');
    }

    // t.ok(outgoing.manifest);
    await server.close();
    t.end();
});
