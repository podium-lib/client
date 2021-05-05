import tap from 'tap';
import { PodletServer } from '@podium/test-utils';
import { HttpIncoming } from '@podium/utils';
import Client from '../lib/client.js';

// Fake headers
const headers = {};

tap.test('integration basic', async t => {
    const serverA = new PodletServer({ name: 'aa' });
    const serverB = new PodletServer({ name: 'bb' });
    const [serviceA, serviceB] = await Promise.all([
        serverA.listen(),
        serverB.listen(),
    ]);

    const client = new Client({ name: 'podiumClient' });
    const a = client.register(serviceA.options);
    const b = client.register(serviceB.options);

    const incomingA = new HttpIncoming({ headers });
    incomingA.context = { 'podium-locale': 'en-NZ' };

    const actual1 = await a.fetch(incomingA);
    actual1.headers.date = '<replaced>';
    actual1.headers['keep-alive'] = '<workaround>'; // node.js pre 14 does not have keep-alive as a default

    t.same(actual1.content, serverA.contentBody);
    t.same(actual1.js, []);
    t.same(actual1.css, []);

  t.same(actual1.headers, {
        connection: 'keep-alive',
        'keep-alive': '<workaround>',
        'content-length': '17',
        'content-type': 'text/html; charset=utf-8',
        date: '<replaced>',
        'podlet-version': '1.0.0',
    });

    const incomingB = new HttpIncoming({ headers });

    const actual2 = await b.fetch(incomingB);
    actual2.headers.date = '<replaced>';
    actual2.headers['keep-alive'] = '<workaround>'; // node.js pre 14 does not have keep-alive as a default

    t.same(actual2.content, serverB.contentBody);
    t.same(actual2.js, []);
    t.same(actual2.css, []);

  t.same(actual2.headers, {
        connection: 'keep-alive',
        'keep-alive': '<workaround>',
        'content-length': '17',
        'content-type': 'text/html; charset=utf-8',
        date: '<replaced>',
        'podlet-version': '1.0.0',
    });

    await Promise.all([serverA.close(), serverB.close()]);
});

tap.test('integration - throwable:true - remote manifest can not be resolved - should throw', async t => {
    const client = new Client({ name: 'podiumClient' });
    const component = client.register({
        throwable: true,
        name: 'component',
        uri: 'http://does.not.exist.finn.no/manifest.json',
    });

    try {
        await component.fetch(new HttpIncoming({ headers }));
    } catch (error) {
        t.match(error.message, /No manifest available - Cannot read content/);
    }

    t.end();
});

tap.test('integration - throwable:false - remote manifest can not be resolved - should resolve with empty string', async t => {
    const client = new Client({ name: 'podiumClient' });
    const component = client.register({
        name: 'component',
        uri: 'http://does.not.exist.finn.no/manifest.json',
    });

    const result = await component.fetch(new HttpIncoming({ headers }));
    t.equal(result.content, '');
});

tap.test('integration - throwable:false - remote fallback can not be resolved - should resolve with empty string', async t => {
    const server = new PodletServer({
        fallback: 'http://does.not.exist.finn.no/fallback.html',
        content: '/error', // set to trigger fallback senario
    });

    const service = await server.listen();

    const client = new Client({ name: 'podiumClient' });
    const component = client.register(service.options);

    const result = await component.fetch(new HttpIncoming({ headers }));
    t.equal(result.content, '');

    await server.close();
});

tap.test('integration - throwable:false - remote fallback responds with http 500 - should resolve with empty string', async t => {
    const server = new PodletServer({
        fallback: 'error',
        content: '/error', // set to trigger fallback senario
    });

    const service = await server.listen();

    const client = new Client({ name: 'podiumClient' });
    const component = client.register(service.options);

    const result = await component.fetch(new HttpIncoming({ headers }));
    t.equal(result.content, '');

    await server.close();
});

tap.test('integration - throwable:true - remote content can not be resolved - should throw', async t => {
    const server = new PodletServer({
        fallback: '/fallback.html',
        content: 'http://does.not.exist.finn.no/content.html',
    });

    const service = await server.listen();

    const client = new Client({ name: 'podiumClient' });
    const component = client.register({
        throwable: true,
        name: service.options.name,
        uri: service.options.uri,
    });

    try {
        await component.fetch(new HttpIncoming({ headers }));
    } catch (error) {
        t.match(error.message, /Error reading content/);
    }

    await server.close();

    t.end();
});

tap.test('integration - throwable:false - remote content can not be resolved - should resolve with fallback', async t => {
    const server = new PodletServer({
        fallback: '/fallback.html',
        content: 'http://does.not.exist.finn.no/content.html',
    });

    const service = await server.listen();

    const client = new Client({ name: 'podiumClient' });
    const component = client.register(service.options);

    const result = await component.fetch(new HttpIncoming({ headers }));
    t.same(result.content, server.fallbackBody);
    t.same(result.headers, {});
    t.same(result.css, []);
    t.same(result.js, []);

    await server.close();
});

tap.test('integration - throwable:true - remote content responds with http 500 - should throw', async t => {
    const server = new PodletServer({
        fallback: '/fallback.html',
        content: '/error',
    });

    const service = await server.listen();

    const client = new Client({ name: 'podiumClient' });
    const component = client.register({
        throwable: true,
        name: service.options.name,
        uri: service.options.uri,
    });

    try {
        await component.fetch(new HttpIncoming({ headers }));
    } catch (error) {
        t.match(error.message, /Could not read content/);
    }

    await server.close();

    t.end();
});

