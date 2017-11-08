'use strict';

module.exports.load = state =>
    new Promise(resolve => {
        const cached = state.registry.get(state.uri);
        if (cached) {
            state.manifest = cached;
            state.status = 'cached';
            state.emit('debug', 'loaded manifest from cache');
        }
        resolve(state);
    });

module.exports.save = state =>
    new Promise(resolve => {
        if (state.status === 'fresh') {
            state.registry.set(state.uri, state.manifest, state.maxAge);
            state.emit('debug', 'saved manifest to cache');
        }

        if (state.status === 'stale') {
            state.registry.del(state.uri);
            state.status = 'empty';
            state.emit('debug', 'deleted manifest from cache');
        }
        resolve(state);
    });
