/* eslint no-unused-vars: "off" */
/* eslint-disable import/order */

import tap from 'tap';
import getStream from 'get-stream';
import stream from 'stream';
import Cache from 'ttl-mem-cache';

import { HttpIncoming } from '@podium/utils';
import Resource from '../lib/resource.js';
import State from '../lib/state.js';
import { PodletServer } from '@podium/test-utils';
import Client from '../lib/client.js';

const URI = 'http://example.org';

// Fake headers
const headers = {};

/**
 * Constructor
 */

tap.test('Resource() - object tag - should be PodletClientResource', t => {
    const resource = new Resource(new Cache(), new State(), { uri: URI });
    t.equal(
        Object.prototype.toString.call(resource),
        '[object PodiumClientResource]',
    );
    t.end();
});

tap.test('Resource() - no "registry" - should throw', t => {
    t.throws(() => {
        const resource = new Resource();
    }, 'you must pass a "registry" object to the PodiumClientResource constructor');
    t.end();
});

tap.test('Resource() - instantiate new resource object - should have "fetch" method', t => {
    const resource = new Resource(new Cache(), new State(), { uri: URI });
    t.ok(resource.fetch instanceof Function);
    t.end();
});

tap.test('Resource() - instantiate new resource object - should have "stream" method', t => {
    const resource = new Resource(new Cache(), new State(), { uri: URI });
    t.ok(resource.stream instanceof Function);
    t.end();
});

//
// .fetch()
//

tap.test('resource.fetch() - No HttpIncoming argument provided' , (t) => {
    const resource = new Resource(new Cache(), new State(), {});   
    t.rejects(resource.fetch(), new TypeError('you must pass an instance of "HttpIncoming" as the first argument to the .fetch() method'), 'should reject');
    t.end();
});

tap.test('resource.fetch() - should return a promise', async t => {
    const server = new PodletServer({ version: '1.0.0' });
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
    const fetch = resource.fetch(new HttpIncoming({ headers }));
    t.ok(fetch instanceof Promise);

    await fetch;

    await server.close();
    t.end();
});

tap.test('resource.fetch() - set context - should pass it on', async t => {
    const server = new PodletServer({ version: '1.0.0' });
    const service = await server.listen();
    server.on('req:content', (count, req) => {
        t.equal(req.headers['podium-locale'], 'nb-NO');
        t.equal(req.headers['podium-mount-origin'], 'http://www.example.org');
    });

    const resource = new Resource(new Cache(), new State(), service.options);
    const incoming = new HttpIncoming({ headers });
    incoming.context = {
        'podium-locale': 'nb-NO',
        'podium-mount-origin': 'http://www.example.org',
    };

    await resource.fetch(incoming);

    await server.close();
    t.end();
});

tap.test('resource.fetch() - returns an object with content, headers, js and css keys', async t => {
    const server = new PodletServer({
        assets: { js: 'http://fakejs.com', css: 'http://fakecss.com' },
    });
    const service = await server.listen();
    const resource = new Resource(new Cache(), new State(), service.options);

    const result = await resource.fetch(new HttpIncoming({ headers }));
    result.headers.date = '<replaced>';

    t.equal(result.content, '<p>content component</p>');
    t.same(result.headers, {
        connection: 'close',
        'content-length': '24',
        'content-type': 'text/html; charset=utf-8',
        date: '<replaced>',
        'podlet-version': '1.0.0',
    });
    t.same(result.css, [
        {
            type: 'text/css',
            value: 'http://fakecss.com',
        },
    ]);
    t.same(result.js, [
        {
            type: 'default',
            value: 'http://fakejs.com',
        },
    ]);

    await server.close();
    t.end();
});

tap.test('resource.fetch() - returns empty array for js and css when no assets are present in manifest', async t => {
    const server = new PodletServer();
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
    const result = await resource.fetch(new HttpIncoming({ headers }));
    result.headers.date = '<replaced>';

    t.equal(result.content, '<p>content component</p>');
    t.same(result.headers, {
        connection: 'close',
        'content-length': '24',
        'content-type': 'text/html; charset=utf-8',
        date: '<replaced>',
        'podlet-version': '1.0.0',
    });
    t.same(result.css, []);
    t.same(result.js, []);

    await server.close();
    t.end();
});

tap.test('resource.fetch() - redirectable flag - podlet responds with 302 redirect - redirect property is populated', async t => {
    const server = new PodletServer();
    server.headersContent = {
        location: 'http://redirects.are.us.com',
    };
    server.statusCode = 302;
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), {
        ...service.options,
        redirectable: true,
    });
    const result = await resource.fetch(new HttpIncoming({ headers }));
    result.headers.date = '<replaced>';

    t.equal(result.content, '');
    t.same(result.headers, {
        connection: 'close',
        'content-length': '24',
        'content-type': 'text/html; charset=utf-8',
        date: '<replaced>',
        'podlet-version': '1.0.0',
        location: 'http://redirects.are.us.com',
    });
    t.same(result.redirect, {
        statusCode: 302,
        location: 'http://redirects.are.us.com',
    });
    t.same(result.css, []);
    t.same(result.js, []);

    await server.close();
    t.end();
});

