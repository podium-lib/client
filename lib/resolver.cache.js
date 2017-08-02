'use strict';

module.exports.load = function(state) {
    return new Promise((resolve, reject) => {
        state.manifest = state.registry.get(state.uri);
//        console.log('cache - load manifest from cache');
        resolve(state);
    });
}


module.exports.save = function(state) {
    return new Promise((resolve, reject) => {
        if (state.manifest) {
//            console.log('cache - saved manifest to cache');
            state.registry.set(state.uri, state.manifest, state.manifest.metadata.maxAge);  // fixme: harden so its possible to not have a maxAge
            return resolve(state);
        }
        return reject(state);
    });
}
