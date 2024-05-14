/* eslint-disable import/order */

import tap from 'tap';
import { PodletServer } from '@podium/test-utils';
import { HttpIncoming } from '@podium/utils';
import Client from '../lib/client.js';

// Fake headers
const headers = {};

/**
 * Constructor
 */

tap.test('Client() - instantiate new client object - should have register method', t => {
    const client = new Client({ name: 'podiumClient' });
    t.ok(client.register instanceof Function);
    t.end();
});

tap.test('Client() - object tag - should be PodiumClient', t => {
    const client = new Client({ name: 'podiumClient' });
    t.equal(Object.prototype.toString.call(client), '[object PodiumClient]');
    t.end();
});

/**
 * .refreshManifests()
 */

tap.test("client.refreshManifests() - should populate all resources' manifests", async t => {
    const serverA = new PodletServer({
        name: 'aa',
    });
    const serverB = new PodletServer({
        name: 'bb',
    });
    const [serviceA, serviceB] = await Promise.all([
        serverA.listen(),
        serverB.listen(),
    ]);

    const client = new Client({ name: 'podiumClient' });
    client.register(serviceA.options);
    client.register(serviceB.options);

    const fetchResult = await client.refreshManifests();

    t.equal(fetchResult, undefined);

    const dump = client.dump();
    t.equal(dump.length, 2);

    await Promise.all([serverA.close(), serverB.close()]);
});

/**
 * .dump()
 */

tap.test("client.dump() - should dump resources' manifests", async t => {
    const serverA = new PodletServer({
        name: 'aa',
    });
    const serverB = new PodletServer({
        name: 'bb',
    });
    const [serviceA, serviceB] = await Promise.all([
        serverA.listen(),
        serverB.listen(),
    ]);

    const client = new Client({ name: 'podiumClient' });
    const a = client.register(serviceA.options);
    const b = client.register(serviceB.options);

    const incoming = new HttpIncoming({ headers });

    await Promise.all([
        a.fetch(incoming), 
        b.fetch(incoming)
    ]);

    const dump = client.dump();

    t.equal(dump.length, 2);

    await Promise.all([serverA.close(), serverB.close()]);
});

/**
 * .load()
 */

tap.test("client.load() - should load dumped resources' manifests", async t => {
    const serverA = new PodletServer({
        name: 'aa',
    });
    const serverB = new PodletServer({
        name: 'bb',
    });
    const [serviceA, serviceB] = await Promise.all([
        serverA.listen(),
        serverB.listen(),
    ]);

    const clientA = new Client({ name: 'podiumClient' });
    const aa = clientA.register(serviceA.options);
    const ab = clientA.register(serviceB.options);

    const incoming = new HttpIncoming({ headers });

    await Promise.all([
        aa.fetch(incoming), 
        ab.fetch(incoming)
    ]);

    const clientB = new Client({ name: 'podiumClient' });
    clientB.register(serviceA.options);
    clientB.register(serviceB.options);

    const dumpA = clientA.dump();
    clientB.load(dumpA);

    const dumpB = clientB.dump();

    t.same(dumpA, dumpB);

    await Promise.all([serverA.close(), serverB.close()]);
});
