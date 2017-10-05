'use strict';

const Client = require('../');
const Faker = require('./faker');
const test = require('ava');

test.cb(
    'client.on("change") - resource is new - should emit "change" event on first fetch',
    t => {
        const server = new Faker();
        server.listen().then(async service => {
            const client = new Client();
            client.on('change', key => {
                t.true(key === service.manifest);
                t.end();
            });

            const resource = client.register(service.options);
            await resource.fetch();
        });
    }
);

test.cb(
    'client.on("change") - resource changes - should emit "change" event after update',
    t => {
        const server = new Faker();
        server.listen().then(async service => {
            const client = new Client();
            client.on('change', key => {
                if (server.metrics.manifest === 2) {
                    t.true(key === service.manifest);
                    t.end();
                }
            });

            const resource = client.register(service.options);
            await resource.fetch();
            await resource.fetch();
            await resource.fetch();
            server.version = 'b';
            await resource.fetch();
        });
    }
);
