/* eslint-disable import/order */

'use strict';

const Content = require('../lib/resolver.content.js');
const stream = require('stream');
const State = require('../lib/state.js');
const utils = require('@podium/utils');
const Faker = require('../test/faker');

/**
 * TODO I:
 * If "state.reqOptions.podiumContext" does not exist the content resolver throws a
 * "Cannot read property 'resourceMountPath' of undefined" error.
 * This is britle in the implementation. Harden.
 *
 * TODO II:
 * Resolving URI's should happen in state object and not in manifest resolver.
 */

test('resolver.content() - object tag - should be PodletClientContentResolver', () => {
    const content = new Content();
    expect(Object.prototype.toString.call(content)).toEqual(
        '[object PodletClientContentResolver]',
    );
});

test('resolver.content() - state "streamThrough" is true - should stream content through on state.stream', async () => {
    expect.hasAssertions();

    const server = new Faker();
    const service = await server.listen();
    const state = new State({ uri: service.options.uri }, {}, true);

    // See TODO II
    const { manifest } = server;
    manifest.content = utils.uriRelativeToAbsolute(
        server.manifest.content,
        state.manifestUri
    );

    state.manifest = manifest;
    state.status = 'fresh';

    // See TODO I
    state.reqOptions.podiumContext = {};

    const buffer = [];
    const to = new stream.Writable({
        write: (chunk, enc, next) => {
            buffer.push(chunk);
            next();
        },
    }).on('finish', () => {
        expect(buffer.join().toString()).toBe(server.contentBody);
    });

    state.stream.pipe(to);

    const content = new Content();
    await content.resolve(state);
    await server.close();
});

test('resolver.content() - state "streamThrough" is false - should buffer content into state.content', async () => {
    const server = new Faker();
    const service = await server.listen();
    const state = new State({ uri: service.options.uri }, {}, false);

    // See TODO II
    const { manifest } = server;
    manifest.content = utils.uriRelativeToAbsolute(
        server.manifest.content,
        state.manifestUri
    );

    state.manifest = manifest;
    state.status = 'fresh';

    // See TODO I
    state.reqOptions.podiumContext = {};

    const content = new Content();
    const result = await content.resolve(state);

    expect(result.content).toBe(server.contentBody);
    await server.close();
});

test('resolver.content() - "podlet-version" header is same as manifest.version - should keep manifest on state.manifest', async () => {
    const server = new Faker();
    const service = await server.listen();
    const state = new State({ uri: service.options.uri });

    // See TODO II
    const { manifest } = server;
    manifest.content = utils.uriRelativeToAbsolute(
        server.manifest.content,
        state.manifestUri
    );

    state.manifest = manifest;
    state.status = 'cached';

    // See TODO I
    state.reqOptions.podiumContext = {};

    const content = new Content();
    await content.resolve(state);

    expect(state.manifest).toBeDefined();
    await server.close();
});

test('resolver.content() - "podlet-version" header is empty - should keep manifest on state.manifest', async () => {
    const server = new Faker();
    const service = await server.listen();
    server.headersContent = {
        'podlet-version': '',
    };

    const state = new State({ uri: service.options.uri });

    // See TODO II
    const { manifest } = server;
    manifest.content = utils.uriRelativeToAbsolute(
        server.manifest.content,
        state.manifestUri
    );

    state.manifest = manifest;
    state.status = 'cached';

    // See TODO I
    state.reqOptions.podiumContext = {};

    const content = new Content();
    await content.resolve(state);

    expect(state.manifest).toBeDefined();
    await server.close();
});

test('resolver.content() - "podlet-version" header is different than manifest.version - should set state.status to "stale" and keep manifest', async () => {
    const server = new Faker();
    const service = await server.listen();
    server.headersContent = {
        'podlet-version': '2.0.0',
    };

    const state = new State({ uri: service.options.uri });

    // See TODO II
    const { manifest } = server;
    manifest.content = utils.uriRelativeToAbsolute(
        server.manifest.content,
        state.manifestUri
    );

    state.manifest = manifest;
    state.status = 'cached';

    // See TODO I
    state.reqOptions.podiumContext = {};

    const content = new Content();
    await content.resolve(state);

    expect(state.manifest.version).toEqual(server.manifest.version);
    expect(state.status).toEqual('stale');
    await server.close();
});

test('resolver.content() - throwable:true - remote can not be resolved - should throw', async () => {
    expect.hasAssertions();

    const state = new State({
        uri: 'http://does.not.exist.finn.no/manifest.json',
        throwable: true,
    });

    // See TODO I
    state.reqOptions.podiumContext = {};

    state.manifest = {
        content: 'http://does.not.exist.finn.no/index.html',
    };
    state.status = 'cached';

    const content = new Content();

    try {
        await content.resolve(state);
    } catch (error) {
        expect(error.message).toMatch(/Error reading content/);
        expect(state.success).toBeFalsy();
    }
});

test('resolver.content() - throwable:true - remote responds with http 500 - should throw', async () => {
    expect.hasAssertions();

    const server = new Faker();
    const service = await server.listen();

    const state = new State({
        uri: service.options.uri,
        throwable: true,
    });

    // See TODO I
    state.reqOptions.podiumContext = {};

    state.manifest = {
        content: service.error,
    };
    state.status = 'cached';

    const content = new Content();

    try {
        await content.resolve(state);
    } catch (error) {
        expect(error.output.statusCode).toBe(500);
        expect(error.message).toMatch(/Could not read content/);
        expect(state.success).toBeFalsy();
    }

    await server.close();
});

