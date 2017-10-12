'use strict';

const Resource = require('../lib/resource');
const Client = require('../');

/**
 * .register()
 */

test('client.register() - call with a valid value for "options.uri" - should return a "Resources" object', () => {
    const client = new Client();
    const resource = client.register({
        uri: 'http://example-a.org',
        name: 'example',
    });
    expect(resource).toBeInstanceOf(Resource);
});

test('client.register() - call with missing value for "options.uri" - should throw', () => {
    const client = new Client();

    expect(() => {
        client.register({ name: 'example' });
    }).toThrowError(
        'The value for "options.uri", undefined, is not a valid URI'
    );
});

test('client.register() - call with a invalid value for "options.uri" - should throw', () => {
    const client = new Client();

    expect(() => {
        client.register({ uri: '/wrong', name: 'someName' });
    }).toThrowError('The value for "options.uri", /wrong, is not a valid URI');
});

test('client.register() - call with a invalid value for "options.name" - should throw', () => {
    const client = new Client();

    expect(() => {
        client.register({ uri: 'http://example-a.org', name: 'some-name' });
    }).toThrowError(
        'The value for "options.name", some-name, is not a valid name'
    );
});

test('client.register() - call with missing value for "options.name" - should throw', () => {
    const client = new Client();

    expect(() => {
        client.register({ uri: 'http://example-a.org' });
    }).toThrowError(
        'The value for "options.name", undefined, is not a valid name'
    );
});

test('client.register() - call duplicate names - should throw', () => {
    const client = new Client();
    client.register({ uri: 'http://example-a.org', name: 'someName' });

    expect(() => {
        client.register({ uri: 'http://example-a.org', name: 'someName' });
    }).toThrowError(
        'Resource with the name "someName" has already been registered.'
    );
});

test('client.register() - register resources - should set resource as property of client object', () => {
    const client = new Client();
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
    const client = new Client();
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
