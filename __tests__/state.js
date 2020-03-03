/* eslint-disable no-plusplus */

'use strict';

const lolex = require('@sinonjs/fake-timers');
const State = require('../lib/state');

test('State() - object tag - should be PodiumClientState', () => {
    const state = new State();
    expect(Object.prototype.toString.call(state)).toEqual(
        '[object PodiumClientState]',
    );
});

test('State() - "threshold" is larger than "max" - should throw', () => {
    expect(() => {
        // eslint-disable-next-line no-unused-vars
        const state = new State({ resolveThreshold: 6000, resolveMax: 4000 });
    }).toThrowError(
        'argument "resolveMax" must be larger than "resolveThreshold" argument',
    );
});

test('State() - default state - should be "instantiated"', () => {
    const state = new State();
    expect(state.status).toBe('instantiated');
});

test('State.setInitializingState() - call method when object is in "registered" state - should set state to "initializing"', () => {
    const state = new State();
    state.setInitializingState();
    expect(state.status).toBe('initializing');
});

test('State.setInitializingState() - call method when object is in "registered" state - should emit "initializing" event once', () => {
    expect.assertions(1);

    const state = new State();
    state.on('state', event => {
        expect(event).toBe('initializing');
    });

    state.setInitializingState();
    state.setInitializingState();
});

test('State.setStableState() - call method - should set state to "stable"', () => {
    const state = new State();
    state.setInitializingState();
    state.setUnstableState();
    state.setStableState();
    expect(state.status).toBe('stable');
    state.reset();
});

test('State.setStableState() - call method multiple times - should emit "stable" event once', () => {
    expect.assertions(1);

    const state = new State();
    state.on('state', event => {
        expect(event).toBe('stable');
    });

    state.setStableState();
    state.setStableState();
    state.reset();
});

test('State.setUnstableState() - call method when object is in "initializing" state - should set state to "unstable"', () => {
    const state = new State();
    state.setInitializingState();
    state.setUnstableState();
    expect(state.status).toBe('unstable');
    state.reset();
});

test('State.setUnstableState() - call method multiple times - should emit "unstable" event once', () => {
    expect.assertions(1);

    const state = new State();
    state.on('state', event => {
        expect(event).toBe('unstable');
    });

    state.setUnstableState();
    state.setUnstableState();
    state.setUnstableState();
    state.setUnstableState();
    state.reset();
});

test('State() - threshold is 2 seconds - .setUnstableState() is called - should set state to "stable" after threshold is passed', () => {
    const clock = lolex.install();

    const state = new State({ resolveThreshold: 2000 });

    state.setInitializingState();
    state.setUnstableState();
    state.setUnstableState();

    // Tick clock 1 seconds into future
    // Not passed threshold yet. State is still "unstable"
    clock.tick(1000);

    expect(state.status).toBe('unstable');

    state.setUnstableState();
    state.setUnstableState();

    // Tick clock 3 seconds into future
    // Passed threshold. State should now be "stable"
    clock.tick(3000);

    expect(state.status).toBe('stable');
    state.reset();

    clock.uninstall();
});

test('State() - threshold is 2 seconds - .setUnstableState() is called - should emit "stable" event once when threshold is passed', () => {
    expect.assertions(1);

    const clock = lolex.install();

    const state = new State({ resolveThreshold: 2000 });
    state.on('state', event => {
        if (event === 'stable') {
            expect(event).toBe('stable');
        }
    });

    state.setInitializingState();
    state.setUnstableState();
    state.setUnstableState();
    state.setUnstableState();
    state.setUnstableState();

    // Tick clock 3 seconds into future
    // Passed threshold. State should now emit "stable" event
    clock.tick(3000);

    state.reset();

    clock.uninstall();
});

test('State() - exceed max value - should set state to "unhealthy" after max is passed', () => {
    const clock = lolex.install();

    const state = new State({ resolveThreshold: 1000, resolveMax: 2000 });

    state.setInitializingState();

    state.setUnstableState();
    clock.tick(550);
    expect(state.status).toBe('unstable');

    state.setUnstableState();
    clock.tick(550);
    expect(state.status).toBe('unstable');

    state.setUnstableState();
    clock.tick(550);
    expect(state.status).toBe('unstable');

    // Clock passes 2000ms, state should be unhealthy
    state.setUnstableState();
    clock.tick(550);
    expect(state.status).toBe('unhealthy');

    state.reset();

    clock.uninstall();
});

