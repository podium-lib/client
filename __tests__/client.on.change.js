/* eslint-disable no-plusplus */

'use strict';

const { test } = require('tap');
const { PodletServer } = require('@podium/test-utils');
const Client = require('../');

test('client.on("change") - resource is new - should emit "change" event on first fetch', async t => {
    t.plan(1);
    const server = new PodletServer({ version: '1.0.0' });
    const service = await server.listen();

    const client = new Client({ name: 'podiumClient' });
    const changePromise = new Promise(resolve => {
        client.on('change', manifest => {
            t.equal(manifest.version, '1.0.0');
            resolve();
        });
    });

    const resource = client.register(service.options);
    await resource.fetch({});

    await changePromise;

    await server.close();
});

test('client.on("change") - resource changes - should emit "change" event after update', async t => {
    t.plan(1);
    const serverVer1 = new PodletServer({ version: '1.0.0' });
    const service = await serverVer1.listen();

    const client = new Client({ name: 'podiumClient' });
    let count = 0;
    client.on('change', manifest => {
        if (count > 0) {
            t.equal(manifest.version, '2.0.0');
        }
        count++;
    });

    const resource = client.register(service.options);
    await resource.fetch({});
    await resource.fetch({});
    await resource.fetch({});

    await serverVer1.close();

    const serverVer2 = new PodletServer({ version: '2.0.0' });
    await serverVer2.listen(service.address);

    await resource.fetch({});
    await resource.fetch({});
    await resource.fetch({});

    await serverVer2.close();
});

test('client.on("change") - resource changes - should be a change in the emitted manifest', async t => {
    t.plan(2);

    const serverVer1 = new PodletServer({ version: '1.0.0' });
    const service = await serverVer1.listen();

    const client = new Client({ name: 'podiumClient' });
    let count = 0;
    client.on('change', manifest => {
        // Initial request to manifest
        if (count === 0) {
            t.equal(manifest.version, '1.0.0');
        }

        // Second request to manifest
        if (count === 1) {
            t.equal(manifest.version, '2.0.0');
        }
        count++;
    });

    const resource = client.register(service.options);
    await resource.fetch({});
    await resource.fetch({});
    await resource.fetch({});

    await serverVer1.close();

    const serverVer2 = new PodletServer({ version: '2.0.0' });
    await serverVer2.listen(service.address);

    await resource.fetch({});
    await resource.fetch({});
    await resource.fetch({});

    await serverVer2.close();
});
