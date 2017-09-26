'use strict';

const fallback = require('../lib/resolver.fallback.js');
const State = require('../lib/state.js');
const nock = require('nock');
const test = require('ava');
const path = require('path');
const fs = require('fs');

const MANIFEST_IS_ABSOLUTE_URI = fs.readFileSync(
    path.resolve(
        __dirname,
        'fixtures/manifest.fallback.is.absolute.uri.json'
    ),
    { encoding: 'utf8' }
);

const MANIFEST_NO_FALLBACK = fs.readFileSync(
    path.resolve(__dirname, 'fixtures/manifest.fallback.not.defined.json'),
    { encoding: 'utf8' }
);

const MANIFEST_IS_HTML = fs.readFileSync(
    path.resolve(__dirname, 'fixtures/manifest.fallback.is.html.json'),
    { encoding: 'utf8' }
);

const MANIFEST_IS_RELATIVE_URI = fs.readFileSync(
    path.resolve(__dirname, 'fixtures/manifest.fallback.is.relative.uri.json'),
    { encoding: 'utf8' }
);

test('resolver.fallback() - no fallback field - should return empty String', async t => {
    const state = new State();
    state.manifest = JSON.parse(MANIFEST_NO_FALLBACK);
    const result = await fallback(state);
    t.is(result.fallback, '');
});

test('resolver.fallback() - fallback field contains HTML - should set value on "state.fallback"', async t => {
    const state = new State();
    state.manifest = JSON.parse(MANIFEST_IS_HTML);
    const result = await fallback(state);
    t.is(result.fallback, '<p>haz fallback</p>');
});

test('resolver.fallback() - fallback field is a relative URI - should fetch fallback and set content on "state.fallback"', async t => {
    nock('http://example-a.org')
        .get('/fallback.html')
        .reply(200, '<p>served fallback</p>');

    const state = new State({}, { uri: 'http://example-a.org/manifest.json' });
    state.manifest = JSON.parse(MANIFEST_IS_RELATIVE_URI);
    const result = await fallback(state);
    t.is(result.fallback, '<p>served fallback</p>');
});

test('resolver.fallback() - fallback field is a relative URI - should fetch fallback and set content on "state.manifest.fallback"', async t => {
    nock('http://example-a.org')
        .get('/fallback.html')
        .reply(200, '<p>served fallback</p>');

    const state = new State({}, { uri: 'http://example-a.org/manifest.json' });
    state.manifest = JSON.parse(MANIFEST_IS_RELATIVE_URI);
    const result = await fallback(state);
    t.is(result.manifest.fallback, '<p>served fallback</p>');
});

test('resolver.fallback() - fallback field is a absolute URI - should fetch fallback and set content on "state.fallback"', async t => {
    nock('http://example-a.org')
        .get('/fallback.html')
        .reply(200, '<p>served fallback</p>');

    const state = new State({}, { uri: 'http://example-a.org/manifest.json' });
    state.manifest = JSON.parse(MANIFEST_IS_ABSOLUTE_URI);
    const result = await fallback(state);
    t.is(result.fallback, '<p>served fallback</p>');
});

test('resolver.fallback() - fallback field is a absolute URI - should fetch fallback and set content on "state.manifest.fallback"', async t => {
    nock('http://example-a.org')
        .get('/fallback.html')
        .reply(200, '<p>served fallback</p>');

    const state = new State({}, { uri: 'http://example-a.org/manifest.json' });
    state.manifest = JSON.parse(MANIFEST_IS_ABSOLUTE_URI);
    const result = await fallback(state);
    t.is(result.manifest.fallback, '<p>served fallback</p>');
});
