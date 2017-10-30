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

    expect(serverA.contentBody).toBe(await a.fetch({}));
    expect(serverB.contentBody).toBe(await b.fetch({}));

    await Promise.all([serverA.close(), serverB.close()]);
});

test('integration - throwable:true - remote manifest can not be resolved - should throw', async () => {
    const client = new Client();
    const component = client.register({
        throwable: true,
        name: 'component',
        uri: 'http://does.not.exist.finn.no/manifest.json',
    });

    try {
        await component.fetch({});
    } catch (error) {
        expect(error.message).toMatch(/Error reading manifest/);
    }
});

test('integration - throwable:false - remote manifest can not be resolved - should resolve with empty string', async () => {
    const client = new Client();
    const component = client.register({
        name: 'component',
        uri: 'http://does.not.exist.finn.no/manifest.json',
    });

    const result = await component.fetch({});
    expect(result).toBe('');
});

test('integration - throwable:true - remote fallback can not be resolved - should throw', async () => {
    const server = new Faker({
        fallback: 'http://does.not.exist.finn.no/fallback.html',
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
        expect(error.message).toMatch(/Error reading fallback/);
    }

    await server.close();
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
    expect(result).toBe('');

    await server.close();
});

test('integration - throwable:true - remote fallback responds with http 500 - should throw', async () => {
    const server = new Faker({
        fallback: '/error',
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
        expect(error.message).toMatch(/Could not read fallback/);
    }

    await server.close();
});

test('integration - throwable:false - remote fallback responds with http 500 - should resolve with empty string', async () => {
    const server = new Faker({
        fallback: '/error',
        content: '/error', // set to trigger fallback senario
    });
    const service = await server.listen();

    const client = new Client();
    const component = client.register(service.options);

    const result = await component.fetch({});
    expect(result).toBe('');

    await server.close();
});

test('integration - throwable:true - remote content can not be resolved - should throw', async () => {
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
        content: 'http://does.not.exist.finn.no/fallback.html',
    });
    const service = await server.listen();

    const client = new Client();
    const component = client.register(service.options);

    const result = await component.fetch({});
    expect(result).toBe(server.fallbackBody);

    await server.close();
});

test('integration - throwable:true - remote content responds with http 500 - should throw', async () => {
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
    expect(result).toBe(server.fallbackBody);

    await server.close();
});
