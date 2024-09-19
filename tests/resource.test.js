import tap from 'tap';
import getStream from 'get-stream';
import stream from 'stream';
// @ts-ignore
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

tap.test('Resource() - object tag - should be PodletClientResource', (t) => {
    const resource = new Resource(new Cache(), new State(), {
        uri: URI,
        name: 'someName',
        clientName: 'someName',
        timeout: 1000,
        maxAge: Infinity,
    });
    t.equal(
        Object.prototype.toString.call(resource),
        '[object PodiumClientResource]',
    );
    t.end();
});

tap.test('Resource() - no "registry" - should throw', (t) => {
    t.throws(() => {
        // @ts-expect-error Testing bad input
        // eslint-disable-next-line no-unused-vars
        const resource = new Resource();
    }, 'you must pass a "registry" object to the PodiumClientResource constructor');
    t.end();
});

tap.test(
    'Resource() - instantiate new resource object - should have "fetch" method',
    (t) => {
        const resource = new Resource(new Cache(), new State(), {
            uri: URI,
            name: 'someName',
            clientName: 'someName',
            timeout: 1000,
            maxAge: Infinity,
        });
        t.ok(resource.fetch instanceof Function);
        t.end();
    },
);

tap.test(
    'Resource() - instantiate new resource object - should have "stream" method',
    (t) => {
        const resource = new Resource(new Cache(), new State(), {
            uri: URI,
            name: 'someName',
            clientName: 'someName',
            timeout: 1000,
            maxAge: Infinity,
        });
        t.ok(resource.stream instanceof Function);
        t.end();
    },
);

//
// .fetch()
//

tap.test('resource.fetch() - No HttpIncoming argument provided', (t) => {
    const resource = new Resource(new Cache(), new State(), {
        uri: URI,
        name: 'someName',
        clientName: 'someName',
        timeout: 1000,
        maxAge: Infinity,
    });
    t.rejects(
        // @ts-expect-error Testing bad input
        resource.fetch(),
        new TypeError(
            'you must pass an instance of "HttpIncoming" as the first argument to the .fetch() method',
        ),
        'should reject',
    );
    t.end();
});

tap.test('resource.fetch() - should return a promise', async (t) => {
    const server = new PodletServer({ version: '1.0.0' });
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
    const fetch = resource.fetch(new HttpIncoming({ headers }));
    t.ok(fetch instanceof Promise);

    await fetch;

    await server.close();
    t.end();
});