tap.test('integration - throwable:false - remote content responds with http 500 - should resolve with fallback', async t => {
    const server = new PodletServer({
        fallback: '/fallback.html',
        content: '/error',
    });

    const service = await server.listen();

    const client = new Client({ name: 'podiumClient' });
    const component = client.register(service.options);

    const result = await component.fetch(new HttpIncoming({ headers }));
    t.same(result.content, server.fallbackBody);
    t.same(result.headers, {});
    t.same(result.css, []);
    t.same(result.js, []);

    await server.close();
});

tap.test('integration - throwable:false - manifest / content fetching goes into recursion loop - should try to resolve 4 times before terminating and resolve with fallback', async t => {
    const server = new PodletServer({
        fallback: '/fallback.html',
    });

    const service = await server.listen();

    const client = new Client({ name: 'podiumClient' });
    const component = client.register(service.options);
    await component.refresh();

    // make http version number never match manifest version number
    server.headersContent = {
        'podlet-version': Date.now(),
    };

    const result = await component.fetch(new HttpIncoming({ headers }));
    t.same(result.content, server.fallbackBody);
    t.same(result.headers, {});
    t.same(result.css, []);
    t.same(result.js, []);

    // manifest and fallback is one more than default
    // due to initial refresh() call
    t.equal(server.metrics.manifest, 5);
    t.equal(server.metrics.fallback, 5);
    t.equal(server.metrics.content, 4);

    await server.close();
});

tap.test('integration - throwable:true - manifest / content fetching goes into recursion loop - should try to resolve 4 times before terminating and then throw', async t => {
    const server = new PodletServer({
        fallback: '/fallback.html',
    });

    const service = await server.listen();

    const client = new Client({ name: 'podiumClient' });
    const component = client.register({
        throwable: true,
        name: service.options.name,
        uri: service.options.uri,
    });
    await component.refresh();

    // make http version number never match manifest version number
    server.headersContent = {
        'podlet-version': Date.now(),
    };

    try {
        await component.fetch(new HttpIncoming({ headers }));
    } catch (error) {
        t.match(
            error.message,
            /Recursion detected - failed to resolve fetching of podlet 4 times/,
        );
    }

    // manifest and fallback is one more than default
    // due to initial refresh() call
    t.equal(server.metrics.manifest, 5);
    t.equal(server.metrics.fallback, 5);
    t.equal(server.metrics.content, 4);

    await server.close();

    t.end();
});

tap.test('integration basic - set headers argument - should pass on headers to request', async t => {
    const server = new PodletServer({ name: 'podlet' });
    const service = await server.listen();
    server.on('req:content', (content, req) => {
        t.equal(req.headers.foo, 'bar');
        t.equal(req.headers['podium-ctx'], 'foo');
        t.end();
    });

    const client = new Client({ name: 'podiumClient' });
    const a = client.register(service.options);

    const incoming = new HttpIncoming({ headers })
    incoming.context = { 'podium-ctx': 'foo' };

    await a.fetch(
        incoming,
        {
            headers: {
                foo: 'bar',
            },
        },
    );

    await server.close();
});

tap.test('integration basic - set headers argument - header has a "user-agent" - should override "user-agent" with podium agent', async t => {
    const server = new PodletServer({ name: 'podlet' });
    const service = await server.listen();
    server.on('req:content', (content, req) => {
        t.ok(req.headers['user-agent'].startsWith('@podium/client'));
        t.end();
    });

    const client = new Client({ name: 'podiumClient' });
    const a = client.register(service.options);

    const incoming = new HttpIncoming({ headers })
    incoming.context = { 'podium-ctx': 'foo' };

    await a.fetch(
        incoming,
        {
            headers: {
                'User-Agent': 'bar',
            },
        },
    );

    await server.close();
});

tap.test('integration basic - metrics stream objects created', async (t) => {
    const server = new PodletServer({ name: 'podlet' });
    const client = new Client({ name: 'clientName' });

    const metrics = [];
    client.metrics.on('data', metric => metrics.push(metric));
    client.metrics.on('end', async () => {
        t.equal(metrics.length, 3);
        t.equal(metrics[0].name, 'podium_client_resolver_manifest_resolve');
        t.equal(metrics[0].type, 5);
        t.same(metrics[0].labels[0], {
            name: 'name',
            value: 'clientName',
        });
        t.equal(metrics[1].name, 'podium_client_resolver_fallback_resolve');
        t.equal(metrics[1].type, 5);
        t.same(metrics[1].labels[0], {
            name: 'name',
            value: 'clientName',
        });
        t.equal(metrics[2].name, 'podium_client_resolver_content_resolve');
        t.equal(metrics[2].type, 5);
        t.same(metrics[2].labels[0], {
            name: 'name',
            value: 'clientName',
        });

        t.end()
    });

    const service = await server.listen();

    const a = client.register(service.options);

    const incoming = new HttpIncoming({ headers });
    incoming.context = { 'podium-ctx': 'foo' };

    await a.fetch(incoming);
    client.metrics.push(null);
    
    await server.close()
});

tap.test('integration basic - "pathname" is called with different values - should append the different pathnames to the content URL', async t => {
    const server = new PodletServer({ name: 'podlet', content: '/index' });
    const service = await server.listen();
    const results = [];

    server.on('req:content', (content, req) => {
        results.push(req.url);

        if (server.metrics.content === 2) {
            t.equal(results[0], '/index/foo');
            t.equal(results[1], '/index/bar');
            t.end();
        }
    });

    const client = new Client({ name: 'podiumClient' });
    const a = client.register(service.options);

    await a.fetch(new HttpIncoming({ headers }), { pathname: '/foo' });
    await a.fetch(new HttpIncoming({ headers }), { pathname: '/bar' });

    await server.close();
});
