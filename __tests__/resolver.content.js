'use strict';

const content = require('../lib/resolver.content.js');
const stream = require('stream');
const State = require('../lib/state.js');
const Faker = require('../test/faker');
const Cache = require('ttl-mem-cache');

/**
 * TODO I:
 * If "state.reqOptions.podiumContext" does not exist the content resolver throws a
 * "Cannot read property 'resourceMountPath' of undefined" error.
 * This is britle in the implementation. Harden.
 */

test('resolver.content() - state "streamThrough" is true - should stream content through on state.stream', async () => {
    const server = new Faker();
    const service = await server.listen();
    const state = new State(
        new Cache(),
        { uri: service.options.uri },
        {},
        true
    );
    state.manifest = server.manifest;

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

    await content(state);
    await server.close();
});

test('resolver.content() - state "streamThrough" is false - should buffer content into state.content', async () => {
    const server = new Faker();
    const service = await server.listen();

    const state = new State(
        new Cache(),
        { uri: service.options.uri },
        {},
        false
    );
    state.manifest = server.manifest;

    // See TODO I
    state.reqOptions.podiumContext = {};

    const result = await content(state);
    expect(result.content).toBe(server.contentBody);
    await server.close();
});

test('resolver.content() - "podlet-version" header is same as manifest.version - should keep manifest on state.manifest', async () => {
    const server = new Faker();
    const service = await server.listen();

    const state = new State(new Cache(), { uri: service.options.uri });
    state.manifest = server.manifest;

    // See TODO I
    state.reqOptions.podiumContext = {};

    await content(state);
    expect(state.manifest).toBeDefined();
    await server.close();
});

test('resolver.content() - "podlet-version" header is empty - should keep manifest on state.manifest', async () => {
    const server = new Faker();
    const service = await server.listen();
    server.headersContent = {
        'podlet-version': '',
    };

    const state = new State(new Cache(), { uri: service.options.uri });
    state.manifest = server.manifest;

    // See TODO I
    state.reqOptions.podiumContext = {};

    await content(state);
    expect(state.manifest).toBeDefined();
    await server.close();
});

test('resolver.content() - "podlet-version" header is different than manifest.version - should set state.manifest to "undefined"', async () => {
    const server = new Faker();
    const service = await server.listen();
    server.headersContent = {
        'podlet-version': '2.0.0',
    };

    const state = new State(new Cache(), { uri: service.options.uri });
    state.manifest = server.manifest;

    // See TODO I
    state.reqOptions.podiumContext = {};

    await content(state);
    expect(state.manifest).toBeUndefined();
    await server.close();
});
