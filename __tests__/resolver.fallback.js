/* eslint-disable no-underscore-dangle */
/* eslint-disable prefer-destructuring */

'use strict';

const HttpOutgoing = require('../lib/http-outgoing');
const Fallback = require('../lib/resolver.fallback');
const Faker = require('../test/faker');

test('resolver.fallback() - object tag - should be PodletClientFallbackResolver', () => {
    const fallback = new Fallback();
    expect(Object.prototype.toString.call(fallback)).toEqual(
        '[object PodletClientFallbackResolver]',
    );
});

test('resolver.fallback() - fallback field is empty - should set value on "outgoing.fallback" to empty String', async () => {
    const server = new Faker();
    const manifest = server.manifest;
    manifest.fallback = '';

    const outgoing = new HttpOutgoing({ uri: 'http://example.com' });
    outgoing.manifest = manifest;

    const fallback = new Fallback();
    const result = await fallback.resolve(outgoing);
    expect(result.fallback).toBe('');
});

test('resolver.fallback() - fallback field contains invalid value - should set value on "outgoing.fallback" to empty String', async () => {
    const server = new Faker();
    const manifest = server.manifest;
    manifest.fallback = 'ht++ps://blæ.finn.no/fallback.html';

    const outgoing = new HttpOutgoing({ uri: 'http://example.com' });
    outgoing.manifest = manifest;

    const fallback = new Fallback();
    const result = await fallback.resolve(outgoing);
    expect(result.fallback).toBe('');
});

test('resolver.fallback() - fallback field is a URI - should fetch fallback and set content on "outgoing.fallback"', async () => {
    const server = new Faker();
    const service = await server.listen();

    const manifest = server.manifest;
    manifest.fallback = `${service.address}/fallback.html`;

    const outgoing = new HttpOutgoing({ uri: service.options.uri });
    outgoing.manifest = manifest;

    const fallback = new Fallback();
    const result = await fallback.resolve(outgoing);
    expect(result.fallback).toBe(server.fallbackBody);

    await server.close();
});

test('resolver.fallback() - fallback field is a URI - should fetch fallback and set content on "outgoing.manifest._fallback"', async () => {
    const server = new Faker();
    const service = await server.listen();

    const manifest = server.manifest;
    manifest.fallback = `${service.address}/fallback.html`;

    const outgoing = new HttpOutgoing({ uri: service.options.uri });
    outgoing.manifest = manifest;

    const fallback = new Fallback();
    const result = await fallback.resolve(outgoing);
    expect(result.manifest._fallback).toBe(server.fallbackBody);

    await server.close();
});

test('resolver.fallback() - remote can not be resolved - "outgoing.manifest" should be empty string', async () => {
    const outgoing = new HttpOutgoing({
        uri: 'http://does.not.exist.finn.no/manifest.json',
        throwable: false,
    });

    outgoing.manifest = {
        fallback: 'http://does.not.exist.finn.no/fallback.html',
    };

    const fallback = new Fallback();
    await fallback.resolve(outgoing);
    expect(outgoing.fallback).toBe('');
});

test('resolver.fallback() - remote responds with http 500 - "outgoing.manifest" should be empty string', async () => {
    const server = new Faker();
    const service = await server.listen();

    const outgoing = new HttpOutgoing({
        uri: service.options.uri,
        throwable: false,
    });

    outgoing.manifest = {
        fallback: service.error,
    };

    const fallback = new Fallback();
    await fallback.resolve(outgoing);
    expect(outgoing.fallback).toBe('');

    await server.close();
});
