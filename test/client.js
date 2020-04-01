/* eslint-disable import/order */

'use strict';

const { test } = require('tap');
const { PodletServer } = require('@podium/test-utils');
const lolex = require('@sinonjs/fake-timers');
const Client = require("..");

/**
 * Constructor
 */

test('Client() - instantiate new client object - should have register method', t => {
    const client = new Client({ name: 'podiumClient' });
    t.ok(client.register instanceof Function);
    t.end();
});

test('Client() - object tag - should be PodiumClient', t => {
    const client = new Client({ name: 'podiumClient' });
    t.equal(Object.prototype.toString.call(client), '[object PodiumClient]');
    t.end();
});

/**
 * .on('dispose')
 */

test('Client().on("dispose") - client is hot, manifest reaches timeout - should emit dispose event', async t => {
    t.plan(1);
    const clock = lolex.install();

    const server = new PodletServer({
        name: 'aa',
    });
    const service = await server.listen();

    const client = new Client({
        name: 'podiumClient',
        maxAge: 24 * 60 * 60 * 1000,
    });
    client.on('dispose', key => {
        t.equal(key, service.options.name);
        t.end();
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

test("client.refreshManifests() - should populate all resources' manifests", async t => {
    const serverA = new PodletServer({
        name: 'aa',
        assets: { js: 'a.js', css: 'a.css' },
    });
    const serverB = new PodletServer({
        name: 'bb',
        assets: { js: 'b.js', css: 'b.css' },
    });
    const [serviceA, serviceB] = await Promise.all([
        serverA.listen(),
        serverB.listen(),
    ]);

    const client = new Client({ name: 'podiumClient' });
    client.register(serviceA.options);
    client.register(serviceB.options);

    t.same(client.js(), []);
    t.same(client.css(), []);

    const fetchResult = await client.refreshManifests();

    t.same(client.js(), ['a.js', 'b.js']);
    t.same(client.css(), ['a.css', 'b.css']);
    t.equal(fetchResult, undefined);

    await Promise.all([serverA.close(), serverB.close()]);
});

/**
 * .dump()
 */

test("client.dump() - should dump resources' manifests", async t => {
    const serverA = new PodletServer({
        name: 'aa',
        assets: { js: 'a.js', css: 'a.css' },
    });
    const serverB = new PodletServer({
        name: 'bb',
        assets: { js: 'b.js', css: 'b.css' },
    });
    const [serviceA, serviceB] = await Promise.all([
        serverA.listen(),
        serverB.listen(),
    ]);

    const client = new Client({ name: 'podiumClient' });
    const a = client.register(serviceA.options);
    const b = client.register(serviceB.options);

    await Promise.all([a.fetch({}), b.fetch({})]);

    const dump = client.dump();

    t.equal(dump.length, 2);

    await Promise.all([serverA.close(), serverB.close()]);
});

/**
 * .load()
 */

test("client.load() - should load dumped resources' manifests", async t => {
    const serverA = new PodletServer({
        name: 'aa',
        assets: { js: 'a.js', css: 'a.css' },
    });
    const serverB = new PodletServer({
        name: 'bb',
        assets: { js: 'b.js', css: 'b.css' },
    });
    const [serviceA, serviceB] = await Promise.all([
        serverA.listen(),
        serverB.listen(),
    ]);

    const clientA = new Client({ name: 'podiumClient' });
    const aa = clientA.register(serviceA.options);
    const ab = clientA.register(serviceB.options);

    await Promise.all([aa.fetch({}), ab.fetch({})]);

    const clientB = new Client({ name: 'podiumClient' });
    clientB.register(serviceA.options);
    clientB.register(serviceB.options);

    const dump = clientA.dump();
    clientB.load(dump);

    t.same(clientB.js(), ['a.js', 'b.js']);
    t.same(clientB.css(), ['a.css', 'b.css']);

    await Promise.all([serverA.close(), serverB.close()]);
});