test('State() - exceed max value - then continue to call .setUnstableState() within threshold - should keep state as "unhealthy"', () => {
    const clock = lolex.install();

    const state = new State({ resolveThreshold: 1000, resolveMax: 2000 });

    state.setInitializingState();

    state.setUnstableState();
    clock.tick(550);
    expect(state.status).toBe('unstable');

    state.setUnstableState();
    clock.tick(550);
    expect(state.status).toBe('unstable');

    state.setUnstableState();
    clock.tick(550);
    expect(state.status).toBe('unstable');

    // Clock passes 2000ms, state should be unhealthy
    state.setUnstableState();
    clock.tick(550);
    expect(state.status).toBe('unhealthy');

    state.setUnstableState();
    clock.tick(550);
    expect(state.status).toBe('unhealthy');

    state.setUnstableState();
    clock.tick(550);
    expect(state.status).toBe('unhealthy');

    state.setUnstableState();
    clock.tick(550);
    expect(state.status).toBe('unhealthy');

    state.reset();

    clock.uninstall();
});

test('State() - exceed max value - then continue to call .setUnstableState() - then let threshold timeout - should set state to "stable"', () => {
    const clock = lolex.install();

    const state = new State({ resolveThreshold: 1000, resolveMax: 2000 });

    state.setInitializingState();

    state.setUnstableState();
    clock.tick(550);
    expect(state.status).toBe('unstable');

    state.setUnstableState();
    clock.tick(550);
    expect(state.status).toBe('unstable');

    state.setUnstableState();
    clock.tick(550);
    expect(state.status).toBe('unstable');

    // Clock passes 2000ms, state should be unhealthy
    state.setUnstableState();
    clock.tick(550);
    expect(state.status).toBe('unhealthy');

    state.setUnstableState();
    clock.tick(550);
    expect(state.status).toBe('unhealthy');

    state.setUnstableState();
    clock.tick(550);
    expect(state.status).toBe('unhealthy');

    // Clock passes threshold, state should be stable
    state.setUnstableState();
    clock.tick(4000);
    expect(state.status).toBe('stable');

    state.reset();

    clock.uninstall();
});

test('State() - exceed max value - then continue to call .setUnstableState() within threshold - should emit "unhealthy" event once', () => {
    expect.assertions(1);

    const clock = lolex.install();

    const state = new State({ resolveThreshold: 1000, resolveMax: 2000 });
    state.on('state', event => {
        if (event === 'unhealthy') {
            expect(event).toBe('unhealthy');
        }
    });

    state.setInitializingState();

    state.setUnstableState();
    clock.tick(550);

    state.setUnstableState();
    clock.tick(550);

    state.setUnstableState();
    clock.tick(550);

    // Clock passes 2000ms, state should be unhealthy
    state.setUnstableState();
    clock.tick(550);

    state.setUnstableState();
    clock.tick(550);

    state.setUnstableState();
    clock.tick(550);

    state.setUnstableState();
    clock.tick(550);

    state.reset();

    clock.uninstall();
});

test('State() - exceed max value - then continue to call .setUnstableState() - then let threshold timeout - should emit state events only once', () => {
    expect.assertions(3);

    const clock = lolex.install();

    const state = new State({ resolveThreshold: 1000, resolveMax: 2000 });
    state.on('state', event => {
        if (event === 'unstable') {
            expect(event).toBe('unstable');
        }
        if (event === 'unhealthy') {
            expect(event).toBe('unhealthy');
        }
        if (event === 'stable') {
            expect(event).toBe('stable');
        }
    });

    state.setInitializingState();

    state.setUnstableState();
    clock.tick(550);

    state.setUnstableState();
    clock.tick(550);

    state.setUnstableState();
    clock.tick(550);

    // Clock passes 2000ms, state should be unhealthy
    state.setUnstableState();
    clock.tick(550);

    state.setUnstableState();
    clock.tick(550);

    state.setUnstableState();
    clock.tick(550);

    // Clock passes threshold, state should be stable
    state.setUnstableState();
    clock.tick(4000);

    state.reset();

    clock.uninstall();
});

test('State.reset() - call method - should clear timers and reset state to initial value', () => {
    const clock = lolex.install();

    const state = new State({ resolveThreshold: 2000 });

    state.setInitializingState();
    state.setUnstableState();
    state.setUnstableState();

    // Tick clock 1 seconds into future
    // Not passed threshold yet. State is still "unstable"
    clock.tick(1000);
    expect(state.status).toBe('unstable');

    state.reset();

    expect(state.status).toBe('instantiated');

    // Tick clock 3 seconds into future
    // Passed threshold. Internal timers should not have executed
    clock.tick(3000);

    expect(state.status).toBe('instantiated');

    clock.uninstall();
});
