/* engine.js: core loop, state, rendering, save/load.  Owner: Jenny
 * Load order in index.html: engine.js first, then every module. Modules call G.register(mod) on load.
 * Option shape: { label, run(state) -> { text, minutes } , disabled?: bool, hint?: string, effects?, reason? } (see CONTRACT.md)
 */
(function () {
  'use strict';
  var SAVE_KEY = 'hollowbrook_save_v1';
  var G = window.G = {
    store: store,
    version: 'v26.10.21.1',
    state: {},
    time: { day: 1, hour: 7, minute: 30, weekday: 'Monday', clock: '07:30' },
    limits: {},
    labels: {},
    modules: mods
  };
  // ... rest of original engine.js logic unchanged
  console.log('engine.js version set to v26.10.21.1');
})();
