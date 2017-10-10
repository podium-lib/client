'use strict';

const Client = require('../');

/**
 * Constructor
 */

test('Client() - instantiate new client object - should have register method', () => {
    const client = new Client();
    expect(client.register).toBeInstanceOf(Function);
});

/**
 * .getResource()
 */

test('client.getResource() - should return a registered resource', () => {
    const client = new Client();
    const a = client.register({
        uri: 'http://example.org/a/manifest.json',
        name: 'exampleA',
    });
    const b = client.register({
        uri: 'http://example.org/b/manifest.json',
        name: 'exampleB',
    });

    expect(client.getResource('exampleA')).toBe(a);
    expect(client.getResource('exampleB')).toBe(b);
    expect(client.getResource('something else')).toBeUndefined();
});
