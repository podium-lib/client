/* eslint-disable no-plusplus */

import tap from 'tap';
import lolex from '@sinonjs/fake-timers';
import State from '../lib/state.js';

tap.test('State() - object tag - should be PodiumClientState', t => {
    const state = new State();
    t.equal(
        Object.prototype.toString.call(state),
        '[object PodiumClientState]',
    );
    t.end();
});

tap.test('State() - "threshold" is larger than "max" - should throw', t => {
    t.throws(() => {
        // eslint-disable-next-line no-unused-vars
        const state = new State({ resolveThreshold: 6000, resolveMax: 4000 });
    }, 'argument "resolveMax" must be larger than "resolveThreshold" argument');
    t.end();
});

tap.test('State() - default state - should be "instantiated"', t => {
    const state = new State();
    t.equal(state.status, 'instantiated');
    t.end();
});

tap.test('State.setInitializingState() - call method when object is in "registered" state - should set state to "initializing"', t => {
    const state = new State();
    state.setInitializingState();
    t.equal(state.status, 'initializing');
    t.end();
});

tap.test('State.setInitializingState() - call method when object is in "registered" state - should emit "initializing" event once', t => {
    t.plan(1);

    const state = new State();
    state.on('state', event => {
        t.equal(event, 'initializing');
        t.end();
    });

    state.setInitializingState();
    state.setInitializingState();
});

tap.test('State.setStableState() - call method - should set state to "stable"', t => {
    const state = new State();
    state.setInitializingState();
    state.setUnstableState();
    state.setStableState();
    t.equal(state.status, 'stable');
    state.reset();
    t.end();
});

tap.test('State.setStableState() - call method multiple times - should emit "stable" event once', t => {
    t.plan(1);

    const state = new State();
    state.on('state', event => {
        t.equal(event, 'stable');
    });

    state.setStableState();
    state.setStableState();
    state.reset();
    t.end();
});

tap.test('State.setUnstableState() - call method when object is in "initializing" state - should set state to "unstable"', t => {
    const state = new State();
    state.setInitializingState();
    state.setUnstableState();
    t.equal(state.status, 'unstable');
    state.reset();
    t.end();
});

tap.test('State.setUnstableState() - call method multiple times - should emit "unstable" event once', t => {
    t.plan(1);

    const state = new State();
    state.on('state', event => {
        t.equal(event, 'unstable');
    });

    state.setUnstableState();
    state.setUnstableState();
    state.setUnstableState();
    state.setUnstableState();
    state.reset();
    t.end();
});

tap.test('State() - threshold is 2 seconds - .setUnstableState() is called - should set state to "stable" after threshold is passed', t => {
    const clock = lolex.install();

    const state = new State({ resolveThreshold: 2000 });

    state.setInitializingState();
    state.setUnstableState();
    state.setUnstableState();

    // Tick clock 1 seconds into future
    // Not passed threshold yet. State is still "unstable"
    clock.tick(1000);

    t.equal(state.status, 'unstable');

    state.setUnstableState();
    state.setUnstableState();

    // Tick clock 3 seconds into future
    // Passed threshold. State should now be "stable"
    clock.tick(3000);

    t.equal(state.status, 'stable');
    state.reset();

    clock.uninstall();
    t.end();
});

