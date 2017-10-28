'use strict';

const fallback = require('../lib/resolver.fallback.js');
const State = require('../lib/state.js');
const Faker = require('../test/faker');
const Cache = require('ttl-mem-cache');

test('resolver.fallback() - no fallback field - should return empty String', async () => {
    const server = new Faker();
    const state = new State(new Cache(), { uri: 'http://example.com' });

    state.manifest = server.manifest;
    const result = await fallback(state);
    expect(result.fallback).toBe('');
});

test('resolver.fallback() - fallback field contains HTML - should set value on "state.fallback"', async () => {
    const server = new Faker();
    server.fallback = '<p>haz fallback</p>';

    const state = new State(new Cache(), { uri: 'http://example.com' });
    state.manifest = server.manifest;

    const result = await fallback(state);
    expect(result.fallback).toBe(server.fallback);
});

test('resolver.fallback() - fallback field is a relative URI - should fetch fallback and set content on "state.fallback"', async () => {
    const server = new Faker();
    const service = await server.listen();

    server.fallback = '/fallback.html';

    const state = new State(new Cache(), { uri: service.options.uri });
    state.manifest = server.manifest;

    const result = await fallback(state);
    expect(result.fallback).toBe(server.fallbackBody);

    await server.close();
});

test('resolver.fallback() - fallback field is a relative URI - should fetch fallback and set content on "state.manifest.fallback"', async () => {
    const server = new Faker();
    const service = await server.listen();

    server.fallback = '/fallback.html';

    const state = new State(new Cache(), { uri: service.options.uri });
    state.manifest = server.manifest;

    const result = await fallback(state);
    expect(result.manifest.fallback).toBe(server.fallbackBody);

    await server.close();
});

test('resolver.fallback() - fallback field is a absolute URI - should fetch fallback and set content on "state.fallback"', async () => {
    const server = new Faker();
    const service = await server.listen();

    server.fallback = `${service.address}/fallback.html`;

    const state = new State(new Cache(), { uri: service.options.uri });
    state.manifest = server.manifest;

    const result = await fallback(state);
    expect(result.fallback).toBe(server.fallbackBody);

    await server.close();
});

test('resolver.fallback() - fallback field is a absolute URI - should fetch fallback and set content on "state.manifest.fallback"', async () => {
    const server = new Faker();
    const service = await server.listen();

    server.fallback = `${service.address}/fallback.html`;

    const state = new State(new Cache(), { uri: service.options.uri });
    state.manifest = server.manifest;

    const result = await fallback(state);
    expect(result.manifest.fallback).toBe(server.fallbackBody);

    await server.close();
});

test('resolver.fallback() - throwable:true - remote can not be resolved - should throw', async () => {
    const state = new State(new Cache(), {
        uri: 'http://does.not.exist.finn.no/manifest.json',
        throwable: true,
    });

    state.manifest = {
        fallback: 'http://does.not.exist.finn.no/fallback.html',
    };

    try {
        await fallback(state);
    } catch (error) {
        expect(error.message).toMatch(/ENOTFOUND/);
    }
});

test('resolver.fallback() - throwable:true - remote responds with http 500 - should throw', async () => {
    const server = new Faker();
    const service = await server.listen();

    const state = new State(new Cache(), {
        uri: service.options.uri,
        throwable: true,
    });

    state.manifest = {
        fallback: service.error,
    };

    try {
        await fallback(state);
    } catch (error) {
        expect(error.message).toMatch(/Could not read fallback/);
    }

    await server.close();
});

test('resolver.fallback() - throwable:false - remote can not be resolved - "state.manifest" should be empty string', async () => {
    const state = new State(new Cache(), {
        uri: 'http://does.not.exist.finn.no/manifest.json',
        throwable: false,
    });

    state.manifest = {
        fallback: 'http://does.not.exist.finn.no/fallback.html',
    };

    await fallback(state);
    expect(state.fallback).toBe('');
});

test('resolver.fallback() - throwable:false - remote responds with http 500 - "state.manifest" should be empty string', async () => {
    const server = new Faker();
    const service = await server.listen();

    const state = new State(new Cache(), {
        uri: service.options.uri,
        throwable: false,
    });

    state.manifest = {
        fallback: service.error,
    };

    await fallback(state);
    expect(state.fallback).toBe('');

    await server.close();
});
