'use strict';

const cache = require('./resolver.cache');
const manifest = require('./resolver.manifest');
const content = require('./resolver.content');


function resolver(state) {
    return cache.load(state)
        .then(obj => manifest(obj))
        .then(obj => content(obj))
        .then(obj => cache.save(obj))
        .then((obj) => {
            if(obj.content === undefined) {
               return resolver(obj);
            }
            return obj;
        });
};

module.exports = resolver;
