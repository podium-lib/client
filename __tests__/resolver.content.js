'use strict';

const Content = require('../lib/resolver.content.js');
const stream = require('stream');
const State = require('../lib/state.js');
const Faker = require('../test/faker');

/**
 * TODO I:
 * If "state.reqOptions.podiumContext" does not exist the content resolver throws a
 * "Cannot read property 'resourceMountPath' of undefined" error.
 * This is britle in the implementation. Harden.
 */

test('resolver.content() - object tag - should be PodletClientContentResolver', () => {
    const content = new Content();
    expect(Object.prototype.toString.call(content)).toEqual(
        '[object PodletClientContentResolver]'
    );
});

test('resolver.content() - state "streamThrough" is true - should stream content through on state.stream', async () => {
    expect.hasAssertions();

    const server = new Faker();
    const service = await server.listen();
    const state = new State(
        { uri: service.options.uri },
        {},
        true
    );
    state.manifest = server.manifest;
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

    const state = new State(
        { uri: service.options.uri },
        {},
        false
    );
    state.manifest = server.manifest;
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
    state.manifest = server.manifest;
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
    state.manifest = server.manifest;
    state.status = 'cached';

    // See TODO I
    state.reqOptions.podiumContext = {};

    const content = new Content();
    await content.resolve(state);

    expect(state.manifest).toBeDefined();
    await server.close();
});

test('resolver.content() - "podlet-version" header is different than manifest.version - should set state.manifest to {_fallback: ""}', async () => {
    const server = new Faker();
    const service = await server.listen();
    server.headersContent = {
        'podlet-version': '2.0.0',
    };

    const state = new State({ uri: service.options.uri });
    state.manifest = server.manifest;
    state.status = 'cached';

    // See TODO I
    state.reqOptions.podiumContext = {};

    const content = new Content();
    await content.resolve(state);

    expect(state.manifest).toEqual({ _fallback: '' });
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
