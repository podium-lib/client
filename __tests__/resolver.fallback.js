'use strict';

const fallback = require('../lib/resolver.fallback.js');
const State = require('../lib/state.js');
const nock = require('nock');
const path = require('path');
const fs = require('fs');

const MANIFEST_IS_ABSOLUTE_URI = fs.readFileSync(
    path.resolve(
        __dirname,
        '../test/fixtures/manifest.fallback.is.absolute.uri.json'
    ),
    { encoding: 'utf8' }
);

const MANIFEST_NO_FALLBACK = fs.readFileSync(
    path.resolve(
        __dirname,
        '../test/fixtures/manifest.fallback.not.defined.json'
    ),
    { encoding: 'utf8' }
);

const MANIFEST_IS_HTML = fs.readFileSync(
    path.resolve(__dirname, '../test/fixtures/manifest.fallback.is.html.json'),
    { encoding: 'utf8' }
);

const MANIFEST_IS_RELATIVE_URI = fs.readFileSync(
    path.resolve(
        __dirname,
        '../test/fixtures/manifest.fallback.is.relative.uri.json'
    ),
    { encoding: 'utf8' }
);

test('resolver.fallback() - no fallback field - should return empty String', async () => {
    const state = new State();
    state.manifest = JSON.parse(MANIFEST_NO_FALLBACK);
    const result = await fallback(state);
    expect(result.fallback).toBe('');
});

test('resolver.fallback() - fallback field contains HTML - should set value on "state.fallback"', async () => {
    const state = new State();
    state.manifest = JSON.parse(MANIFEST_IS_HTML);
    const result = await fallback(state);
    expect(result.fallback).toBe('<p>haz fallback</p>');
});

test('resolver.fallback() - fallback field is a relative URI - should fetch fallback and set content on "state.fallback"', async () => {
    nock('http://example-a.org')
        .get('/fallback.html')
        .reply(200, '<p>served fallback</p>');

    const state = new State({}, { uri: 'http://example-a.org/manifest.json' });
    state.manifest = JSON.parse(MANIFEST_IS_RELATIVE_URI);
    const result = await fallback(state);
    expect(result.fallback).toBe('<p>served fallback</p>');
});

test('resolver.fallback() - fallback field is a relative URI - should fetch fallback and set content on "state.manifest.fallback"', async () => {
    nock('http://example-a.org')
        .get('/fallback.html')
        .reply(200, '<p>served fallback</p>');

    const state = new State({}, { uri: 'http://example-a.org/manifest.json' });
    state.manifest = JSON.parse(MANIFEST_IS_RELATIVE_URI);
    const result = await fallback(state);
    expect(result.manifest.fallback).toBe('<p>served fallback</p>');
});

test('resolver.fallback() - fallback field is a absolute URI - should fetch fallback and set content on "state.fallback"', async () => {
    nock('http://example-a.org')
        .get('/fallback.html')
        .reply(200, '<p>served fallback</p>');

    const state = new State({}, { uri: 'http://example-a.org/manifest.json' });
    state.manifest = JSON.parse(MANIFEST_IS_ABSOLUTE_URI);
    const result = await fallback(state);
    expect(result.fallback).toBe('<p>served fallback</p>');
});

test('resolver.fallback() - fallback field is a absolute URI - should fetch fallback and set content on "state.manifest.fallback"', async () => {
    nock('http://example-a.org')
        .get('/fallback.html')
        .reply(200, '<p>served fallback</p>');

    const state = new State({}, { uri: 'http://example-a.org/manifest.json' });
    state.manifest = JSON.parse(MANIFEST_IS_ABSOLUTE_URI);
    const result = await fallback(state);
    expect(result.manifest.fallback).toBe('<p>served fallback</p>');
});
