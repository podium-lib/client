'use strict';

const Resource = require('../lib/resource');
const Client = require('../');
const nock = require('nock');
const path = require('path');
const fs = require('fs');

const EXAMPLE_A = fs.readFileSync(
    path.resolve(__dirname, '../test/fixtures/example.a.json'),
    { encoding: 'utf8' }
);

const EXAMPLE_B = fs.readFileSync(
    path.resolve(__dirname, '../test/fixtures/example.b.json'),
    { encoding: 'utf8' }
);

const EXAMPLE_C = fs.readFileSync(
    path.resolve(__dirname, '../test/fixtures/example.c.json'),
    { encoding: 'utf8' }
);

function makeVersion(index = 1) {
    return `1.0.0-beta.${index.toString()}`;
}

function mockServer() {
    const headers = {
        'podlet-version': makeVersion(2),
    };

    nock('http://example.org')
        .get('/a/index.html')
        .reply(200, '<p>A</p>', headers)
        .get('/b/index.html')
        .reply(200, '<p>B</p>', headers)
        .get('/c/index.html')
        .reply(200, '<p>C</p>', headers)
        .get('/a/manifest.json')
        .reply(200, EXAMPLE_A)
        .get('/b/manifest.json')
        .reply(200, EXAMPLE_B)
        .get('/c/manifest.json')
        .reply(200, EXAMPLE_C);
}

/**
 * Constructor
 */

test('Client() - instantiate new client object - should have register method', () => {
    const client = new Client();
    expect(client.register).toBeInstanceOf(Function);
});

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

/**
 * .js()
 */

test('client.js() - get all registered js assets - should return array with all js assets defined in manifests', async () => {
    mockServer();

    const client = new Client();
    const a = client.register({
        uri: 'http://example.org/a/manifest.json',
        name: 'exampleA',
    });
    const b = client.register({
        uri: 'http://example.org/b/manifest.json',
        name: 'exampleB',
    });

    await Promise.all([a.fetch(), b.fetch()]);

    expect(client.js()).toEqual(['scripts-a.js', 'scripts-b.js']);
});

test('client.js() - one manifest does not hold js asset - should return array where non defined js asset is omitted', async () => {
    mockServer();

    const client = new Client();
    const a = client.register({
        uri: 'http://example.org/a/manifest.json',
        name: 'exampleA',
    });
    const b = client.register({
        uri: 'http://example.org/b/manifest.json',
        name: 'exampleB',
    });
    const c = client.register({
        uri: 'http://example.org/c/manifest.json',
        name: 'exampleC',
    });

    await Promise.all([a.fetch(), b.fetch(), c.fetch()]);

    expect(client.js()).toEqual(['scripts-a.js', 'scripts-b.js']);
});

/**
 * .css()
 */

test('client.css() - get all registered css assets - should return array with all css assets defined in manifests', async () => {
    mockServer();

    const client = new Client();
    const a = client.register({
        uri: 'http://example.org/a/manifest.json',
        name: 'exampleA',
    });
    const b = client.register({
        uri: 'http://example.org/b/manifest.json',
        name: 'exampleB',
    });

    await Promise.all([a.fetch(), b.fetch()]);

    expect(client.css()).toEqual(['styles-a.css', 'styles-b.css']);
});

test('client.css() - one manifest does not hold css asset - should return array where non defined css asset is omitted', async () => {
    mockServer();

    const client = new Client();
    const a = client.register({
        uri: 'http://example.org/a/manifest.json',
        name: 'exampleA',
    });
    const b = client.register({
        uri: 'http://example.org/b/manifest.json',
        name: 'exampleB',
    });
    const c = client.register({
        uri: 'http://example.org/c/manifest.json',
        name: 'exampleC',
    });

    await Promise.all([a.fetch(), b.fetch(), c.fetch()]);

    expect(client.css()).toEqual(['styles-a.css', 'styles-b.css']);
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