//
// .stream()
//

tap.test('resource.stream() - No HttpIncoming argument provided' , (t) => {
    const resource = new Resource(new Cache(), new State(), {});   
    t.plan(1);
    t.throws(() => {
        const strm = resource.stream(); // eslint-disable-line no-unused-vars
    }, "you must pass a  \"HttpIncoming\" object as the first argument to the .stream() method", 'Should throw');
    t.end();
});

tap.test('resource.stream() - should return a stream', async t => {
    const server = new PodletServer({ version: '1.0.0' });
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
    const strm = resource.stream(new HttpIncoming({ headers }));
    t.ok(strm instanceof stream);

    await getStream(strm);

    await server.close();
    t.end();
});

tap.test('resource.stream() - should emit beforeStream event with no assets', async t => {
    const server = new PodletServer({ version: '1.0.0' });
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
    const strm = resource.stream(new HttpIncoming({ headers }));
    strm.once('beforeStream', (res) => {
        t.equal(res.headers['podlet-version'], '1.0.0');
        t.same(res.js, []);
        t.same(res.css, []);
    });

    await getStream(strm);

    await server.close();
    t.end();
});

tap.test('resource.stream() - should emit js event when js assets defined', async t => {
    const server = new PodletServer({ assets: { js: 'http://fakejs.com' } });
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
    const strm = resource.stream(new HttpIncoming({ headers }));
    strm.once('beforeStream', ({ js }) => {
        t.same(js, [{ type: 'default', value: 'http://fakejs.com' }]);
    });

    await getStream(strm);

    await server.close();
    t.end();
});

tap.test('resource.stream() - should emit css event when css assets defined', async t => {
    const server = new PodletServer({ assets: { css: 'http://fakecss.com' } });
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
    const strm = resource.stream(new HttpIncoming({ headers }));
    strm.once('beforeStream', ({ css }) => {
        t.same(css, [{ type: 'text/css', value: 'http://fakecss.com' }]);
    });

    await getStream(strm);

    await server.close();
    t.end();
});

tap.test('resource.stream() - should emit beforeStream event before emitting data', async t => {
    const server = new PodletServer({
        assets: { js: 'http://fakejs.com', css: 'http://fakecss.com' },
    });
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
    const strm = resource.stream(new HttpIncoming({ headers }));
    const items = [];

    strm.once('beforeStream', beforeStream => {
        items.push(beforeStream);
    });
    strm.on('data', data => {
        items.push(data.toString());
    });

    await getStream(strm);

    t.same(items[0].css, [{ type: 'text/css', value: 'http://fakecss.com' }]);
    t.same(items[0].js, [{ type: 'default', value: 'http://fakejs.com' }]);
    t.equal(items[1], '<p>content component</p>');

    await server.close();
    t.end();
});

//
// .refresh()
//

tap.test('resource.refresh() - should return a promise', async t => {
    const server = new PodletServer({ version: '1.0.0' });
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
    const refresh = resource.refresh();
    t.ok(refresh instanceof Promise);

    await refresh;

    await server.close();
    t.end();
});

tap.test('resource.refresh() - manifest is available - should return "true"', async t => {
    const server = new PodletServer({ version: '1.0.0' });
    const service = await server.listen();

    const client = new Client({ name: 'podiumClient' });
    const component = client.register(service.options);

    const result = await component.refresh();

    t.equal(result, true);

    await server.close();
    t.end();
});

tap.test('resource.refresh() - manifest is NOT available - should return "false"', async t => {
    const client = new Client({ name: 'podiumClient' });

    const component = client.register({
        name: 'component',
        uri: 'http://does.not.exist.finn.no/manifest.json',
    });

    const result = await component.refresh();

    t.equal(result, false);
    t.end();
});

tap.test('resource.refresh() - manifest with fallback is available - should get manifest and fallback, but not content', async t => {
    const server = new PodletServer({ version: '1.0.0' });
    const service = await server.listen();

    const client = new Client({ name: 'podiumClient' });
    const component = client.register(service.options);

    await component.refresh();

    t.equal(server.metrics.manifest, 1);
    t.equal(server.metrics.fallback, 1);
    t.equal(server.metrics.content, 0);

    await server.close();
    t.end();
});

//
// .uri
//

tap.test('Resource().uri - instantiate new resource object - expose own uri', t => {
    const resource = new Resource(new Cache(), new State(), { uri: URI });
    t.equal(resource.uri, URI);
    t.end();
});

//
// .name
//

tap.test('Resource().name - instantiate new resource object - expose own name', t => {
    const resource = new Resource(new Cache(), new State(), {
        uri: URI,
        name: 'someName',
    });
    t.equal(resource.name, 'someName');
    t.end();
});
