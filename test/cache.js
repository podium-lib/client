'use strict';

const test = require('ava');
const Cache = require('../lib/cache');
const lolex = require('lolex');



/**
 * Constructor
 */

test('cache() - without maxAge - should set default maxAge', t => {
    const cache = new Cache();
    t.true(cache.maxAge === (5 * 60 * 1000));
});

test('cache() - with maxAge - should set default maxAge', t => {
    const maxAge = (60 * 60 * 1000);
    const cache = new Cache({ maxAge });
    t.true(cache.maxAge === maxAge);
});



/**
 * .set()
 */

test('cache.set() - without key - should throw', t => {
    const cache = new Cache();
    const error = t.throws(() => {
        cache.set();
    }, Error);
    t.is(error.message, 'Argument "key" cannot be null or undefined');
});

test('cache.set() - without value - should throw', t => {
    const cache = new Cache();
    const error = t.throws(() => {
        cache.set('foo');
    }, Error);
    t.is(error.message, 'Argument "value" cannot be null or undefined');
});

test('cache.set() - with key and value - should return the set value', t => {
    const cache = new Cache();
    const result = cache.set('foo', 'bar');
    t.true(result === 'bar');
});

test('cache.set() - with key and value - should set value on key in storage', t => {
    const cache = new Cache();
    cache.set('foo', 'bar');
    t.true(cache.store.get('foo').value === 'bar');
});

test('cache.set() - without maxAge - should set default maxAge', t => {
    const clock = lolex.install();
    clock.tick(100000);

    const cache = new Cache();
    cache.set('foo', 'bar');
    t.true(cache.store.get('foo').expires === 400000); // default maxAge + lolex tick time

    clock.uninstall();
});

test('cache.set() - with maxAge - should set maxAge', t => {
    const clock = lolex.install();
    clock.tick(100000);

    const cache = new Cache();
    cache.set('foo', 'bar', (60 * 60 * 1000));
    t.true(cache.store.get('foo').expires === 3700000);

    clock.uninstall();
});

test('cache.set() - call twice with different values - should cache value of first set', t => {
    const cache = new Cache();
    cache.set('foo', 'bar');
    cache.set('foo', 'xyz');
    t.true(cache.store.get('foo').value === 'bar');
});



/**
 * .get()
 */

test('cache.get() - get set value - should return set value', t => {
    const cache = new Cache();
    cache.set('foo', 'bar');
    t.true(cache.get('foo') === 'bar');
});

test('cache.get() - get value until timeout - should return value until timeout', t => {
    const clock = lolex.install();
    const cache = new Cache({ maxAge: 2 * 1000 });

    const key = 'foo';
    const value = 'bar';

    cache.set(key, value);
    t.true(cache.get(key) === value);

    clock.tick(1500);
    t.true(cache.get(key) === value);

    clock.tick(1000);
    t.true(cache.get(key) === undefined);
    clock.uninstall();
});

test.cb('cache.get() - get value until timeout - should emit dispose event on timeout', t => {
    const clock = lolex.install();

    const cache = new Cache({ maxAge: 2 * 1000 });
    cache.on('dispose', (key) => {
        t.true(key === 'foo');
        t.end();
    });

    cache.set('foo', 'bar');

    clock.tick(2500);
    cache.get('foo');

    clock.uninstall();
});



/**
 * .del()
 */

 test('cache.del() - remove set value - should remove value', t => {
    const cache = new Cache();
    cache.set('foo', 'bar');
    cache.del('foo');
    t.true(cache.store.get('foo') === undefined);
});

test.cb('cache.del() - remove set value - should emit dispose event on removal', t => {
    const cache = new Cache();
    cache.on('dispose', (key) => {
        t.true(key === 'foo');
        t.end();
    });

    cache.set('foo', 'bar');
    cache.del('foo');
});



/**
 * .entries()
 */

 test('cache.entries() - get all entries - should return all entries as an Array', t => {
    const clock = lolex.install();

    const cache = new Cache();
    cache.set('a', 'bar');
    cache.set('b', 'foo', 2 * 1000);
    cache.set('c', 'xyz');

    const entries = cache.entries();

    t.true(entries[0][0] === 'a');
    t.true(entries[0][1] === 'bar');
    t.true(entries[0][2] === 300000);

    t.true(entries[1][0] === 'b');
    t.true(entries[1][1] === 'foo');
    t.true(entries[1][2] === 2000);

    t.true(entries[2][0] === 'c');
    t.true(entries[2][1] === 'xyz');
    t.true(entries[2][2] === 300000);

    clock.uninstall();
});

test('cache.entries() - get all entries until timeout - should not return purged entries', t => {
    const clock = lolex.install();

    const cache = new Cache();
    cache.set('a', 'bar');
    cache.set('b', 'foo', 2 * 1000);
    cache.set('c', 'xyz');

    const entries1 = cache.entries();
    t.true(entries1.length === 3);

    clock.tick(3000);

    const entries2 = cache.entries();
    t.true(entries2.length === 2);

    clock.uninstall();
});

test.cb('cache.entries() - get all entries until timeout - should emit dispose event on timeout', t => {
    const clock = lolex.install();

    const cache = new Cache();
    cache.on('dispose', (key) => {
        t.true(key === 'b');
        t.end();
    });

    cache.set('a', 'bar');
    cache.set('b', 'foo', 2 * 1000);
    cache.set('c', 'xyz');

    clock.tick(3000);

    cache.entries();

    clock.uninstall();
});

test('cache.entries() - call with mutator function - should mutate result', t => {
    const clock = lolex.install();

    const cache = new Cache();
    cache.set('a', 'bar');
    cache.set('b', 'foo', 2 * 1000);
    cache.set('c', 'xyz');

    const entries = cache.entries((key, value, timeout) => {
        return {
            key,
            value,
            timeout
        };
    });

    t.true(entries.length === 3);

    t.true(entries[0].key === 'a');
    t.true(entries[0].value === 'bar');
    t.true(entries[0].timeout === 300000);

    clock.uninstall();
});
