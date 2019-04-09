/* eslint-disable no-plusplus */

'use strict';

const Client = require('../');
const Faker = require('../test/faker');

test('client.on("change") - resource is new - should emit "change" event on first fetch', async () => {
    const server = new Faker({ version: '1.0.0' });
    const service = await server.listen();

    const client = new Client();
    const changePromise = new Promise(resolve => {
        client.on('change', manifest => {
            expect(manifest.version === '1.0.0').toBe(true);
            resolve();
        });
    });

    const resource = client.register(service.options);
    await resource.fetch({});

    await changePromise;

    await server.close();
});

test('client.on("change") - resource changes - should emit "change" event after update', async () => {
    expect.assertions(1);

    const serverVer1 = new Faker({ version: '1.0.0' });
    const service = await serverVer1.listen();

    const client = new Client();
    let count = 0;
    client.on('change', manifest => {
        if (count > 0) {
            expect(manifest.version).toBe('2.0.0');
        }
        count++;
    });

    const resource = client.register(service.options);
    await resource.fetch({});
    await resource.fetch({});
    await resource.fetch({});

    await serverVer1.close();

    const serverVer2 = new Faker({ version: '2.0.0' });
    await serverVer2.listen(service.address);

    await resource.fetch({});
    await resource.fetch({});
    await resource.fetch({});

    await serverVer2.close();
});

test('client.on("change") - resource changes - should be a change in the emitted manifest', async () => {
    expect.assertions(2);

    const serverVer1 = new Faker({ version: '1.0.0' });
    const service = await serverVer1.listen();

    const client = new Client();
    let count = 0;
    client.on('change', manifest => {
        // Initial request to manifest
        if (count === 0) {
            expect(manifest.version).toBe('1.0.0');
        }

        // Second request to manifest
        if (count === 1) {
            expect(manifest.version).toBe('2.0.0');
        }
        count++;
    });

    const resource = client.register(service.options);
    await resource.fetch({});
    await resource.fetch({});
    await resource.fetch({});

    await serverVer1.close();

    const serverVer2 = new Faker({ version: '2.0.0' });
    await serverVer2.listen(service.address);

    await resource.fetch({});
    await resource.fetch({});
    await resource.fetch({});

    await serverVer2.close();
});
