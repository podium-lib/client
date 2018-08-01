'use strict';

const Fallback = require('../lib/resolver.fallback.js');
const State = require('../lib/state.js');
const Faker = require('../test/faker');

test('resolver.fallback() - object tag - should be PodletClientFallbackResolver', () => {
    const fallback = new Fallback();
    expect(Object.prototype.toString.call(fallback)).toEqual(
        '[object PodletClientFallbackResolver]'
    );
});

test('resolver.fallback() - fallback field contains invalid value - should set value on "state.fallback" to empty String', async () => {
    const server = new Faker();
    const manifest = server.manifest;
    manifest.fallback = 'ht++ps://blæ.finn.no/fallback.html';

    const state = new State({ uri: 'http://example.com' });
    state.manifest = manifest;

    const fallback = new Fallback();
    const result = await fallback.resolve(state);
    expect(result.fallback).toBe('');
});

test('resolver.fallback() - fallback field is a URI - should fetch fallback and set content on "state.fallback"', async () => {
    const server = new Faker();
    const service = await server.listen();

    server.fallback = `${service.address}/fallback.html`;

    const state = new State({ uri: service.options.uri });
    state.manifest = server.manifest;

    const fallback = new Fallback();
    const result = await fallback.resolve(state);
    expect(result.fallback).toBe(server.fallbackBody);

    await server.close();
});

test('resolver.fallback() - fallback field is a URI - should fetch fallback and set content on "state.manifest._fallback"', async () => {
    const server = new Faker();
    const service = await server.listen();

    server.fallback = `${service.address}/fallback.html`;

    const state = new State({ uri: service.options.uri });
    state.manifest = server.manifest;

    const fallback = new Fallback();
    const result = await fallback.resolve(state);
    expect(result.manifest._fallback).toBe(server.fallbackBody);

    await server.close();
});

test('resolver.fallback() - remote can not be resolved - "state.manifest" should be empty string', async () => {
    const state = new State({
        uri: 'http://does.not.exist.finn.no/manifest.json',
        throwable: false,
    });

    state.manifest = {
        fallback: 'http://does.not.exist.finn.no/fallback.html',
    };

    const fallback = new Fallback();
    await fallback.resolve(state);
    expect(state.fallback).toBe('');
});

test('resolver.fallback() - remote responds with http 500 - "state.manifest" should be empty string', async () => {
    const server = new Faker();
    const service = await server.listen();

    const state = new State({
        uri: service.options.uri,
        throwable: false,
    });

    state.manifest = {
        fallback: service.error,
    };

    const fallback = new Fallback();
    await fallback.resolve(state);
    expect(state.fallback).toBe('');

    await server.close();
});
