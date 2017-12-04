'use strict';

const Resolver = require('../lib/resolver.js');

test('resolver.cache() - object tag - should be PodletClientResolver', () => {
    const resolver = new Resolver();
    expect(Object.prototype.toString.call(resolver)).toEqual(
        '[object PodletClientResolver]'
    );
});
