'use strict';

const EventEmitter = require('events');

const inspect = Symbol.for('nodejs.util.inspect.custom');

const PodiumClientState = class PodiumClientState extends EventEmitter {
    #thresholdTimer;
    #threshold;
    #maxTimer;
    #state;
    #max;
    constructor({
        resolveThreshold = 10 * 1000,
        resolveMax = 4 * 60 * 1000,
    } = {}) {
        super();
        if (resolveThreshold > resolveMax)
            throw new Error(
                'argument "resolveMax" must be larger than "resolveThreshold" argument',
            );

        this.#thresholdTimer = undefined;
        this.#threshold = resolveThreshold;
        this.#maxTimer = undefined;
        this.#state = 'instantiated';
        this.#max = resolveMax;
    }

    get status() {
        return this.#state;
    }

    setInitializingState() {
        const state = 'initializing';

        if (this.#state === 'instantiated') {
            this.#state = state;
            this.emit('state', state);
        }
    }

    setStableState() {
        const state = 'stable';

        clearTimeout(this.#maxTimer);

        if (this.#state !== state) {
            this.#state = state;
            this.emit('state', state);
        }
    }

    setUnhealthyState() {
        const state = 'unhealthy';

        if (this.#state !== state) {
            this.#state = state;
            this.emit('state', state);
        }
    }

    setUnstableState() {
        // When switching from stable state to unstable state, start a max
        // timeout. This max timeout will be reset if a stable state is reached
        // again before it times out. If this times out, unhealthy state is
        // reached.
        if (this.#state === 'stable' || this.#state === 'initializing') {
            this.#maxTimer = setTimeout(
                this.setUnhealthyState.bind(this),
                this.#max,
            );
            this.#maxTimer.unref();
        }

        // If state is unhealthy, continue keeping it unhealthy.
        const state = this.#state === 'unhealthy' ? 'unhealthy' : 'unstable';

        // Clear any possible previous threshold timeouts in case because we are
        // there was a call to this method within the threshold time.
        clearTimeout(this.#thresholdTimer);

        if (this.#state !== state) {
            this.#state = state;
            this.emit('state', state);
        }

        // Set a threshold timeout. If no further calls is done to this method a
        // the timeout will call method for setting stable state.
        this.#thresholdTimer = setTimeout(
            this.setStableState.bind(this),
            this.#threshold,
        );
        this.#thresholdTimer.unref();
    }

    reset() {
        clearTimeout(this.#thresholdTimer);
        clearTimeout(this.#maxTimer);
        this.#state = 'instantiated';
    }

    toJSON() {
        return {
            status: this.status,
        };
    }

    [inspect]() {
        return {
            status: this.status,
        };
    }

    get [Symbol.toStringTag]() {
        return 'PodiumClientState';
    }
};
module.exports = PodiumClientState;