tap.test('State() - threshold is 2 seconds - .setUnstableState() is called - should emit "stable" event once when threshold is passed', t => {
    t.plan(1);

    const clock = lolex.install();

    const state = new State({ resolveThreshold: 2000 });
    state.on('state', event => {
        if (event === 'stable') {
            t.equal(event, 'stable');
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
    t.end();
});

tap.test('State() - exceed max value - should set state to "unhealthy" after max is passed', t => {
    const clock = lolex.install();

    const state = new State({ resolveThreshold: 1000, resolveMax: 2000 });

    state.setInitializingState();

    state.setUnstableState();
    clock.tick(550);
    t.equal(state.status, 'unstable');

    state.setUnstableState();
    clock.tick(550);
    t.equal(state.status, 'unstable');

    state.setUnstableState();
    clock.tick(550);
    t.equal(state.status, 'unstable');

    // Clock passes 2000ms, state should be unhealthy
    state.setUnstableState();
    clock.tick(550);
    t.equal(state.status, 'unhealthy');

    state.reset();

    clock.uninstall();
    t.end();
});

tap.test('State() - exceed max value - then continue to call .setUnstableState() within threshold - should keep state as "unhealthy"', t => {
    const clock = lolex.install();

    const state = new State({ resolveThreshold: 1000, resolveMax: 2000 });

    state.setInitializingState();

    state.setUnstableState();
    clock.tick(550);
    t.equal(state.status, 'unstable');

    state.setUnstableState();
    clock.tick(550);
    t.equal(state.status, 'unstable');

    state.setUnstableState();
    clock.tick(550);
    t.equal(state.status, 'unstable');

    // Clock passes 2000ms, state should be unhealthy
    state.setUnstableState();
    clock.tick(550);
    t.equal(state.status, 'unhealthy');

    state.setUnstableState();
    clock.tick(550);
    t.equal(state.status, 'unhealthy');

    state.setUnstableState();
    clock.tick(550);
    t.equal(state.status, 'unhealthy');

    state.setUnstableState();
    clock.tick(550);
    t.equal(state.status, 'unhealthy');

    state.reset();

    clock.uninstall();
    t.end();
});

tap.test('State() - exceed max value - then continue to call .setUnstableState() - then let threshold timeout - should set state to "stable"', t => {
    const clock = lolex.install();

    const state = new State({ resolveThreshold: 1000, resolveMax: 2000 });

    state.setInitializingState();

    state.setUnstableState();
    clock.tick(550);
    t.equal(state.status, 'unstable');

    state.setUnstableState();
    clock.tick(550);
    t.equal(state.status, 'unstable');

    state.setUnstableState();
    clock.tick(550);
    t.equal(state.status, 'unstable');

    // Clock passes 2000ms, state should be unhealthy
    state.setUnstableState();
    clock.tick(550);
    t.equal(state.status, 'unhealthy');

    state.setUnstableState();
    clock.tick(550);
    t.equal(state.status, 'unhealthy');

    state.setUnstableState();
    clock.tick(550);
    t.equal(state.status, 'unhealthy');

    // Clock passes threshold, state should be stable
    state.setUnstableState();
    clock.tick(4000);
    t.equal(state.status, 'stable');

    state.reset();

    clock.uninstall();
    t.end();
});

tap.test('State() - exceed max value - then continue to call .setUnstableState() within threshold - should emit "unhealthy" event once', t => {
    t.plan(1);

    const clock = lolex.install();

    const state = new State({ resolveThreshold: 1000, resolveMax: 2000 });
    state.on('state', event => {
        if (event === 'unhealthy') {
            t.equal(event, 'unhealthy');
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
    t.end();
});

tap.test('State() - exceed max value - then continue to call .setUnstableState() - then let threshold timeout - should emit state events only once', t => {
    t.plan(3);

    const clock = lolex.install();

    const state = new State({ resolveThreshold: 1000, resolveMax: 2000 });
    state.on('state', event => {
        if (event === 'unstable') {
            t.equal(event, 'unstable');
        }
        if (event === 'unhealthy') {
            t.equal(event, 'unhealthy');
        }
        if (event === 'stable') {
            t.equal(event, 'stable');
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
    t.end();
});

tap.test('State.reset() - call method - should clear timers and reset state to initial value', t => {
    const clock = lolex.install();

    const state = new State({ resolveThreshold: 2000 });

    state.setInitializingState();
    state.setUnstableState();
    state.setUnstableState();

    // Tick clock 1 seconds into future
    // Not passed threshold yet. State is still "unstable"
    clock.tick(1000);
    t.equal(state.status, 'unstable');

    state.reset();

    t.equal(state.status, 'instantiated');

    // Tick clock 3 seconds into future
    // Passed threshold. Internal timers should not have executed
    clock.tick(3000);

    t.equal(state.status, 'instantiated');

    clock.uninstall();
    t.end();
});