test('resolver.content() - throwable:true - remote responds with http 404 - should throw with error object reflecting status code podlet responded with', async () => {
    expect.hasAssertions();

    const server = new Faker();
    const service = await server.listen();

    const state = new State({
        uri: service.options.uri,
        throwable: true,
    });

    // See TODO I
    state.reqOptions.podiumContext = {};

    state.manifest = {
        content: `${service.address}/404`,
    };
    state.status = 'cached';

    const content = new Content();

    try {
        await content.resolve(state);
    } catch (error) {
        expect(error.output.statusCode).toBe(404);
        expect(error.message).toMatch(/Could not read content/);
        expect(state.success).toBeFalsy();
    }

    await server.close();
});

test('resolver.content() - throwable:false - remote can not be resolved - "state.stream" should stream empty string', async () => {
    expect.hasAssertions();

    const state = new State({
        uri: 'http://does.not.exist.finn.no/manifest.json',
        throwable: false,
    });

    // See TODO I
    state.reqOptions.podiumContext = {};

    state.manifest = {
        content: 'http://does.not.exist.finn.no/index.html',
    };
    state.status = 'cached';

    const buffer = [];
    const to = new stream.Writable({
        write: (chunk, enc, next) => {
            buffer.push(chunk);
            next();
        },
    }).on('finish', () => {
        expect(buffer.join().toString()).toBe('');
        expect(state.success).toBeTruthy();
    });

    state.stream.pipe(to);

    const content = new Content();
    await content.resolve(state);
});

test('resolver.content() - throwable:false with fallback set - remote can not be resolved - "state.stream" should stream fallback', async () => {
    expect.hasAssertions();

    const state = new State({
        uri: 'http://does.not.exist.finn.no/manifest.json',
        throwable: false,
    });

    // See TODO I
    state.reqOptions.podiumContext = {};

    state.manifest = {
        content: 'http://does.not.exist.finn.no/index.html',
    };
    state.status = 'cached';
    state.fallback = '<p>haz fallback</p>';

    const buffer = [];
    const to = new stream.Writable({
        write: (chunk, enc, next) => {
            buffer.push(chunk);
            next();
        },
    }).on('finish', () => {
        expect(buffer.join().toString()).toBe('<p>haz fallback</p>');
        expect(state.success).toBeTruthy();
    });

    state.stream.pipe(to);

    const content = new Content();
    await content.resolve(state);
});

test('resolver.content() - throwable:false - remote responds with http 500 - "state.stream" should stream empty string', async () => {
    expect.hasAssertions();

    const server = new Faker();
    const service = await server.listen();

    const state = new State({
        uri: service.options.uri,
        throwable: false,
    });

    // See TODO I
    state.reqOptions.podiumContext = {};

    state.manifest = {
        content: service.error,
    };
    state.status = 'cached';

    const buffer = [];
    const to = new stream.Writable({
        write: (chunk, enc, next) => {
            buffer.push(chunk);
            next();
        },
    }).on('finish', () => {
        expect(buffer.join().toString()).toBe('');
        expect(state.success).toBeTruthy();
    });

    state.stream.pipe(to);

    const content = new Content();
    await content.resolve(state);

    await server.close();
});

test('resolver.content() - throwable:false with fallback set - remote responds with http 500 - "state.stream" should stream fallback', async () => {
    expect.hasAssertions();

    const server = new Faker();
    const service = await server.listen();

    const state = new State({
        uri: service.options.uri,
        throwable: false,
    });

    // See TODO I
    state.reqOptions.podiumContext = {};

    state.manifest = {
        content: service.error,
    };
    state.status = 'cached';
    state.fallback = '<p>haz fallback</p>';

    const buffer = [];
    const to = new stream.Writable({
        write: (chunk, enc, next) => {
            buffer.push(chunk);
            next();
        },
    }).on('finish', () => {
        expect(buffer.join().toString()).toBe('<p>haz fallback</p>');
        expect(state.success).toBeTruthy();
    });

    state.stream.pipe(to);

    const content = new Content();
    await content.resolve(state);

    await server.close();
});

test('resolver.content() - kill switch - throwable:true - recursions equals threshold - should throw', async () => {
    expect.hasAssertions();

    const state = new State({
        uri: 'http://does.not.exist.finn.no/manifest.json',
        throwable: true,
    });

    // See TODO I
    state.reqOptions.podiumContext = {};

    state.manifest = {
        content: 'http://does.not.exist.finn.no/index.html',
    };
    state.status = 'cached';
    state.killRecursions = 4;

    const content = new Content();

    try {
        await content.resolve(state);
    } catch (error) {
        expect(error.message).toMatch(
            /Recursion detected - failed to resolve fetching of podlet 4 times/,
        );
        expect(state.success).toBeFalsy();
    }
});

test('resolver.content() - kill switch - throwable:false - recursions equals threshold - "state.success" should be true', async () => {
    expect.hasAssertions();

    const state = new State({
        uri: 'http://does.not.exist.finn.no/manifest.json',
        throwable: false,
    });

    // See TODO I
    state.reqOptions.podiumContext = {};

    state.manifest = {
        content: 'http://does.not.exist.finn.no/index.html',
    };
    state.status = 'cached';
    state.killRecursions = 4;

    const content = new Content();
    await content.resolve(state);

    expect(state.success).toBeTruthy();
});
