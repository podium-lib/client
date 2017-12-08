'use strict';

const Client = require('../');
const Faker = require('../test/faker');
const lolex = require('lolex');

/**
 * Constructor
 */

test('Client() - instantiate new client object - should have register method', () => {
    const client = new Client();
    expect(client.register).toBeInstanceOf(Function);
});

test('Client() - object tag - should be PodletClient', () => {
    const client = new Client();
    expect(Object.prototype.toString.call(client)).toEqual(
        '[object PodletClient]'
    );
});

/**
 * .on('dispose')
 */

test('Client().on("dispose") - client is hot, manifest reaches timeout - should emit dispose event', async () => {
    expect.hasAssertions();

    const clock = lolex.install();

    const server = new Faker({
        name: 'aa',
    });
    const service = await server.listen();

    const client = new Client();
    client.on('dispose', key => {
        expect(key).toEqual(service.options.uri);
    });

    const podlet = client.register(service.options);
    await podlet.fetch({});

    // Tick clock 25 hours into future
    clock.tick(25 * 60 * 60 * 1000);

    await podlet.fetch({});

    await server.close();
    clock.uninstall();
});

/**
 * .refreshManifests()
 */

test("client.refreshManifests() - should populate all resources' manifests", async () => {
    const serverA = new Faker({
        name: 'aa',
        assets: { js: 'a.js', css: 'a.css' },
    });
    const serverB = new Faker({
        name: 'bb',
        assets: { js: 'b.js', css: 'b.css' },
    });
    const [serviceA, serviceB] = await Promise.all([
        serverA.listen(),
        serverB.listen(),
    ]);

    const client = new Client();
    client.register(serviceA.options);
    client.register(serviceB.options);

    expect(client.js()).toEqual([]);
    expect(client.css()).toEqual([]);

    const fetchResult = await client.refreshManifests();

    expect(client.js()).toEqual(['a.js', 'b.js']);
    expect(client.css()).toEqual(['a.css', 'b.css']);
    expect(fetchResult).toBeUndefined();

    await Promise.all([serverA.close(), serverB.close()]);
});

/**
 * .dump()
 */

test("client.dump() - should dump resources' manifests", async () => {
    const serverA = new Faker({
        name: 'aa',
        assets: { js: 'a.js', css: 'a.css' },
    });
    const serverB = new Faker({
        name: 'bb',
        assets: { js: 'b.js', css: 'b.css' },
    });
    const [serviceA, serviceB] = await Promise.all([
        serverA.listen(),
        serverB.listen(),
    ]);

    const client = new Client();
    const a = client.register(serviceA.options);
    const b = client.register(serviceB.options);

    await Promise.all([a.fetch({}), b.fetch({})]);

    const dump = client.dump();

    expect(dump.length).toEqual(2);

    await Promise.all([serverA.close(), serverB.close()]);
});

/**
 * .load()
 */

test("client.load() - should load dumped resources' manifests", async () => {
    const serverA = new Faker({
        name: 'aa',
        assets: { js: 'a.js', css: 'a.css' },
    });
    const serverB = new Faker({
        name: 'bb',
        assets: { js: 'b.js', css: 'b.css' },
    });
    const [serviceA, serviceB] = await Promise.all([
        serverA.listen(),
        serverB.listen(),
    ]);

    const clientA = new Client();
    const aa = clientA.register(serviceA.options);
    const ab = clientA.register(serviceB.options);

    await Promise.all([aa.fetch({}), ab.fetch({})]);

    const clientB = new Client();
    clientB.register(serviceA.options);
    clientB.register(serviceB.options);

    const dump = clientA.dump();
    clientB.load(dump);

    expect(clientB.js()).toEqual(['a.js', 'b.js']);
    expect(clientB.css()).toEqual(['a.css', 'b.css']);

    await Promise.all([serverA.close(), serverB.close()]);
});
