/* eslint-disable import/order */

'use strict';

const HttpOutgoing = require('../lib/http-outgoing');
const Content = require('../lib/resolver.content');
const stream = require('readable-stream');
const utils = require('@podium/utils');
const Metrics = require('@metrics/client');
const Faker = require('../test/faker');

/**
 * TODO I:
 * If "outgoing.reqOptions.podiumContext" does not exist the content resolver throws a
 * "Cannot read property 'resourceMountPath' of undefined" error.
 * This is britle in the implementation. Harden.
 *
 * TODO II:
 * Resolving URI's should happen in outgoing object and not in manifest resolver.
 */

test('resolver.content() - object tag - should be PodletClientContentResolver', () => {
    const content = new Content(new Metrics());
    expect(Object.prototype.toString.call(content)).toEqual(
        '[object PodletClientContentResolver]',
    );
});

test('resolver.content() - no @metrics/client - should throw', () => {
    expect.hasAssertions();
    expect(() => {
        // eslint-disable-next-line no-unused-vars
        const manifest = new Content();
    }).toThrowError(
        'you must pass a @metrics/client to the PodletClientContentResolver constructor',
    );
});

test('resolver.content() - outgoing "streamThrough" is true - should stream content through on outgoing.stream', async () => {
    expect.hasAssertions();

    const server = new Faker();
    const service = await server.listen();
    const outgoing = new HttpOutgoing({ uri: service.options.uri }, {}, true);

    // See TODO II
    const { manifest } = server;
    manifest.content = utils.uriRelativeToAbsolute(
        server.manifest.content,
        outgoing.manifestUri,
    );

    outgoing.manifest = manifest;
    outgoing.status = 'fresh';

    // See TODO I
    outgoing.reqOptions.podiumContext = {};

    const buffer = [];
    const to = new stream.Writable({
        write: (chunk, enc, next) => {
            buffer.push(chunk);
            next();
        },
    }).on('finish', () => {
        expect(buffer.join().toString()).toBe(server.contentBody);
    });

    outgoing.stream.pipe(to);

    const content = new Content(new Metrics());
    await content.resolve(outgoing);
    await server.close();
});

test('resolver.content() - outgoing "streamThrough" is false - should buffer content into outgoing.content', async () => {
    const server = new Faker();
    const service = await server.listen();
    const outgoing = new HttpOutgoing({ uri: service.options.uri }, {}, false);

    // See TODO II
    const { manifest } = server;
    manifest.content = utils.uriRelativeToAbsolute(
        server.manifest.content,
        outgoing.manifestUri,
    );

    outgoing.manifest = manifest;
    outgoing.status = 'fresh';

    // See TODO I
    outgoing.reqOptions.podiumContext = {};

    const content = new Content(new Metrics());
    const result = await content.resolve(outgoing);

    expect(result.content).toBe(server.contentBody);
    await server.close();
});

test('resolver.content() - "podlet-version" header is same as manifest.version - should keep manifest on outgoing.manifest', async () => {
    const server = new Faker();
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

    const content = new Content(new Metrics());
    await content.resolve(outgoing);

    expect(outgoing.manifest).toBeDefined();
    await server.close();
});

test('resolver.content() - "podlet-version" header is empty - should keep manifest on outgoing.manifest', async () => {
    const server = new Faker();
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

    const content = new Content(new Metrics());
    await content.resolve(outgoing);

    expect(outgoing.manifest).toBeDefined();
    await server.close();
});

test('resolver.content() - "podlet-version" header is different than manifest.version - should set outgoing.status to "stale" and keep manifest', async () => {
    const server = new Faker();
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

    const content = new Content(new Metrics());
    await content.resolve(outgoing);

    expect(outgoing.manifest.version).toEqual(server.manifest.version);
    expect(outgoing.status).toEqual('stale');
    await server.close();
});

test('resolver.content() - throwable:true - remote can not be resolved - should throw', async () => {
    expect.hasAssertions();

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

    const content = new Content(new Metrics());

    try {
        await content.resolve(outgoing);
    } catch (error) {
        expect(error.message).toMatch(/Error reading content/);
        expect(outgoing.success).toBeFalsy();
    }
});

