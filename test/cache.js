'use strict';

const test = require('ava');
const Cache = require('../lib/cache');
const lolex = require('lolex');

const clock = lolex.install();



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
    const cache = new Cache();
    cache.set('foo', 'bar');
    t.true(cache.store.get('foo').age === cache.maxAge);
});

test('cache.set() - with maxAge - should set maxAge', t => {
    const cache = new Cache();
    cache.set('foo', 'bar', (60 * 60 * 1000));
    t.true(cache.store.get('foo').age !== cache.maxAge);
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
    const cache = new Cache({ maxAge: 2 * 1000 });

    const key = 'foo';
    const value = 'bar';

    cache.set(key, value);
    t.true(cache.get(key) === value);

    clock.tick(1500);
    t.true(cache.get(key) === value);

    clock.tick(1000);
    t.true(cache.get(key) === undefined);
});

test.cb('cache.get() - get value until timeout - should emit dispose event on timeout', t => {
    const cache = new Cache({ maxAge: 2 * 1000 });
    cache.on('dispose', (key) => {
        t.true(key === 'foo');
        t.end();
    });

    cache.set('foo', 'bar');

    clock.tick(2500);
    cache.get('foo');
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
    const cache = new Cache({ maxAge: 2 * 1000 });
    cache.on('dispose', (key) => {
        t.true(key === 'foo');
        t.end();
    });

    cache.set('foo', 'bar');
    cache.del('foo');
});
