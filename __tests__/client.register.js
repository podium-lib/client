'use strict';

const Resource = require('../lib/resource');
const Client = require('../');

/**
 * .register()
 */

test('client.register() - call with a valid value for "options.uri" - should return a "Resources" object', () => {
    const client = new Client({ name: 'podiumClient' });
    const resource = client.register({
        uri: 'http://example-a.org',
        name: 'example',
    });
    expect(resource).toBeInstanceOf(Resource);
});

test('client.register() - call with no options - should throw', () => {
    const client = new Client({ name: 'podiumClient' });
    expect(() => {
        client.register();
    }).toThrowError(
        'The value, "undefined", for the required argument "name" on the .register() method is not defined or not valid.',
    );
});

test('client.register() - call with missing value for "options.uri" - should throw', () => {
    const client = new Client({ name: 'podiumClient' });

    expect(() => {
        client.register({ name: 'example' });
    }).toThrowError(
        'The value, "undefined", for the required argument "uri" on the .register() method is not defined or not valid.',
    );
});

test('client.register() - call with a invalid value for "options.uri" - should throw', () => {
    const client = new Client({ name: 'podiumClient' });

    expect(() => {
        client.register({ uri: '/wrong', name: 'someName' });
    }).toThrowError(
        'The value, "/wrong", for the required argument "uri" on the .register() method is not defined or not valid.',
    );
});

test('client.register() - call with a invalid value for "options.name" - should throw', () => {
    const client = new Client({ name: 'podiumClient' });

    expect(() => {
        client.register({ uri: 'http://example-a.org', name: 'some name' });
    }).toThrowError(
        'The value, "some name", for the required argument "name" on the .register() method is not defined or not valid.',
    );
});

test('client.register() - call with missing value for "options.name" - should throw', () => {
    const client = new Client({ name: 'podiumClient' });

    expect(() => {
        client.register({ uri: 'http://example-a.org' });
    }).toThrowError(
        'The value, "undefined", for the required argument "name" on the .register() method is not defined or not valid.',
    );
});

test('client.register() - call duplicate names - should throw', () => {
    const client = new Client({ name: 'podiumClient' });
    client.register({ uri: 'http://example-a.org', name: 'someName' });

    expect(() => {
        client.register({ uri: 'http://example-a.org', name: 'someName' });
    }).toThrowError(
        'Resource with the name "someName" has already been registered.',
    );
});

test('client.register() - register resources - should set resource as property of client object', () => {
    const client = new Client({ name: 'podiumClient' });
    const a = client.register({
        uri: 'http://example-a.org',
        name: 'exampleA',
    });
    const b = client.register({
        uri: 'http://example-b.org',
        name: 'exampleB',
    });
    expect(client).toHaveProperty('exampleA');
    expect(client).toHaveProperty('exampleB');
    expect(a).toEqual(client.exampleA);
    expect(b).toEqual(client.exampleB);
});

test('client.register() - register resources - should be possible to iterate over resources set on client object', () => {
    const client = new Client({ name: 'podiumClient' });
    const a = client.register({
        uri: 'http://example-a.org',
        name: 'exampleA',
    });
    const b = client.register({
        uri: 'http://example-b.org',
        name: 'exampleB',
    });

    expect([a, b]).toEqual(expect.arrayContaining(Array.from(client)));
});

test('client.register() - try to manually set register resource - should throw', () => {
    const client = new Client({ name: 'podiumClient' });
    client.register({
        uri: 'http://example-a.org',
        name: 'exampleA',
    });

    expect(() => {
        client.exampleA = 'foo';
    }).toThrowError('Cannot set read-only property.');
});
