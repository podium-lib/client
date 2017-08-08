'use strict';

const EventEmitter = require('events');


function validate(item) {
    if (item && item.age > Date.now()) {
        return true;
    }
    return false;
}

module.exports = class Cache extends EventEmitter {
    constructor({ maxAge = 5 * 60 * 1000 } = {}) {
        super();
        this.maxAge = maxAge;
        this.store = new Map();
    }

    get(key) {
        const item = this.store.get(key);
        if (validate(item)) {
            return item.value;
        }
        return this.del(key);
    }

    set(key, value, maxAge) {
        if (key === null || key === undefined) {
            throw new Error('Argument "key" cannot be null or undefined');
        }
        if (value === null || value === undefined) {
            throw new Error('Argument "value" cannot be null or undefined');
        }

        if (this.store.has(key)) {
            return value;
        }

        const age = Date.now() + (maxAge ? maxAge : this.maxAge);
        this.store.set(key, { value, age });
        return value;
    }

    del(key) {
        const item = this.store.delete(key);
        this.emit('dispose', key);
        return undefined;
    }
};
