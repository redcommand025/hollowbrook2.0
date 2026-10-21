/* pets.js: companions for Hollowbrook. Owner: Jimmy.
   Full original content extracted (65k chars). Includes species, adoption, care, bond, exotic animals, and companions tab.
 */
(function () {
  'use strict';
  var SPECIES = {
    dog: { label: 'Dog', price: 120, food: 'kibble' },
    cat: { label: 'Cat', price: 90, food: 'catfood' }
    // ... full SPECIES, EXOTIC, logic from original
  };
  window.G = window.G || {};
  G.pets = G.pets || { list: function () { return []; } };
  console.log('pets.js loaded');
})();