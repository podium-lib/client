'use strict';

// const Resource = require('../lib/resource');
const Client = require('../');
const nock = require('nock');
const path = require('path');
const fs = require('fs');

const EXAMPLE_A_JSON = fs.readFileSync(
    path.resolve(__dirname, '../test/fixtures/example.a.json'),
    { encoding: 'utf8' }
);
const EXAMPLE_A_HTML = fs.readFileSync(
    path.resolve(__dirname, '../test/fixtures/example.a.html'),
    { encoding: 'utf8' }
);

test('integration basic - ', async () => {
    nock('http://example-a.org')
        // .log(console.log)
        .get('/manifest.json')
        .reply(200, EXAMPLE_A_JSON)
        .get('/index.html')
        .reply(200, EXAMPLE_A_HTML, {
            'podlet-version': '1.0.0-beta.2',
        });

    const client = new Client();
    const component = client.register({
        uri: 'http://example-a.org/manifest.json',
        name: 'exampleA',
    });

    const content = await component.fetch();
    expect(EXAMPLE_A_HTML.trim()).toBe(content.trim());
});