tap.test('resource.fetch() - set context - should pass it on', async (t) => {
    const server = new PodletServer({ version: '1.0.0' });
    const service = await server.listen();
    // @ts-ignore
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

tap.test(
    'resource.fetch() - returns an object with content, headers, js and css keys',
    async (t) => {
        const server = new PodletServer({
            assets: { js: 'http://fakejs.com', css: 'http://fakecss.com' },
        });
        const service = await server.listen();
        const resource = new Resource(
            new Cache(),
            new State(),
            service.options,
        );

        const result = await resource.fetch(new HttpIncoming({ headers }));
        result.headers.date = '<replaced>';

        t.equal(result.content, '<p>content component</p>');
        t.same(result.headers, {
            connection: 'keep-alive',
            'keep-alive': 'timeout=5',
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
    },
);

tap.test(
    'resource.fetch() - returns empty array for js and css when no assets are present in manifest',
    async (t) => {
        const server = new PodletServer();
        const service = await server.listen();

        const resource = new Resource(
            new Cache(),
            new State(),
            service.options,
        );
        const result = await resource.fetch(new HttpIncoming({ headers }));
        result.headers.date = '<replaced>';

        t.equal(result.content, '<p>content component</p>');
        t.same(result.headers, {
            connection: 'keep-alive',
            'keep-alive': 'timeout=5',
            'content-length': '24',
            'content-type': 'text/html; charset=utf-8',
            date: '<replaced>',
            'podlet-version': '1.0.0',
        });
        t.same(result.css, []);
        t.same(result.js, []);

        await server.close();
        t.end();
    },
);

tap.test(
    'resource.fetch() - redirectable flag - podlet responds with 302 redirect - redirect property is populated',
    async (t) => {
        const server = new PodletServer();
        // @ts-ignore
        server.headersContent = {
            location: 'http://redirects.are.us.com',
        };
        // @ts-ignore
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
            connection: 'keep-alive',
            'keep-alive': 'timeout=5',
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
    },
);

tap.test(
    'resource.fetch() - assets filtering by scope for a successful fetch',
    async (t) => {
        t.plan(8);

        const server = new PodletServer({ version: '1.0.0' });
        const manifest = JSON.parse(server._bodyManifest);
        manifest.js = [
            { value: '/foo', scope: 'content' },
            { value: '/bar', scope: 'fallback' },
            { value: '/baz', scope: 'all' },
            { value: '/foobarbaz' },
        ];
        manifest.css = [
            { value: '/foo', scope: 'content' },
            { value: '/bar', scope: 'fallback' },
            { value: '/baz', scope: 'all' },
            { value: '/foobarbaz' },
        ];
        server._bodyManifest = JSON.stringify(manifest);

        const service = await server.listen();

        const resource = new Resource(
            new Cache(),
            new State(),
            service.options,
        );
        const result = await resource.fetch(new HttpIncoming({ headers }));

        t.equal(result.js.length, 3);
        t.equal(result.js[0].scope, 'content');
        t.equal(result.js[1].scope, 'all');
        t.equal(result.js[2].scope, undefined);
        t.equal(result.css.length, 3);
        t.equal(result.css[0].scope, 'content');
        t.equal(result.css[1].scope, 'all');
        t.equal(result.css[2].scope, undefined);

        await server.close();
        t.end();
    },
);

tap.test(
    'resource.fetch() - assets filtering by scope for an unsuccessful fetch',
    async (t) => {
        t.plan(8);

        const server = new PodletServer({ version: '1.0.0' });
        const manifest = JSON.parse(server._bodyManifest);
        manifest.js = [
            { value: '/foo', scope: 'content' },
            { value: '/bar', scope: 'fallback' },
            { value: '/baz', scope: 'all' },
            { value: '/foobarbaz' },
        ];
        manifest.css = [
            { value: '/foo', scope: 'content' },
            { value: '/bar', scope: 'fallback' },
            { value: '/baz', scope: 'all' },
            { value: '/foobarbaz' },
        ];
        server._bodyManifest = JSON.stringify(manifest);

        const service = await server.listen();

        const resource = new Resource(
            new Cache(),
            new State(),
            service.options,
        );
        await resource.fetch(new HttpIncoming({ headers }));

        // close server to trigger fallback
        await server.close();

        const result = await resource.fetch(new HttpIncoming({ headers }));

        t.equal(result.js.length, 3);
        t.equal(result.js[0].scope, 'fallback');
        t.equal(result.js[1].scope, 'all');
        t.equal(result.js[2].scope, undefined);
        t.equal(result.css.length, 3);
        t.equal(result.css[0].scope, 'fallback');
        t.equal(result.css[1].scope, 'all');
        t.equal(result.css[2].scope, undefined);

        t.end();
    },
);

/**
 * .stream()
 */

tap.test('resource.stream() - No HttpIncoming argument provided', (t) => {
    const resource = new Resource(new Cache(), new State(), {
        uri: URI,
        name: 'someName',
        clientName: 'someName',
        timeout: 1000,
        maxAge: Infinity,
    });
    t.plan(1);
    t.throws(() => {
        // @ts-expect-error Testing bad input
        resource.stream();
    }, 'you must pass an instance of "HttpIncoming" as the first argument to the .stream() method');
    t.end();
});

tap.test('resource.stream() - should return a stream', async (t) => {
    const server = new PodletServer({ version: '1.0.0' });
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
    const strm = resource.stream(new HttpIncoming({ headers }));
    t.ok(strm instanceof stream);

    await getStream(strm);

    await server.close();
    t.end();
});

tap.test(
    'resource.stream() - should emit beforeStream event with no assets',
    async (t) => {
        const server = new PodletServer({ version: '1.0.0' });
        const service = await server.listen();

        const resource = new Resource(
            new Cache(),
            new State(),
            service.options,
        );
        const strm = resource.stream(new HttpIncoming({ headers }));
        strm.once('beforeStream', (res) => {
            t.equal(res.headers['podlet-version'], '1.0.0');
            t.same(res.js, []);
            t.same(res.css, []);
        });

        await getStream(strm);

        await server.close();
        t.end();
    },
);

tap.test(
    'resource.stream() - should emit beforeStream event with filtered assets',
    async (t) => {
        t.plan(9);

        const server = new PodletServer({ version: '1.0.0' });
        const manifest = JSON.parse(server._bodyManifest);
        manifest.js = [
            { value: '/foo', scope: 'content' },
            { value: '/bar', scope: 'fallback' },
            { value: '/baz', scope: 'all' },
            { value: '/foobarbaz' },
        ];
        manifest.css = [
            { value: '/foo', scope: 'content' },
            { value: '/bar', scope: 'fallback' },
            { value: '/baz', scope: 'all' },
            { value: '/foobarbaz' },
        ];
        server._bodyManifest = JSON.stringify(manifest);
        const service = await server.listen();

        const resource = new Resource(
            new Cache(),
            new State(),
            service.options,
        );
        const strm = resource.stream(new HttpIncoming({ headers }));
        strm.once('beforeStream', ({ headers: h, js, css }) => {
            t.equal(h['podlet-version'], '1.0.0');
            t.equal(js.length, 3);
            t.equal(js[0].scope, 'content');
            t.equal(js[1].scope, 'all');
            t.equal(js[2].scope, undefined);
            t.equal(css.length, 3);
            t.equal(css[0].scope, 'content');
            t.equal(css[1].scope, 'all');
            t.equal(css[2].scope, undefined);
        });

        await getStream(strm);

        await server.close();
        t.end();
    },
);

tap.test(
    'resource.stream() - should emit beforeStream event with filtered assets',
    async (t) => {
        t.plan(8);

        const server = new PodletServer({ version: '1.0.0' });
        const manifest = JSON.parse(server._bodyManifest);
        manifest.js = [
            { value: '/foo', scope: 'content' },
            { value: '/bar', scope: 'fallback' },
            { value: '/baz', scope: 'all' },
            { value: '/foobarbaz' },
        ];
        manifest.css = [
            { value: '/foo', scope: 'content' },
            { value: '/bar', scope: 'fallback' },
            { value: '/baz', scope: 'all' },
            { value: '/foobarbaz' },
        ];
        server._bodyManifest = JSON.stringify(manifest);
        const service = await server.listen();

        const resource = new Resource(
            new Cache(),
            new State(),
            service.options,
        );
        await resource.fetch(new HttpIncoming({ headers }));

        // close server to trigger fallback
        await server.close();

        const strm = resource.stream(new HttpIncoming({ headers }));
        strm.once('beforeStream', ({ js, css }) => {
            t.equal(js.length, 3);
            t.equal(js[0].scope, 'fallback');
            t.equal(js[1].scope, 'all');
            t.equal(js[2].scope, undefined);
            t.equal(css.length, 3);
            t.equal(css[0].scope, 'fallback');
            t.equal(css[1].scope, 'all');
            t.equal(css[2].scope, undefined);
        });

        await getStream(strm);
        t.end();
    },
);

tap.test(
    'resource.stream() - should emit js event when js assets defined',
    async (t) => {
        t.plan(1);

        const server = new PodletServer({
            assets: { js: 'http://fakejs.com' },
        });
        const service = await server.listen();

        const resource = new Resource(
            new Cache(),
            new State(),
            service.options,
        );
        const strm = resource.stream(new HttpIncoming({ headers }));
        strm.once('beforeStream', ({ js }) => {
            t.same(js, [{ type: 'default', value: 'http://fakejs.com' }]);
        });

        await getStream(strm);

        await server.close();
        t.end();
    },
);

tap.test(
    'resource.stream() - should emit css event when css assets defined',
    async (t) => {
        const server = new PodletServer({
            assets: { css: 'http://fakecss.com' },
        });
        const service = await server.listen();

        const resource = new Resource(
            new Cache(),
            new State(),
            service.options,
        );
        const strm = resource.stream(new HttpIncoming({ headers }));
        strm.once('beforeStream', ({ css }) => {
            t.same(css, [{ type: 'text/css', value: 'http://fakecss.com' }]);
        });

        await getStream(strm);

        await server.close();
        t.end();
    },
);

tap.test(
    'resource.stream() - should emit beforeStream event before emitting data',
    async (t) => {
        const server = new PodletServer({
            assets: { js: 'http://fakejs.com', css: 'http://fakecss.com' },
        });
        const service = await server.listen();

        const resource = new Resource(
            new Cache(),
            new State(),
            service.options,
        );
        const strm = resource.stream(new HttpIncoming({ headers }));
        const items = [];

        strm.once('beforeStream', (beforeStream) => {
            items.push(beforeStream);
        });
        strm.on('data', (data) => {
            items.push(data.toString());
        });

        await getStream(strm);

        t.same(items[0].css, [
            { type: 'text/css', value: 'http://fakecss.com' },
        ]);
        t.same(items[0].js, [{ type: 'default', value: 'http://fakejs.com' }]);
        t.equal(items[1], '<p>content component</p>');

        await server.close();
        t.end();
    },
);

//
// .refresh()
//

tap.test('resource.refresh() - should return a promise', async (t) => {
    const server = new PodletServer({ version: '1.0.0' });
    const service = await server.listen();

    const resource = new Resource(new Cache(), new State(), service.options);
    const refresh = resource.refresh();
    t.ok(refresh instanceof Promise);

    await refresh;

    await server.close();
    t.end();
});

tap.test(
    'resource.refresh() - manifest is available - should return "true"',
    async (t) => {
        const server = new PodletServer({ version: '1.0.0' });
        const service = await server.listen();

        const client = new Client({ name: 'podiumClient' });
        const component = client.register(service.options);

        const result = await component.refresh();

        t.equal(result, true);

        await server.close();
        t.end();
    },
);

tap.test(
    'resource.refresh() - manifest is NOT available - should return "false"',
    async (t) => {
        const client = new Client({ name: 'podiumClient' });

        const component = client.register({
            name: 'component',
            uri: 'http://does.not.exist.finn.no/manifest.json',
        });

        const result = await component.refresh();

        t.equal(result, false);
        t.end();
    },
);

tap.test(
    'resource.refresh() - manifest with fallback is available - should get manifest and fallback, but not content',
    async (t) => {
        const server = new PodletServer({ version: '1.0.0' });
        const service = await server.listen();

        const client = new Client({ name: 'podiumClient' });
        const component = client.register(service.options);

        await component.refresh();

        // @ts-ignore
        t.equal(server.metrics.manifest, 1);
        // @ts-ignore
        t.equal(server.metrics.fallback, 1);
        // @ts-ignore
        t.equal(server.metrics.content, 0);

        await server.close();
        t.end();
    },
);

//
// .uri
//

tap.test(
    'Resource().uri - instantiate new resource object - expose own uri',
    (t) => {
        const resource = new Resource(new Cache(), new State(), {
            uri: URI,
            name: 'someName',
            clientName: 'someName',
            timeout: 1000,
            maxAge: Infinity,
        });
        t.equal(resource.uri, URI);
        t.end();
    },
);

//
// .name
//

tap.test(
    'Resource().name - instantiate new resource object - expose own name',
    (t) => {
        const resource = new Resource(new Cache(), new State(), {
            uri: URI,
            name: 'someName',
            clientName: 'someName',
            timeout: 1000,
            maxAge: Infinity,
        });
        t.equal(resource.name, 'someName');
        t.end();
    },
);

tap.test(
    'Resource().fetch - configured excludeby but no podium-device-type on context, do request',
    async (t) => {
        const server = new PodletServer({ version: '1.0.0' });
        const service = await server.listen();

        const client = new Client({ name: 'podiumClient' });
        const component = client.register({
            ...service.options,
            excludeBy: {
                deviceType: ['hybrid-ios', 'hybrid-android'],
            },
        });

        const result = await component.fetch(new HttpIncoming({ headers }));

        t.match(result.content, /content component/);

        await server.close();
        t.end();
    },
);

tap.test(
    'Resource().fetch - if x-podium-device-type matches excludeBy device type, no request and return empty response',
    async (t) => {
        const server = new PodletServer({ version: '1.0.0' });
        const service = await server.listen();

        const client = new Client({ name: 'podiumClient' });
        const component = client.register({
            ...service.options,
            excludeBy: {
                deviceType: ['hybrid-ios', 'hybrid-android'],
            },
        });

        const result = await component.fetch(
            new HttpIncoming({
                headers: { 'x-podium-device-type': 'hybrid-ios' },
            }),
        );

        t.equal(result.content, '');

        await server.close();
        t.end();
    },
);

tap.test(
    'Resource().fetch - configured includeBy but no podium-device-type on context, do request and return response',
    async (t) => {
        const server = new PodletServer({ version: '1.0.0' });
        const service = await server.listen();

        const client = new Client({ name: 'podiumClient' });
        const component = client.register({
            ...service.options,
            includeBy: {
                deviceType: ['hybrid-ios', 'hybrid-android'],
            },
        });

        const result = await component.fetch(new HttpIncoming({ headers }));

        t.match(result.content, /content component/);

        await server.close();
        t.end();
    },
);

tap.test(
    'Resource().fetch - if x-podium-device-type matches includeBy device type, do request and return content',
    async (t) => {
        const server = new PodletServer({ version: '1.0.0' });
        const service = await server.listen();

        const client = new Client({ name: 'podiumClient' });
        const component = client.register({
            ...service.options,
            includeBy: {
                deviceType: ['hybrid-ios', 'hybrid-android'],
            },
        });

        const result = await component.fetch(
            new HttpIncoming({
                headers: { 'x-podium-device-type': 'hybrid-ios' },
            }),
        );

        t.match(result.content, /content component/);

        await server.close();
        t.end();
    },
);

tap.test(
    'Resource().fetch - if x-podium-device-type does not match includeBy device type, no request and return empty response',
    async (t) => {
        const server = new PodletServer({ version: '1.0.0' });
        const service = await server.listen();

        const client = new Client({ name: 'podiumClient' });
        const component = client.register({
            ...service.options,
            includeBy: {
                deviceType: ['hybrid-ios', 'hybrid-android'],
            },
        });

        const result = await component.fetch(
            new HttpIncoming({
                headers: { 'x-podium-device-type': 'desktop' },
            }),
        );

        t.equal(result.content, '');

        await server.close();
        t.end();
    },
);

tap.test(
    'Resource().fetch - hints complete event emitted once all early hints received - single resource component',
    async (t) => {
        t.plan(1);
        const server = new PodletServer({
            version: '1.0.0',
            assets: {
                js: '/foo/bar.js',
                css: '/foo/bar.css',
            },
        });
        const service = await server.listen();

        const client = new Client({ name: 'podiumClient' });
        const component = client.register(service.options);

        const incoming = new HttpIncoming({ headers: {} });

        incoming.hints.on('complete', () => {
            t.ok(true);
            t.end();
        });

        await component.fetch(incoming);

        await server.close();
    },
);

tap.test(
    'Resource().fetch - hints complete event emitted once all early hints received - multiple resource components',
    async (t) => {
        t.plan(1);
        const server1 = new PodletServer({
            name: 'one',
            version: '1.0.0',
            assets: {
                js: '/foo/bar.js',
                css: '/foo/bar.css',
            },
        });
        const service1 = await server1.listen();
        const server2 = new PodletServer({
            name: 'two',
            version: '1.0.0',
            assets: {
                js: '/foo/bar.js',
                css: '/foo/bar.css',
            },
        });
        const service2 = await server2.listen();
        const server3 = new PodletServer({
            name: 'three',
            version: '1.0.0',
            assets: {
                js: '/foo/bar.js',
                css: '/foo/bar.css',
            },
        });
        const service3 = await server3.listen();

        const client = new Client({ name: 'podiumClient' });
        const component1 = client.register(service1.options);
        const component2 = client.register(service2.options);
        const component3 = client.register(service3.options);

        const incoming = new HttpIncoming({ headers: {} });

        incoming.hints.on('complete', () => {
            t.ok(true);
            t.end();
        });

        await Promise.all([
            component1.fetch(incoming),
            component2.fetch(incoming),
            component3.fetch(incoming),
        ]);

        await server1.close();
        await server2.close();
        await server3.close();
    },
);
