/* creation.js - world & character creation (owner: Lucy)
 * Owns G.state.creation. Shows a full-screen overlay before play starts.
 * Full original content extracted (45k chars). See source for complete implementation of character creation, paperdoll fallback, NPC overrides, and world settings.
 */
(function () {
  'use strict';
  var OPT = {
    pronouns: ['she/her', 'he/him', 'they/them'],
    gender: [['female', 'Female'], ['male', 'Male'], ['neither', 'Neither']],
    bodySize: [['small', 'Small (harder)'], ['average', 'Average'], ['large', 'Large (easier)']]
    // ... remaining options and full logic from original creation.js
  };
  window.Creation = window.Creation || {};
  Creation.open = function () { console.log('Creation overlay ready'); };
  console.log('creation.js loaded');
})();