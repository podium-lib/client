'use strict';

const Client = require('../');
const Faker = require('../test/faker');

/**
 * Constructor
 */

test('Client() - instantiate new client object - should have register method', () => {
    const client = new Client();
    expect(client.register).toBeInstanceOf(Function);
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
    const serviceA = await serverA.listen();
    const serviceB = await serverB.listen();

    const client = new Client();
    client.register(serviceA.options);
    client.register(serviceB.options);

    expect(client.js()).toEqual([]);
    expect(client.css()).toEqual([]);

    const fetchResult = await client.refreshManifests();

    expect(client.js()).toEqual(['a.js', 'b.js']);
    expect(client.css()).toEqual(['a.css', 'b.css']);
    expect(fetchResult).toBeUndefined();

    await serverA.close();
    await serverB.close();
});
