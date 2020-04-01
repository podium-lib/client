'use strict';

const { test } = require('tap');
const Resource = require('../lib/resource');
const Client = require("..");

/**
 * .register()
 */

test('client.register() - call with a valid value for "options.uri" - should return a "Resources" object', t => {
    const client = new Client({ name: 'podiumClient' });
    const resource = client.register({
        uri: 'http://example-a.org',
        name: 'example',
    });
    t.ok(resource instanceof Resource);
    t.end();
});

test('client.register() - call with no options - should throw', t => {
    const client = new Client({ name: 'podiumClient' });
    t.throws(() => {
        client.register();
    }, 'The value, "undefined", for the required argument "name" on the .register() method is not defined or not valid.');
    t.end();
});

test('client.register() - call with missing value for "options.uri" - should throw', t => {
    const client = new Client({ name: 'podiumClient' });

    t.throws(() => {
        client.register({ name: 'example' });
    }, 'The value, "undefined", for the required argument "uri" on the .register() method is not defined or not valid.');
    t.end();
});

test('client.register() - call with a invalid value for "options.uri" - should throw', t => {
    const client = new Client({ name: 'podiumClient' });

    t.throws(() => {
        client.register({ uri: '/wrong', name: 'someName' });
    }, 'The value, "/wrong", for the required argument "uri" on the .register() method is not defined or not valid.');
    t.end();
});

test('client.register() - call with a invalid value for "options.name" - should throw', t => {
    const client = new Client({ name: 'podiumClient' });

    t.throws(() => {
        client.register({ uri: 'http://example-a.org', name: 'some name' });
    }, 'The value, "some name", for the required argument "name" on the .register() method is not defined or not valid.');
    t.end();
});

test('client.register() - call with missing value for "options.name" - should throw', t => {
    const client = new Client({ name: 'podiumClient' });

    t.throws(() => {
        client.register({ uri: 'http://example-a.org' });
    }, 'The value, "undefined", for the required argument "name" on the .register() method is not defined or not valid.');
    t.end();
});

test('client.register() - call duplicate names - should throw', t => {
    const client = new Client({ name: 'podiumClient' });
    client.register({ uri: 'http://example-a.org', name: 'someName' });

    t.throws(() => {
        client.register({ uri: 'http://example-a.org', name: 'someName' });
    }, 'Resource with the name "someName" has already been registered.');
    t.end();
});

test('client.register() - register resources - should set resource as property of client object', t => {
    const client = new Client({ name: 'podiumClient' });
    const a = client.register({
        uri: 'http://example-a.org',
        name: 'exampleA',
    });
    const b = client.register({
        uri: 'http://example-b.org',
        name: 'exampleB',
    });
    t.ok(client.exampleA);
    t.ok(client.exampleB);
    t.equal(a, client.exampleA);
    t.equal(b, client.exampleB);
    t.end();
});

test('client.register() - register resources - should be possible to iterate over resources set on client object', t => {
    const client = new Client({ name: 'podiumClient' });
    const a = client.register({
        uri: 'http://example-a.org',
        name: 'exampleA',
    });
    const b = client.register({
        uri: 'http://example-b.org',
        name: 'exampleB',
    });

    t.same([a, b], Array.from(client));
    t.end();
});

test('client.register() - try to manually set register resource - should throw', t => {
    const client = new Client({ name: 'podiumClient' });
    client.register({
        uri: 'http://example-a.org',
        name: 'exampleA',
    });

    t.throws(() => {
        client.exampleA = 'foo';
    }, 'Cannot set read-only property.');
    t.end();
});
