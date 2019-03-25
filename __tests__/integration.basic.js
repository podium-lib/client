'use strict';

const Client = require('../');
const Faker = require('../test/faker');

test('integration basic - ', async () => {
    const serverA = new Faker({ name: 'aa' });
    const serverB = new Faker({ name: 'bb' });
    const [serviceA, serviceB] = await Promise.all([
        serverA.listen(),
        serverB.listen(),
    ]);

    const client = new Client();
    const a = client.register(serviceA.options);
    const b = client.register(serviceB.options);

    expect({ content: serverA.contentBody, js: '', css: '' }).toEqual(
        await a.fetch({}),
    );
    expect({ content: serverB.contentBody, js: '', css: '' }).toEqual(
        await b.fetch({}),
    );

    await Promise.all([serverA.close(), serverB.close()]);
});

test('integration - throwable:true - remote manifest can not be resolved - should throw', async () => {
    expect.hasAssertions();

    const client = new Client();
    const component = client.register({
        throwable: true,
        name: 'component',
        uri: 'http://does.not.exist.finn.no/manifest.json',
    });

    try {
        await component.fetch({});
    } catch (error) {
        expect(error.message).toMatch(
            /No manifest available - Cannot read content/,
        );
    }
});

test('integration - throwable:false - remote manifest can not be resolved - should resolve with empty string', async () => {
    const client = new Client();
    const component = client.register({
        name: 'component',
        uri: 'http://does.not.exist.finn.no/manifest.json',
    });

    const result = await component.fetch({});
    expect(result.content).toBe('');
});

test('integration - throwable:false - remote fallback can not be resolved - should resolve with empty string', async () => {
    const server = new Faker({
        fallback: 'http://does.not.exist.finn.no/fallback.html',
        content: '/error', // set to trigger fallback senario
    });

    const service = await server.listen();

    const client = new Client();
    const component = client.register(service.options);

    const result = await component.fetch({});
    expect(result.content).toBe('');

    await server.close();
});

test('integration - throwable:false - remote fallback responds with http 500 - should resolve with empty string', async () => {
    const server = new Faker({
        fallback: 'error',
        content: '/error', // set to trigger fallback senario
    });

    const service = await server.listen();

    const client = new Client();
    const component = client.register(service.options);

    const result = await component.fetch({});
    expect(result.content).toBe('');

    await server.close();
});

test('integration - throwable:true - remote content can not be resolved - should throw', async () => {
    expect.hasAssertions();

    const server = new Faker({
        fallback: '/fallback.html',
        content: 'http://does.not.exist.finn.no/content.html',
    });

    const service = await server.listen();

    const client = new Client();
    const component = client.register({
        throwable: true,
        name: service.options.name,
        uri: service.options.uri,
    });

    try {
        await component.fetch({});
    } catch (error) {
        expect(error.message).toMatch(/Error reading content/);
    }

    await server.close();
});

test('integration - throwable:false - remote content can not be resolved - should resolve with fallback', async () => {
    const server = new Faker({
        fallback: '/fallback.html',
        content: 'http://does.not.exist.finn.no/content.html',
    });

    const service = await server.listen();

    const client = new Client();
    const component = client.register(service.options);

    const result = await component.fetch({});
    expect(result).toEqual({ content: server.fallbackBody, js: '', css: '' });

    await server.close();
});

test('integration - throwable:true - remote content responds with http 500 - should throw', async () => {
    expect.hasAssertions();

    const server = new Faker({
        fallback: '/fallback.html',
        content: '/error',
    });

    const service = await server.listen();

    const client = new Client();
    const component = client.register({
        throwable: true,
        name: service.options.name,
        uri: service.options.uri,
    });

    try {
        await component.fetch({});
    } catch (error) {
        expect(error.message).toMatch(/Could not read content/);
    }

    await server.close();
});

test('integration - throwable:false - remote content responds with http 500 - should resolve with fallback', async () => {
    const server = new Faker({
        fallback: '/fallback.html',
        content: '/error',
    });

    const service = await server.listen();

    const client = new Client();
    const component = client.register(service.options);

    const result = await component.fetch({});
    expect(result).toEqual({ content: server.fallbackBody, js: '', css: '' });

    await server.close();
});

test('integration - throwable:false - manifest / content fetching goes into recursion loop - should try to resolve 4 times before terminating and resolve with fallback', async () => {
    const server = new Faker({
        fallback: '/fallback.html',
    });

    const service = await server.listen();

    const client = new Client();
    const component = client.register(service.options);
    await component.refresh();

    // make http version number never match manifest version number
    server.headersContent = {
        'podlet-version': Date.now(),
    };

    const result = await component.fetch({});

    expect(result).toEqual({ content: server.fallbackBody, js: '', css: '' });

    // manifest and fallback is one more than default
    // due to initial refresh() call
    expect(server.metrics.manifest).toBe(5);
    expect(server.metrics.fallback).toBe(5);
    expect(server.metrics.content).toBe(4);

    await server.close();
});

test('integration - throwable:true - manifest / content fetching goes into recursion loop - should try to resolve 4 times before terminating and then throw', async () => {
    expect.hasAssertions();

    const server = new Faker({
        fallback: '/fallback.html',
    });

    const service = await server.listen();

    const client = new Client();
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
        await component.fetch({});
    } catch (error) {
        expect(error.message).toMatch(
            /Recursion detected - failed to resolve fetching of podlet 4 times/,
        );
    }

    // manifest and fallback is one more than default
    // due to initial refresh() call
    expect(server.metrics.manifest).toBe(5);
    expect(server.metrics.fallback).toBe(5);
    expect(server.metrics.content).toBe(4);

    await server.close();
});

test('integration basic - set headers argument - should pass on headers to request', async () => {
    expect.hasAssertions();

    const server = new Faker({ name: 'podlet' });
    const service = await server.listen();
    server.on('req:content', async (content, req) => {
        expect(req.headers.foo).toBe('bar');
        expect(req.headers['podium-ctx']).toBe('foo');

        // Server must be closed here, unless Jest just passes
        // the test even if it fail. Silly jest...
        await server.close();
    });

    const client = new Client();
    const a = client.register(service.options);

    await a.fetch(
        { 'podium-ctx': 'foo' },
        {
            headers: {
                foo: 'bar',
            },
        },
    );
});

test('integration basic - set headers argument - header has a "user-agent" - should override "user-agent" with podium agent', async () => {
    expect.hasAssertions();

    const server = new Faker({ name: 'podlet' });
    const service = await server.listen();
    server.on('req:content', async (content, req) => {
        expect(
            req.headers['user-agent'].startsWith('@podium/client'),
        ).toBeTruthy();

        // Server must be closed here, unless Jest just passes
        // the test even if it fail. Silly jest...
        await server.close();
    });

    const client = new Client();
    const a = client.register(service.options);

    await a.fetch(
        { 'podium-ctx': 'foo' },
        {
            headers: {
                'User-Agent': 'bar',
            },
        },
    );
});
