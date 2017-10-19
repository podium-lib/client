'use strict';

const Client = require('../');
const Faker = require('../test/faker');

/**
 * Shuffle an array into an random order
 */

const shuffle = array => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

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

test('client.js() - fetch content out of order - should return array where defined js asset are listed in the order they where registered', async () => {
    const serverA = new Faker({ name: 'aa', assets: { js: 'a.js' } });
    const serverB = new Faker({ name: 'bb', assets: { js: 'b.js' } });
    const serverC = new Faker({ name: 'cc', assets: { js: 'c.js' } });
    const serverD = new Faker({ name: 'dd', assets: { js: 'd.js' } });
    const serverE = new Faker({ name: 'ee', assets: { js: 'e.js' } });
    const serverF = new Faker({ name: 'ff', assets: { js: 'f.js' } });
    const serverG = new Faker({ name: 'gg', assets: { js: 'g.js' } });
    const serverH = new Faker({ name: 'hh', assets: { js: 'h.js' } });
    const serverI = new Faker({ name: 'ii', assets: { js: 'i.js' } });
    const serverJ = new Faker({ name: 'jj', assets: { js: 'j.js' } });

    const [
        serviceA,
        serviceB,
        serviceC,
        serviceD,
        serviceE,
        serviceF,
        serviceG,
        serviceH,
        serviceI,
        serviceJ,
    ] = await Promise.all([
        serverA.listen(),
        serverB.listen(),
        serverC.listen(),
        serverD.listen(),
        serverE.listen(),
        serverF.listen(),
        serverG.listen(),
        serverH.listen(),
        serverI.listen(),
        serverJ.listen(),
    ]);

    const client = new Client();
    const a = client.register(serviceA.options);
    const b = client.register(serviceB.options);
    const c = client.register(serviceC.options);
    const d = client.register(serviceD.options);
    const e = client.register(serviceE.options);
    const f = client.register(serviceF.options);
    const g = client.register(serviceG.options);
    const h = client.register(serviceH.options);
    const i = client.register(serviceI.options);
    const j = client.register(serviceJ.options);

    // Shuffle fetch methods into random order
    await Promise.all(
        shuffle([
            a.fetch({}),
            b.fetch({}),
            c.fetch({}),
            d.fetch({}),
            e.fetch({}),
            f.fetch({}),
            g.fetch({}),
            h.fetch({}),
            i.fetch({}),
            j.fetch({}),
        ])
    );

    expect(client.js()).toEqual([
        'a.js',
        'b.js',
        'c.js',
        'd.js',
        'e.js',
        'f.js',
        'g.js',
        'h.js',
        'i.js',
        'j.js',
    ]);

    await Promise.all([
        serverA.close(),
        serverB.close(),
        serverC.close(),
        serverD.close(),
        serverE.close(),
        serverF.close(),
        serverG.close(),
        serverH.close(),
        serverI.close(),
        serverJ.close(),
    ]);
});
