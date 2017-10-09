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
        name: 'example-a',
    });
    t.true(resource instanceof Resource);
});

test('client.register() - call with missing value for "options.uri" - should throw', t => {
    const client = new Client();
    const error = t.throws(() => {
        client.register({});
    }, Error);

    t.is(error.message, '"options.uri" must be defined');
});

test('client.register() - call with a invalid value for "options.uri" - should throw', t => {
    const client = new Client();
    const error = t.throws(() => {
        client.register({ uri: '/wrong', name: 'some-name' });
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

    t.is(error.message, '"options.name" must be defined');
});

test('client.register() - call duplicate names - should throw', t => {
    const client = new Client();
    client.register({ uri: 'http://example-a.org', name: 'some-name' });
    const error = t.throws(() => {
        client.register({ uri: 'http://example-a.org', name: 'some-name' });
    }, Error);

    t.is(
        error.message,
        'Resource with the name "some-name" has already been registered.'
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
        name: 'example-a',
    });
    const b = client.register({
        uri: 'http://example.org/b/manifest.json',
        name: 'example-b',
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
        name: 'example-a',
    });
    const b = client.register({
        uri: 'http://example.org/b/manifest.json',
        name: 'example-b',
    });
    const c = client.register({
        uri: 'http://example.org/c/manifest.json',
        name: 'example-c',
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
        name: 'example-a',
    });
    const b = client.register({
        uri: 'http://example.org/b/manifest.json',
        name: 'example-b',
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
        name: 'example-a',
    });
    const b = client.register({
        uri: 'http://example.org/b/manifest.json',
        name: 'example-b',
    });
    const c = client.register({
        uri: 'http://example.org/c/manifest.json',
        name: 'example-c',
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
        name: 'example-a',
    });
    const b = client.register({
        uri: 'http://example.org/b/manifest.json',
        name: 'example-b',
    });

    t.true(client.getResource('example-a') === a);
    t.true(client.getResource('example-b') === b);
    t.true(client.getResource('something else') === undefined);
});
