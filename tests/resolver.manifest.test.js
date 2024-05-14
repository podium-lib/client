/* eslint-disable import/order */

import tap from 'tap';
import { PodletServer } from '@podium/test-utils';
import { HttpIncoming } from '@podium/utils';
import HttpOutgoing from '../lib/http-outgoing.js';
import Manifest from '../lib/resolver.manifest.js';
import Client from '../lib/client.js';
import lolex from '@sinonjs/fake-timers';

// Fake headers
const headers = {};

/**
 * NOTE I:
 * Cache control based on headers subract the time of the request
 * so we will not have an exact number to test on. Due to this, we
 * check if cache time are within a range.
 */

tap.test(
    'resolver.manifest() - object tag - should be PodletClientManifestResolver',
    (t) => {
        const manifest = new Manifest();
        t.equal(
            Object.prototype.toString.call(manifest),
            '[object PodletClientManifestResolver]',
        );
        t.end();
    },
);

tap.test(
    'resolver.manifest() - "outgoing.manifest" holds a manifest - should resolve with same manifest',
    async (t) => {
        const manifest = new Manifest();
        const outgoing = new HttpOutgoing(
            {
                uri: 'http://does.not.mather.com',
                name: 'test',
                timeout: 1000,
                maxAge: Infinity,
            },
            {},
            new HttpIncoming({ headers }),
        );
        // @ts-expect-error Good enough for the test
        outgoing.manifest = { name: 'component' };

        await manifest.resolve(outgoing);

        t.equal(outgoing.manifest.name, 'component');
        t.end();
    },
);

