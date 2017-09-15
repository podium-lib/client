'use strict';

module.exports.load = state =>
    new Promise(resolve => {
        state.manifest = state.registry.get(state.uri);
        state.emit('info', `cache - load data from cache`);
        resolve(state);
    });

module.exports.save = state =>
    new Promise(resolve => {
        if (state.manifest) {
            state.registry.set(
                state.uri,
                state.manifest,
                state.manifest.metadata.maxAge
            ); // fixme: harden so its possible to not have a maxAge
            state.emit('info', 'cache - saved data to cache');
            return resolve(state);
        }

        state.registry.del(state.uri);
        state.emit('info', 'cache - deleted data in cache');
        return resolve(state);
    });
