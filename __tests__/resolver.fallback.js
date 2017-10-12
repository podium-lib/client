'use strict';

const fallback = require('../lib/resolver.fallback.js');
const State = require('../lib/state.js');
const Faker = require('../test/faker');

test('resolver.fallback() - no fallback field - should return empty String', async () => {
    const server = new Faker();
    const state = new State();

    state.manifest = server.manifest;
    const result = await fallback(state);
    expect(result.fallback).toBe('');
});

test('resolver.fallback() - fallback field contains HTML - should set value on "state.fallback"', async () => {
    const server = new Faker();
    server.fallback = '<p>haz fallback</p>';

    const state = new State();
    state.manifest = server.manifest;

    const result = await fallback(state);
    expect(result.fallback).toBe(server.fallback);
});

test('resolver.fallback() - fallback field is a relative URI - should fetch fallback and set content on "state.fallback"', async () => {
    const server = new Faker();
    const service = await server.listen();

    server.fallback = '/fallback.html';

    const state = new State({}, { uri: service.options.uri });
    state.manifest = server.manifest;

    const result = await fallback(state);
    expect(result.fallback).toBe('<p>fallback component</p>');

    await server.close();
});

test('resolver.fallback() - fallback field is a relative URI - should fetch fallback and set content on "state.manifest.fallback"', async () => {
    const server = new Faker();
    const service = await server.listen();

    server.fallback = '/fallback.html';

    const state = new State({}, { uri: service.options.uri });
    state.manifest = server.manifest;

    const result = await fallback(state);
    expect(result.manifest.fallback).toBe('<p>fallback component</p>');

    await server.close();
});

test('resolver.fallback() - fallback field is a absolute URI - should fetch fallback and set content on "state.fallback"', async () => {
    const server = new Faker();
    const service = await server.listen();

    server.fallback = `${service.address}/fallback.html`;

    const state = new State({}, { uri: service.options.uri });
    state.manifest = server.manifest;

    const result = await fallback(state);
    expect(result.fallback).toBe('<p>fallback component</p>');

    await server.close();
});

test('resolver.fallback() - fallback field is a absolute URI - should fetch fallback and set content on "state.manifest.fallback"', async () => {
    const server = new Faker();
    const service = await server.listen();

    server.fallback = `${service.address}/fallback.html`;

    const state = new State({}, { uri: service.options.uri });
    state.manifest = server.manifest;

    const result = await fallback(state);
    expect(result.manifest.fallback).toBe('<p>fallback component</p>');

    await server.close();
});
