'use strict';

const cache = require('./resolver.cache');
const manifest = require('./resolver.manifest');
const fallback = require('./resolver.fallback');
const content = require('./resolver.content');


function resolver(state) {
    return cache.load(state)
        .then(obj => manifest(obj))
        .then(obj => fallback(obj))
        .then(obj => content(obj))
        .then(obj => cache.save(obj))
        .then((obj) => {
            if(obj.success) {
                return obj;
            }
            return resolver(obj);
        });
};

module.exports = resolver;
