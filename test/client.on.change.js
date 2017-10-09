'use strict';

const Client = require('../');
const Faker = require('./faker');
const test = require('ava');

test.cb(
    'client.on("change") - resource is new - should emit "change" event on first fetch',
    t => {
        const server = new Faker('1.0.0');
        server.listen().then(async service => {
            const client = new Client();
            client.on('change', manifest => {
                t.true(manifest.version === '1.0.0');
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
        const server = new Faker('1.0.0');
        server.listen().then(async service => {
            const client = new Client();
            client.on('change', manifest => {
                if (server.metrics.manifest === 2) {
                    t.true(manifest.version === '2.0.0');
                    t.end();
                }
            });

            const resource = client.register(service.options);
            await resource.fetch();
            await resource.fetch();
            await resource.fetch();
            server.version = '2.0.0';
            await resource.fetch();
        });
    }
);

test.cb(
    'client.on("change") - resource changes - should be a change in the emitted manifest',
    t => {
        const server = new Faker('1.0.0');
        server.listen().then(async service => {
            const client = new Client();
            client.on('change', manifest => {
                // Initial request to manifest
                if (server.metrics.manifest === 1) {
                    t.true(manifest.version === '1.0.0');
                }

                // Second request to manifest
                if (server.metrics.manifest === 2) {
                    t.true(manifest.version === '2.0.0');
                    t.end();
                }
            });

            const resource = client.register(service.options);
            await resource.fetch();
            await resource.fetch();
            await resource.fetch();
            server.version = '2.0.0';
            await resource.fetch();
        });
    }
);
