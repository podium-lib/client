/* eslint-disable no-underscore-dangle */
/* eslint-disable import/order */

'use strict';

const EventEmitter = require('events');
const util = require('util');

const _thresholdTimer = Symbol('podium:client:state:threshold:timer');
const _threshold = Symbol('podium:client:state:threshold');
const _maxTimer = Symbol('podium:client:state:max:timer');
const _state = Symbol('podium:client:state:state');
const _max = Symbol('podium:client:state:max');

const PodiumClientState = class PodiumClientState extends EventEmitter {
    constructor({
        resolveThreshold = 10 * 1000,
        resolveMax = 4 * 60 * 1000,
    } = {}) {
        super();
        if (resolveThreshold > resolveMax)
            throw new Error(
                'argument "resolveMax" must be larger than "resolveThreshold" argument',
            );

        this[_thresholdTimer] = undefined;
        this[_threshold] = resolveThreshold;
        this[_maxTimer] = undefined;
        this[_state] = 'instantiated';
        this[_max] = resolveMax;
    }

    get status() {
        return this[_state];
    }

    setInitializingState() {
        const state = 'initializing';

        if (this[_state] === 'instantiated') {
            this[_state] = state;
            this.emit('state', state);
        }
    }

    setStableState() {
        const state = 'stable';

        clearTimeout(this[_maxTimer]);

        if (this[_state] !== state) {
            this[_state] = state;
            this.emit('state', state);
        }
    }

    setUnhealthyState() {
        const state = 'unhealthy';

        if (this[_state] !== state) {
            this[_state] = state;
            this.emit('state', state);
        }
    }

    setUnstableState() {
        // When switching from stable state to unstable state, start a max
        // timeout. This max timeout will be reset if a stable state is reached
        // again before it times out. If this times out, unhealthy state is
        // reached.
        if (this[_state] === 'stable' || this[_state] === 'initializing') {
            this[_maxTimer] = setTimeout(
                this.setUnhealthyState.bind(this),
                this[_max],
            );
            this[_maxTimer].unref();
        }

        // If state is unhealthy, continue keeping it unhealthy.
        const state = this[_state] === 'unhealthy' ? 'unhealthy' : 'unstable';

        // Clear any possible previous threshold timeouts in case because we are
        // there was a call to this method within the threshold time.
        clearTimeout(this[_thresholdTimer]);

        if (this[_state] !== state) {
            this[_state] = state;
            this.emit('state', state);
        }

        // Set a threshold timeout. If no further calls is done to this method a
        // the timeout will call method for setting stable state.
        this[_thresholdTimer] = setTimeout(
            this.setStableState.bind(this),
            this[_threshold],
        );
        this[_thresholdTimer].unref();
    }

    reset() {
        clearTimeout(this[_thresholdTimer]);
        clearTimeout(this[_maxTimer]);
        this[_state] = 'instantiated';
    }

    get [Symbol.toStringTag]() {
        return 'PodiumClientState';
    }

    toJSON() {
        return {
            status: this.status,
        };
    }

    [util.inspect.custom](depth, options) {
        return util.inspect(this.toJSON(), depth, options);
    }
};
module.exports = PodiumClientState;
