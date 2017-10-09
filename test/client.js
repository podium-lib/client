'use strict';

const Resource = require('../lib/resource');
const Client = require('../');
const nock = require('nock');
const test = require('ava');
const path = require('path');
const fs = require('fs');

const EXAMPLE_A = fs.readFileSync(
    path.resolve(__dirname, 'fixtures/example.a.json'),
    { encoding: 'utf8' }
);

const EXAMPLE_B = fs.readFileSync(
    path.resolve(__dirname, 'fixtures/example.b.json'),
    { encoding: 'utf8' }
);

const EXAMPLE_C = fs.readFileSync(
    path.resolve(__dirname, 'fixtures/example.c.json'),
    { encoding: 'utf8' }
);

function mockServer() {
    const headers = {
        'podlet-version': '1.0.0-beta.2',
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

test('Client() - instantiate new client object - should have register method', t => {
    const client = new Client();
    t.true(typeof client.register === 'function');
});

/**
 * .register()
 */

test('client.register() - call with a valid value for "options.uri" - should return a "Resources" object', t => {
    const client = new Client();
    const resource = client.register({
        uri: 'http://example-a.org',
        name: 'example',
    });
    t.true(resource instanceof Resource);
});

test('client.register() - call with missing value for "options.uri" - should throw', t => {
    const client = new Client();
    const error = t.throws(() => {
        client.register({ name: 'someName' });
    }, Error);

    t.is(
        error.message,
        'The value for "options.uri", undefined, is not a valid URI'
    );
});

test('client.register() - call with a invalid value for "options.uri" - should throw', t => {
    const client = new Client();
    const error = t.throws(() => {
        client.register({ uri: '/wrong', name: 'someName' });
    }, Error);

    t.is(
        error.message,
        'The value for "options.uri", /wrong, is not a valid URI'
    );
});

test('client.register() - call with missing value for "options.name" - should throw', t => {
    const client = new Client();
    const error = t.throws(() => {
        client.register({ uri: 'http://example-a.org' });
    }, Error);

    t.is(
        error.message,
        'The value for "options.name", undefined, is not a valid name'
    );
});

test('client.register() - call duplicate names - should throw', t => {
    const client = new Client();
    client.register({ uri: 'http://example-a.org', name: 'someName' });
    const error = t.throws(() => {
        client.register({ uri: 'http://example-a.org', name: 'someName' });
    }, Error);

    t.is(
        error.message,
        'Resource with the name "someName" has already been registered.'
    );
});

/**
 * .js()
 */

test('client.js() - get all registered js assets - should return array with all js assets defined in manifests', async t => {
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

    const result = client.js();

    t.true(Array.isArray(result));
    t.true(result[0] === 'scripts-a.js');
    t.true(result[1] === 'scripts-b.js');
});

test('client.js() - one manifest does not hold js asset - should return array where non defined js asset is omitted', async t => {
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

    const result = client.js();

    t.true(Array.isArray(result));
    t.true(result.length === 2);
});

/**
 * .css()
 */

test('client.css() - get all registered css assets - should return array with all css assets defined in manifests', async t => {
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

    const result = client.css();

    t.true(Array.isArray(result));
    t.true(result[0] === 'styles-a.css');
    t.true(result[1] === 'styles-b.css');
});

test('client.css() - one manifest does not hold css asset - should return array where non defined css asset is omitted', async t => {
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

    const result = client.css();

    t.true(Array.isArray(result));
    t.true(result.length === 2);
});

/**
 * .getResource()
 */

test('client.getResource() - should return a registered resource', t => {
    const client = new Client();
    const a = client.register({
        uri: 'http://example.org/a/manifest.json',
        name: 'exampleA',
    });
    const b = client.register({
        uri: 'http://example.org/b/manifest.json',
        name: 'exampleB',
    });

    t.true(client.getResource('exampleA') === a);
    t.true(client.getResource('exampleB') === b);
    t.true(client.getResource('something else') === undefined);
});
