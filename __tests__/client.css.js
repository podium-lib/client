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
 * .css()
 */

test('client.css() - get all registered css assets - should return array with all css assets defined in manifests', async () => {
    const serverA = new Faker({ name: 'aa', assets: { css: 'a.css' } });
    const serverB = new Faker({ name: 'bb', assets: { css: 'b.css' } });
    const [serviceA, serviceB] = await Promise.all([
        serverA.listen(),
        serverB.listen(),
    ]);

    const client = new Client();
    const a = client.register(serviceA.options);
    const b = client.register(serviceB.options);

    await Promise.all([a.fetch({}), b.fetch({})]);

    expect(client.css()).toEqual(['a.css', 'b.css']);

    await Promise.all([serverA.close(), serverB.close()]);
});

test('client.css() - one manifest does not hold css asset - should return array where non defined css asset is omitted', async () => {
    const serverA = new Faker({ name: 'aa', assets: { css: 'a.css' } });
    const serverB = new Faker({ name: 'bb', assets: { css: 'b.css' } });
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

    expect(client.css()).toEqual(['a.css', 'b.css']);

    await Promise.all([serverA.close(), serverB.close(), serverC.close()]);
});

test('client.css() - fetch content out of order - should return array where defined css asset are listed in the order they where registered', async () => {
    const serverA = new Faker({ name: 'aa', assets: { css: 'a.css' } });
    const serverB = new Faker({ name: 'bb', assets: { css: 'b.css' } });
    const serverC = new Faker({ name: 'cc', assets: { css: 'c.css' } });
    const serverD = new Faker({ name: 'dd', assets: { css: 'd.css' } });
    const serverE = new Faker({ name: 'ee', assets: { css: 'e.css' } });
    const serverF = new Faker({ name: 'ff', assets: { css: 'f.css' } });
    const serverG = new Faker({ name: 'gg', assets: { css: 'g.css' } });
    const serverH = new Faker({ name: 'hh', assets: { css: 'h.css' } });
    const serverI = new Faker({ name: 'ii', assets: { css: 'i.css' } });
    const serverJ = new Faker({ name: 'jj', assets: { css: 'j.css' } });

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

    expect(client.css()).toEqual([
        'a.css',
        'b.css',
        'c.css',
        'd.css',
        'e.css',
        'f.css',
        'g.css',
        'h.css',
        'i.css',
        'j.css',
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
