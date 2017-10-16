'use strict';

const Client = require('../');
const Faker = require('../test/faker');

/**
 * .js()
 */

test('client.js() - get all registered js assets - should return array with all js assets defined in manifests', async () => {
    const serverA = new Faker({ name: 'aa', assets: { js: 'a.js' } });
    const serverB = new Faker({ name: 'bb', assets: { js: 'b.js' } });
    const [serviceA, serviceB] = await Promise.all([
        serverA.listen(),
        serverB.listen(),
    ]);

    const client = new Client();
    const a = client.register(serviceA.options);
    const b = client.register(serviceB.options);

    await Promise.all([a.fetch({}), b.fetch({})]);

    expect(client.js()).toEqual(['a.js', 'b.js']);

    await Promise.all([serverA.close(), serverB.close()]);
});

test('client.js() - one manifest does not hold js asset - should return array where non defined js asset is omitted', async () => {
    const serverA = new Faker({ name: 'aa', assets: { js: 'a.js' } });
    const serverB = new Faker({ name: 'bb', assets: { js: 'b.js' } });
    const serverC = new Faker({ name: 'cc' });
    const [serviceA, serviceB, serviceC] = await Promise.all([
        serverA.listen(),
        serverB.listen(),
        serverC.listen(),
    ]);

    const client = new Client();
    const a = client.register(serviceA.options);
    const b = client.register(serviceB.options);
    const c = client.register(serviceC.options);

    await Promise.all([a.fetch({}), b.fetch({}), c.fetch({})]);

    expect(client.js()).toEqual(['a.js', 'b.js']);

    await Promise.all([serverA.close(), serverB.close(), serverC.close()]);
});
