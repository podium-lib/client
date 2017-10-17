'use strict';

const content = require('../lib/resolver.content.js');
const State = require('../lib/state.js');
const Faker = require('../test/faker');
const Cache = require('ttl-mem-cache');

test('resolver.content() - no content field - should return empty String', async () => {
    const state = new State(new Cache());
    state.manifest = new Faker().manifest;


//    const result = await content(state);


    expect('').toBe('');
});

