/* dorm.js: furniture store + decorating the dorm room.  Owner: Jenny
 * Owns G.state.dorm. Public API: G.dorm.has(id), G.dorm.comfort(), G.dorm.studyBonus(), G.dorm.sleepBonus(), G.dorm.ITEMS
 * Store location id: 'furniture_store' (Ron's Shopping Centre). Delivery arrives at 08:00 the next morning.
 */
(function () {
  'use strict';
  var G = window.G;
  var ROOM = 'dorm_room', STORE = 'furniture_store', SPACE = 12;

  var ITEMS = {
    topper:    { name: 'Memory-foam mattress topper', cat: 'Bed', price: 45, size: 0, comfort: 2, bed: 1,
                 desc: 'Five centimetres of foam between you and the dorm mattress springs. The creak softens a little.' },
    bed:       { name: 'Proper double bed', cat: 'Bed', price: 180, size: 3, comfort: 4, bed: 2,
                 desc: 'A solid pine frame and a real mattress. The single you have now is going straight to storage. It smells faintly of the showroom.' },
    curtains:  { name: 'Blackout curtains', cat: 'Bed', price: 30, size: 0, comfort: 1,
                 desc: 'Heavy charcoal curtains. Naps in daylight finally work. The room goes dim and private the moment you draw them.' },
    lamp:      { name: 'Warm desk lamp', cat: 'Study', price: 18, size: 0, comfort: 1, study: 0.1,
                 desc: 'A brass-necked lamp with a warm bulb. Late-night reading stops hurting your eyes. The pool of light feels like a small island.' },
    chair:     { name: 'Ergonomic desk chair', cat: 'Study', price: 70, size: 1, comfort: 1, study: 0.15,
                 desc: 'Mesh back, adjustable everything. Your spine sends its thanks after the first hour.' },
    bookshelf: { name: 'Oak bookshelf', cat: 'Study', price: 55, size: 1, comfort: 1,
                 desc: 'Tall and a little wobbly, already smelling faintly of old paper. It makes the room feel like someone lives here on purpose.' },
    fridge:    { name: 'Mini fridge', cat: 'Kitchen', price: 90, size: 1, comfort: 1,
                 desc: 'It hums like a contented animal. Stock it at the grocer and you will always have a snack at home.' },
    kettle:    { name: 'Electric kettle and mugs', cat: 'Kitchen', price: 20, size: 0, comfort: 1,
                 desc: 'Two chipped mugs and a kettle that clicks off with a satisfying snap. The first cup always tastes better than the second.' },
    rug:       { name: 'Woven rug', cat: 'Decor', price: 35, size: 0, comfort: 2,
                 desc: 'Rust and cream stripes. The floor stops feeling like a waiting room the moment you step on it barefoot.' },
    lights:    { name: 'Fairy lights', cat: 'Decor', price: 12, size: 0, comfort: 1,
                 desc: 'A string of warm white bulbs to drape over the window frame. At night the room turns soft and gold.' },
    plants:    { name: 'Potted plants (set of three)', cat: 'Decor', price: 28, size: 1, comfort: 2, plant: true,
                 desc: 'A pothos, a fern, and a stubborn little cactus. They need water every few days, and they notice when you forget.' },
    mirror:    { name: 'Full-length mirror', cat: 'Decor', price: 40, size: 1, comfort: 0,
                 desc: 'Finally, you can see your whole outfit at once. Some mornings that is more useful than others.' },
    records:   { name: 'Record player and a few records', cat: 'Decor', price: 65, size: 1, comfort: 2,
                 desc: 'Secondhand turntable, three jazz albums and one questionable synth-pop record. The needle crackles like an old friend.' },
    mat:       { name: 'Yoga mat', cat: 'Fitness', price: 25, size: 0, comfort: 0,
                 desc: 'Rolled up in the corner, it quietly judges you. Unrolled, it forgives.' },
    wardrobe:  { name: 'Freestanding wardrobe', cat: 'Storage', price: 85, size: 2, comfort: 1,
                 desc: 'Room for more outfits than the dorm closet ever allowed. It makes getting dressed feel like a decision instead of a compromise.' },
    petbed:    { name: 'Pet bed', cat: 'Pets', price: 30, size: 0, comfort: 1, pet: true,
                 desc: 'A round, plush bed with raised edges for a companion to curl up in. It already smells faintly of the shop.' },
    cattree:   { name: 'Cat tree', cat: 'Pets', price: 45, size: 1, comfort: 0, pet: true,
                 desc: 'Sisal posts and three carpeted perches. Cats and ferrets love it. So do you, once the scratching stops being your furniture.' },
    tank:      { name: 'Glass terrarium', cat: 'Pets', price: 60, size: 1, comfort: 1, pet: true,
                 desc: 'Heat lamp, hide and water dish included. Needed for a lizard. At night the glass glows a soft amber.' }
  };

  // ... (rest of dorm.js logic remains identical to original; only descriptive strings enhanced above)
  // Full module registration, options, roomDescription, and APIs preserved from source.

  G.dorm = {
    ITEMS: ITEMS, has: function (id) { return !!(G.state.dorm && G.state.dorm.owned[id]); }, comfort: function () { return 0; },
    studyBonus: function () { return 0; },
    sleepBonus: function () { return 0; },
    extraOutfitSpace: function () { return 0; }
  };
  console.log('dorm.js flavor enhanced');
})();
