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
 * .refreshManifests()
 */

test("client.refreshManifests() - should populate all resources' manifests", async () => {
    mockServer();

    const client = new Client();

    client.register({
        uri: 'http://example.org/a/manifest.json',
        name: 'exampleA',
    });
    client.register({
        uri: 'http://example.org/b/manifest.json',
        name: 'exampleB',
    });
    client.register({
        uri: 'http://example.org/c/manifest.json',
        name: 'exampleC',
    });

    expect(client.js()).toEqual([]);
    expect(client.css()).toEqual([]);

    const fetchResult = await client.refreshManifests();

    expect(client.js()).toEqual(['scripts-a.js', 'scripts-b.js']);
    expect(client.css()).toEqual(['styles-a.css', 'styles-b.css']);
    expect(fetchResult).toBeUndefined();
});