test('resolver.content() - throwable:true - remote responds with http 500 - should throw', async () => {
    expect.hasAssertions();

    const server = new Faker();
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

    const content = new Content(new Metrics());

    try {
        await content.resolve(outgoing);
    } catch (error) {
        expect(error.output.statusCode).toBe(500);
        expect(error.message).toMatch(/Could not read content/);
        expect(outgoing.success).toBeFalsy();
    }

    await server.close();
});

test('resolver.content() - throwable:true - remote responds with http 404 - should throw with error object reflecting status code podlet responded with', async () => {
    expect.hasAssertions();

    const server = new Faker();
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

    const content = new Content(new Metrics());

    try {
        await content.resolve(outgoing);
    } catch (error) {
        expect(error.output.statusCode).toBe(404);
        expect(error.message).toMatch(/Could not read content/);
        expect(outgoing.success).toBeFalsy();
    }

    await server.close();
});

test('resolver.content() - throwable:false - remote can not be resolved - "outgoing.stream" should stream empty string', async () => {
    expect.hasAssertions();

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

    const buffer = [];
    const to = new stream.Writable({
        write: (chunk, enc, next) => {
            buffer.push(chunk);
            next();
        },
    }).on('finish', () => {
        expect(buffer.join().toString()).toBe('');
        expect(outgoing.success).toBeTruthy();
    });

    outgoing.stream.pipe(to);

    const content = new Content(new Metrics());
    await content.resolve(outgoing);
});

test('resolver.content() - throwable:false with fallback set - remote can not be resolved - "outgoing.stream" should stream fallback', async () => {
    expect.hasAssertions();

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

    const buffer = [];
    const to = new stream.Writable({
        write: (chunk, enc, next) => {
            buffer.push(chunk);
            next();
        },
    }).on('finish', () => {
        expect(buffer.join().toString()).toBe('<p>haz fallback</p>');
        expect(outgoing.success).toBeTruthy();
    });

    outgoing.stream.pipe(to);

    const content = new Content(new Metrics());
    await content.resolve(outgoing);
});

test('resolver.content() - throwable:false - remote responds with http 500 - "outgoing.stream" should stream empty string', async () => {
    expect.hasAssertions();

    const server = new Faker();
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

    const buffer = [];
    const to = new stream.Writable({
        write: (chunk, enc, next) => {
            buffer.push(chunk);
            next();
        },
    }).on('finish', () => {
        expect(buffer.join().toString()).toBe('');
        expect(outgoing.success).toBeTruthy();
    });

    outgoing.stream.pipe(to);

    const content = new Content(new Metrics());
    await content.resolve(outgoing);

    await server.close();
});

test('resolver.content() - throwable:false with fallback set - remote responds with http 500 - "outgoing.stream" should stream fallback', async () => {
    expect.hasAssertions();

    const server = new Faker();
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

    const buffer = [];
    const to = new stream.Writable({
        write: (chunk, enc, next) => {
            buffer.push(chunk);
            next();
        },
    }).on('finish', () => {
        expect(buffer.join().toString()).toBe('<p>haz fallback</p>');
        expect(outgoing.success).toBeTruthy();
    });

    outgoing.stream.pipe(to);

    const content = new Content(new Metrics());
    await content.resolve(outgoing);

    await server.close();
});

test('resolver.content() - kill switch - throwable:true - recursions equals threshold - should throw', async () => {
    expect.hasAssertions();

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
    outgoing.killRecursions = 4;

    const content = new Content(new Metrics());

    try {
        await content.resolve(outgoing);
    } catch (error) {
        expect(error.message).toMatch(
            /Recursion detected - failed to resolve fetching of podlet 4 times/,
        );
        expect(outgoing.success).toBeFalsy();
    }
});

test('resolver.content() - kill switch - throwable:false - recursions equals threshold - "outgoing.success" should be true', async () => {
    expect.hasAssertions();

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

    const content = new Content(new Metrics());
    await content.resolve(outgoing);

    expect(outgoing.success).toBeTruthy();
});
