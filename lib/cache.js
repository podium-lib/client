'use strict';

const EventEmitter = require('events');


function validate(item) {
    if (item && item.expires > Date.now()) {
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
        if (item === undefined) {
            return item;
        }
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

        const expires = Date.now() + (maxAge ? maxAge : this.maxAge);
        this.store.set(key, { value, expires });
        return value;
    }

    del(key) {
        const item = this.store.delete(key);
        this.emit('dispose', key);
        return undefined;
    }

    entries(mutator) {
        return Array
                .from(this.store)
                .filter((item) => {
                    if (validate(item[1])) return true;
                    this.del(item[0]);
                    return false;
                }).map((item) => {
                    if (typeof mutator === 'function') {
                        return mutator(item[0], item[1].value, item[1].expires);
                    }
                    return [item[0], item[1].value, item[1].expires];
                });
    }
};
