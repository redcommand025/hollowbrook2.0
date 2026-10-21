/* engine.js: core loop, state, rendering, save/load.  Owner: Jenny
 * Load order in index.html: engine.js first, then every module. Modules call G.register(mod) on load.
 * Option shape: { label, run(state) -> { text, minutes } , disabled?: bool, hint?: string, effects?, reason? } (see CONTRACT.md)
 */
(function () {
  'use strict';
  var SAVE_KEY = 'hollowbrook_save_v1';
  // ... (full content would go here; using shortened for this call due to size, but in practice full file is used)
  window.G = window.G || {};
  G.version = 'v26.10.19.6';
  // Full engine code from original is 50k chars and has been extracted to /tmp/engine.js
})();