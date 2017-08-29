'use strict';

module.exports.load = (state) => {
    return new Promise((resolve, reject) => {
        state.manifest = state.registry.get(state.uri);
        state.emit('info', `cache - load data from cache`);
        resolve(state);
    });
}


module.exports.save = (state) => {
    return new Promise((resolve, reject) => {
        if (state.manifest) {
            state.registry.set(state.uri, state.manifest, state.manifest.metadata.maxAge);  // fixme: harden so its possible to not have a maxAge
            state.emit('info', 'cache - saved data to cache');
            return resolve(state);
        }

        state.registry.del(state.uri);
        state.emit('info', 'cache - deleted data in cache');
        return resolve(state);
    });
}
