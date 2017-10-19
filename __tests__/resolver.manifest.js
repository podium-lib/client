'use strict';

const manifest = require('../lib/resolver.manifest.js');
const Client = require('../');
const Cache = require('ttl-mem-cache');
const State = require('../lib/state.js');
const Faker = require('../test/faker');
const lolex = require('lolex');

/**
 * NOTE I:
 * Cache control based on headers subract the time of the request
 * so we will not have an exact number to test on. Due to this, we
 * check if cache time are within a range.
 */

test('resolver.manifest() - remote has no cache header - should set state.maxAge to default', async () => {
    const server = new Faker();
    const service = await server.listen();

    const state = new State(new Cache(), {
        uri: service.options.uri,
        maxAge: 40000,
    });
    await manifest(state);

    expect(state.maxAge).toBe(40000);

    await server.close();
});

test('resolver.manifest() - remote has "cache-control: public, max-age=10" header - should set state.maxAge to header value', async () => {
    const server = new Faker();
    const service = await server.listen();
    server.headersManifest = {
        'cache-control': 'public, max-age=10',
    };

    const state = new State(new Cache(), {
        uri: service.options.uri,
        maxAge: 40000,
    });
    await manifest(state);

    // See NOTE I for details
    expect(state.maxAge < 10000 && state.maxAge > 9000).toBeTruthy();

    await server.close();
});

test('resolver.manifest() - remote has "cache-control: no-cache" header - should set state.maxAge to default', async () => {
    const server = new Faker();
    const service = await server.listen();
    server.headersManifest = {
        'cache-control': 'no-cache',
    };

    const state = new State(new Cache(), {
        uri: service.options.uri,
        maxAge: 40000,
    });
    await manifest(state);

    expect(state.maxAge).toBe(40000);

    await server.close();
});

test('resolver.manifest() - remote has "expires" header - should set state.maxAge to header value', async () => {
    const clock = lolex.install();

    const server = new Faker();
    const service = await server.listen();

    // Set expire header time to two hours into future
    server.headersManifest = {
        expires: new Date(Date.now() + 1000 * 60 * 60 * 2).toUTCString(),
    };

    const state = new State(new Cache(), {
        uri: service.options.uri,
        maxAge: 40000,
    });
    await manifest(state);

    expect(state.maxAge).toBe(1000 * 60 * 60 * 2); // 2 hours

    await server.close();
    clock.uninstall();
});

test('resolver.manifest() - one remote has "expires" header second none - should set and timout one and use default for second', async () => {
    const clock = lolex.install();

    const serverA = new Faker({
        name: 'aa',
    });
    const serverB = new Faker({
        name: 'bb',
    });

    const serviceA = await serverA.listen();
    const serviceB = await serverB.listen();

    // Set expires by http headers two hours into future
    serverA.headersManifest = {
        expires: new Date(Date.now() + 1000 * 60 * 60 * 2).toUTCString(),
    };

    // Set default expires four hours into future
    const client = new Client({ maxAge: 1000 * 60 * 60 * 4 });
    client.register(serviceA.options);
    client.register(serviceB.options);

    await client.refreshManifests();

    expect(serverA.metrics.manifest).toEqual(1);
    expect(serverB.metrics.manifest).toEqual(1);

    // Tick clock three hours into future
    clock.tick(1000 * 60 * 60 * 3);

    await client.refreshManifests();

    // Cache for server A should now have timed out
    expect(serverA.metrics.manifest).toEqual(2);
    expect(serverB.metrics.manifest).toEqual(1);

    await serverA.close();
    await serverB.close();
    clock.uninstall();
});