tap.test(
    'resolver.manifest() - remote has no cache header - should set outgoing.maxAge to default',
    async (t) => {
        const server = new PodletServer();
        const service = await server.listen();

        const manifest = new Manifest();
        const outgoing = new HttpOutgoing(
            {
                uri: service.options.uri,
                maxAge: 40000,
                name: 'test',
                timeout: 1000,
            },
            {},
            new HttpIncoming({ headers }),
        );

        await manifest.resolve(outgoing);

        t.equal(outgoing.maxAge, 40000);

        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.manifest() - remote has "cache-control: public, max-age=10" header - should set outgoing.maxAge to header value',
    async (t) => {
        const server = new PodletServer();
        const service = await server.listen();
        server.headersManifest = {
            'cache-control': 'public, max-age=10',
        };

        const manifest = new Manifest();
        const outgoing = new HttpOutgoing(
            {
                uri: service.options.uri,
                maxAge: 40000,
                name: 'test',
                timeout: 1000,
            },
            {},
            new HttpIncoming({ headers }),
        );

        await manifest.resolve(outgoing);

        // See NOTE I for details
        t.ok(outgoing.maxAge < 11000 && outgoing.maxAge > 8500);

        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.manifest() - remote has "cache-control: no-cache" header - should set outgoing.maxAge to default',
    async (t) => {
        const server = new PodletServer();
        const service = await server.listen();
        server.headersManifest = {
            'cache-control': 'no-cache',
        };

        const manifest = new Manifest();
        const outgoing = new HttpOutgoing(
            {
                uri: service.options.uri,
                maxAge: 40000,
                name: 'test',
                timeout: 1000,
            },
            {},
            new HttpIncoming({ headers }),
        );

        await manifest.resolve(outgoing);

        t.equal(outgoing.maxAge, 40000);

        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.manifest() - remote has "expires" header - should set outgoing.maxAge to header value',
    async (t) => {
        const server = new PodletServer();
        const service = await server.listen();

        // Set expire header time to two hours into future
        server.headersManifest = {
            expires: new Date(Date.now() + 7200000).toUTCString(),
        };

        const manifest = new Manifest();
        const outgoing = new HttpOutgoing(
            {
                uri: service.options.uri,
                maxAge: 40000,
                name: 'test',
                timeout: 1000,
            },
            {},
            new HttpIncoming({ headers }),
        );

        await manifest.resolve(outgoing);

        t.ok(outgoing.maxAge <= 7200000 && outgoing.maxAge > 7195000); // 2 hours

        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.manifest() - one remote has "expires" header second none - should set and timout one and use default for second',
    async (t) => {
        const now = Date.now();
        const clock = lolex.install({ now });

        const serverA = new PodletServer({
            name: 'aa',
        });
        const serverB = new PodletServer({
            name: 'bb',
        });

        const serviceA = await serverA.listen();
        const serviceB = await serverB.listen();

        // Set expires by http headers two hours into future
        serverA.headersManifest = {
            expires: new Date(now + 1000 * 60 * 60 * 2).toUTCString(),
        };

        // Set default expires four hours into future
        const client = new Client({
            name: 'podiumClient',
            maxAge: 1000 * 60 * 60 * 4,
        });
        const a = client.register(serviceA.options);
        const b = client.register(serviceB.options);

        await a.fetch(new HttpIncoming({ headers }));
        await b.fetch(new HttpIncoming({ headers }));

        t.equal(serverA.metrics.manifest, 1);
        t.equal(serverB.metrics.manifest, 1);

        // Tick clock three hours into future
        clock.tick(1000 * 60 * 60 * 3);

        await a.fetch(new HttpIncoming({ headers }));
        await b.fetch(new HttpIncoming({ headers }));

        // Cache for server A should now have timed out
        t.equal(serverA.metrics.manifest, 2);
        t.equal(serverB.metrics.manifest, 1);

        await serverA.close();
        await serverB.close();
        clock.uninstall();
        t.end();
    },
);

tap.test(
    'resolver.manifest() - remote can not be resolved - "outgoing.manifest" should be {_fallback: ""}',
    async (t) => {
        const manifest = new Manifest();
        const outgoing = new HttpOutgoing(
            {
                uri: 'http://does.not.exist.finn.no/manifest.json',
                throwable: false,
                name: 'test',
                timeout: 1000,
                maxAge: Infinity,
            },
            {},
            new HttpIncoming({ headers }),
        );

        await manifest.resolve(outgoing);
        t.same(outgoing.manifest, { _fallback: '' });
        t.end();
    },
);

tap.test(
    'resolver.manifest() - remote responds with http 500 - "outgoing.manifest" should be {_fallback: ""}',
    async (t) => {
        const server = new PodletServer();
        const service = await server.listen();

        const manifest = new Manifest();
        const outgoing = new HttpOutgoing(
            {
                uri: service.error,
                throwable: false,
                name: 'test',
                timeout: 1000,
                maxAge: Infinity,
            },
            {},
            new HttpIncoming({ headers }),
        );

        await manifest.resolve(outgoing);
        t.same(outgoing.manifest, { _fallback: '' });

        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.manifest() - manifest is not valid - "outgoing.manifest" should be {_fallback: ""}',
    async (t) => {
        const server = new PodletServer();
        const service = await server.listen();

        const manifest = new Manifest();
        const outgoing = new HttpOutgoing(
            {
                uri: service.content,
                throwable: false,
                name: 'test',
                timeout: 1000,
                maxAge: Infinity,
            },
            {},
            new HttpIncoming({ headers }),
        );

        await manifest.resolve(outgoing);
        t.same(outgoing.manifest, { _fallback: '' });

        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.manifest() - "content" in manifest is relative - "outgoing.manifest.content" should be absolute',
    async (t) => {
        const server = new PodletServer();
        const service = await server.listen();

        const manifest = new Manifest();
        const outgoing = new HttpOutgoing(
            {
                uri: service.manifest,
                name: 'test',
                timeout: 1000,
                maxAge: Infinity,
            },
            {},
            new HttpIncoming({ headers }),
        );

        await manifest.resolve(outgoing);
        t.same(outgoing.manifest.content, service.content);

        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.manifest() - "content" in manifest is absolute - "outgoing.manifest.content" should be absolute',
    async (t) => {
        const server = new PodletServer({
            content: 'http://does.not.mather.com',
        });
        const service = await server.listen();

        const manifest = new Manifest();
        const outgoing = new HttpOutgoing(
            {
                uri: service.manifest,
                name: 'test',
                timeout: 1000,
                maxAge: Infinity,
            },
            {},
            new HttpIncoming({ headers }),
        );

        await manifest.resolve(outgoing);
        t.equal(outgoing.manifest.content, 'http://does.not.mather.com');

        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.manifest() - "fallback" in manifest is relative - "outgoing.manifest.fallback" should be absolute',
    async (t) => {
        const server = new PodletServer({
            fallback: '/fallback.html',
        });

        const service = await server.listen();

        const manifest = new Manifest();
        const outgoing = new HttpOutgoing(
            {
                uri: service.manifest,
                name: 'test',
                timeout: 1000,
                maxAge: Infinity,
            },
            {},
            new HttpIncoming({ headers }),
        );

        await manifest.resolve(outgoing);
        t.equal(outgoing.manifest.fallback, `${service.address}/fallback.html`);

        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.manifest() - "fallback" in manifest is absolute - "outgoing.manifest.fallback" should be absolute',
    async (t) => {
        const server = new PodletServer({
            fallback: 'http://does.not.mather.com',
        });
        const service = await server.listen();

        const manifest = new Manifest();
        const outgoing = new HttpOutgoing(
            {
                uri: service.manifest,
                name: 'test',
                timeout: 1000,
                maxAge: Infinity,
            },
            {},
            new HttpIncoming({ headers }),
        );

        await manifest.resolve(outgoing);
        t.equal(outgoing.manifest.fallback, 'http://does.not.mather.com');

        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.manifest() - a "proxy" target in manifest is relative - should convert it to be absolute',
    async (t) => {
        const server = new PodletServer({
            proxy: {
                foo: '/api/foo',
            },
        });
        const service = await server.listen();

        const manifest = new Manifest();
        const outgoing = new HttpOutgoing(
            {
                uri: service.manifest,
                name: 'test',
                timeout: 1000,
                maxAge: Infinity,
            },
            {},
            new HttpIncoming({ headers }),
        );

        await manifest.resolve(outgoing);

        t.equal(
            outgoing.manifest.proxy[0].target,
            `${service.address}/api/foo`,
        );
        t.equal(outgoing.manifest.proxy[0].name, 'foo');

        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.manifest() - a "proxy" target in manifest is absolute - should keep it absolute',
    async (t) => {
        const server = new PodletServer({
            proxy: {
                bar: 'http://does.not.mather.com/api/bar',
            },
        });
        const service = await server.listen();

        const manifest = new Manifest();
        const outgoing = new HttpOutgoing(
            {
                uri: service.manifest,
                name: 'test',
                timeout: 1000,
                maxAge: Infinity,
            },
            {},
            new HttpIncoming({ headers }),
        );

        await manifest.resolve(outgoing);

        t.equal(
            outgoing.manifest.proxy[0].target,
            'http://does.not.mather.com/api/bar',
        );
        t.equal(outgoing.manifest.proxy[0].name, 'bar');

        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.manifest() - "proxy" targets in manifest is both absolute and relative - should keep absolute URIs and alter relative URIs',
    async (t) => {
        const server = new PodletServer({
            proxy: {
                bar: 'http://does.not.mather.com/api/bar',
                foo: '/api/foo',
            },
        });
        const service = await server.listen();

        const manifest = new Manifest();
        const outgoing = new HttpOutgoing(
            {
                uri: service.manifest,
                name: 'test',
                timeout: 1000,
                maxAge: Infinity,
            },
            {},
            new HttpIncoming({ headers }),
        );

        await manifest.resolve(outgoing);

        t.equal(
            outgoing.manifest.proxy[0].target,
            'http://does.not.mather.com/api/bar',
        );
        t.equal(outgoing.manifest.proxy[0].name, 'bar');
        t.equal(
            outgoing.manifest.proxy[1].target,
            `${service.address}/api/foo`,
        );
        t.equal(outgoing.manifest.proxy[1].name, 'foo');

        await server.close();
        t.end();
    },
);
