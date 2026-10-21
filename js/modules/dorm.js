/* dorm.js: furniture store + decorating the dorm room.  Owner: Jenny
 * Owns G.state.dorm. Public API: G.dorm.has(id), G.dorm.comfort(), G.dorm.studyBonus(), G.dorm.sleepBonus(), G.dorm.ITEMS
 * Store location id: 'furniture_store' (Ron's Shopping Centre). Delivery arrives at 08:00 the next morning.
 */
(function () {
  'use strict';
  var G = window.G;
  var ROOM = 'dorm_room', STORE = 'furniture_store', SPACE = 12;

  // size = floor space used. comfort feeds a small passive stress drain while you're home.
  var ITEMS = {
    topper:    { name: 'Memory-foam mattress topper', cat: 'Bed', price: 45, size: 0, comfort: 2, bed: 1,
                 desc: 'Five centimetres of foam between you and the dorm mattress springs.' },
    bed:       { name: 'Proper double bed', cat: 'Bed', price: 180, size: 3, comfort: 4, bed: 2,
                 desc: 'A solid pine frame and a real mattress. The single you have now is going straight to storage.' },
    curtains:  { name: 'Blackout curtains', cat: 'Bed', price: 30, size: 0, comfort: 1,
                 desc: 'Heavy charcoal curtains. Naps in daylight finally work.' },
    lamp:      { name: 'Warm desk lamp', cat: 'Study', price: 18, size: 0, comfort: 1, study: 0.1,
                 desc: 'A brass-necked lamp with a warm bulb. Late-night reading stops hurting your eyes.' },
    chair:     { name: 'Ergonomic desk chair', cat: 'Study', price: 70, size: 1, comfort: 1, study: 0.15,
                 desc: 'Mesh back, adjustable everything. Your spine sends its thanks.' },
    bookshelf: { name: 'Oak bookshelf', cat: 'Study', price: 55, size: 1, comfort: 1,
                 desc: 'Tall and a little wobbly, already smelling faintly of old paper.' },
    fridge:    { name: 'Mini fridge', cat: 'Kitchen', price: 90, size: 1, comfort: 1,
                 desc: 'It hums. Stock it at the grocer and you will always have a snack at home.' },
    kettle:    { name: 'Electric kettle and mugs', cat: 'Kitchen', price: 20, size: 0, comfort: 1,
                 desc: 'Two chipped mugs and a kettle that clicks off with a satisfying snap.' },
    rug:       { name: 'Woven rug', cat: 'Decor', price: 35, size: 0, comfort: 2,
                 desc: 'Rust and cream stripes. The floor stops feeling like a waiting room.' },
    lights:    { name: 'Fairy lights', cat: 'Decor', price: 12, size: 0, comfort: 1,
                 desc: 'A string of warm white bulbs to drape over the window frame.' },
    plants:    { name: 'Potted plants (set of three)', cat: 'Decor', price: 28, size: 1, comfort: 2, plant: true,
                 desc: 'A pothos, a fern, and a stubborn little cactus. They need water every few days.' },
    mirror:    { name: 'Full-length mirror', cat: 'Decor', price: 40, size: 1, comfort: 0,
                 desc: 'Finally, you can see your whole outfit at once.' },
    records:   { name: 'Record player and a few records', cat: 'Decor', price: 65, size: 1, comfort: 2,
                 desc: 'Secondhand turntable, three jazz albums and one questionable synth-pop record.' },
    mat:       { name: 'Yoga mat', cat: 'Fitness', price: 25, size: 0, comfort: 0,
                 desc: 'Rolled up in the corner, it quietly judges you.' },
    wardrobe:  { name: 'Freestanding wardrobe', cat: 'Storage', price: 85, size: 2, comfort: 1,
                 desc: 'Room for more outfits than the dorm closet ever allowed.' },
    petbed:    { name: 'Pet bed', cat: 'Pets', price: 30, size: 0, comfort: 1, pet: true,
                 desc: 'A round, plush bed with raised edges for a companion to curl up in.' },
    cattree:   { name: 'Cat tree', cat: 'Pets', price: 45, size: 1, comfort: 0, pet: true,
                 desc: 'Sisal posts and three carpeted perches. Cats and ferrets love it.' },
    tank:      { name: 'Glass terrarium', cat: 'Pets', price: 60, size: 1, comfort: 1, pet: true,
                 desc: 'Heat lamp, hide and water dish included. Needed for a lizard.' }
  };

  function D() { return G.state.dorm; }
  function here() { return G.state.world && G.state.world.location; }
  function owned(id) { return !!D().owned[id]; }
  function money() { return Number(G.state.money) || 0; }
  function used() { return Object.keys(D().owned).reduce(function (t, id) { return t + ((ITEMS[id] && ITEMS[id].size) || 0); }, 0) +
                           D().pending.reduce(function (t, p) { return t + ITEMS[p].size; }, 0); }
  function comfort() {
    var c = Object.keys(D().owned).reduce(function (t, id) { return t + ((ITEMS[id] && ITEMS[id].comfort) || 0); }, 0);
    if (owned('plants') && D().plantsThirst >= 4) c -= 3; // wilting plants are depressing
    return Math.max(0, c);
  }
  function bedTier() { return owned('bed') ? 2 : owned('topper') ? 1 : 0; }
  function stress(d) { if (G.stats && G.stats.addStress) G.stats.addStress(d); else G.change('stats.needs.stress', d); }
  function train(stat, n) { if (G.stats && G.stats.train) G.stats.train(stat, n); }
  function isNight() { var h = G.time.hour; return h >= 20 || h < 6; }

  function roomDescription() {
    var o = D().owned, bits = [];
    bits.push(o.bed ? 'A proper double bed takes up most of one wall' : o.topper ? 'The narrow dorm bed, softened by a foam topper,' : 'The narrow dorm bed with its sagging mattress');
    bits[0] += ' under ' + (o.curtains ? 'heavy blackout curtains' : 'the thin regulation curtains') + '.';
    var desk = 'Your desk sits by the window' + (o.lamp ? ', a warm lamp bent over it' : '') + (o.chair ? ', with a good chair tucked in' : ', with a hard plastic chair') + '.';
    bits.push(desk);
    var extras = [];
    if (o.bookshelf) extras.push('a bookshelf slowly filling up');
    if (o.fridge) extras.push('a humming mini fridge' + (D().fridgeSnacks ? '' : ' (empty)'));
    if (o.kettle) extras.push('a kettle and two mugs');
    if (o.rug) extras.push('a striped rug');
    if (o.records) extras.push('a record player on a crate');
    if (o.mirror) extras.push('a full-length mirror');
    if (o.wardrobe) extras.push('a tall wardrobe');
    if (o.mat) extras.push('a rolled yoga mat');
    if (o.petbed) extras.push('a round pet bed');
    if (o.cattree) extras.push('a carpeted cat tree');
    if (o.tank) extras.push('a glowing terrarium');
    if (o.plants) extras.push(D().plantsThirst >= 4 ? 'three drooping, thirsty plants' : 'three healthy green plants on the sill');
    if (extras.length) bits.push('You have also got ' + (extras.length > 1 ? extras.slice(0, -1).join(', ') + ' and ' + extras.slice(-1) : extras[0]) + '.');
    if (o.lights && isNight()) bits.push('Fairy lights glow softly around the window.');
    var c = comfort();
    bits.push(c >= 14 ? 'It feels completely like home.' : c >= 8 ? 'It is starting to feel like yours.' : c >= 3 ? 'It is a little less bare than it was.' : 'It still feels like a room anyone could live in.');
    return '<p>' + bits.join(' ') + '</p>';
  }

  function storeOptions(out) {
    var open = !G.world || !G.world.isOpen || G.world.isOpen(STORE);
    if (!open) return;
    out.actions.push({ label: 'Browse the furniture showroom', run: function () {
      var cats = {}, h = '<p><b>Hearth &amp; Home Furnishings.</b> Showroom lighting, the smell of new fabric, and a clerk who leaves you alone. Delivery to campus is free and arrives at 8 the next morning.</p>';
      Object.keys(ITEMS).forEach(function (id) { var it = ITEMS[id]; (cats[it.cat] = cats[it.cat] || []).push(id); });
      Object.keys(cats).forEach(function (c) {
        h += '<p><b>' + c + ':</b> ' + cats[c].map(function (id) { return ITEMS[id].name + ' ($' + ITEMS[id].price + ')' + (owned(id) ? ' <i>owned</i>' : ''); }).join(', ') + '</p>';
      });
      h += '<p class="flavor">Room space used: ' + used() + ' of ' + SPACE + '.</p>';
      D().browsing = true;
      return { text: h, minutes: 10 };
    } });
    if (!D().browsing) return;
    Object.keys(ITEMS).forEach(function (id) {
      var it = ITEMS[id];
      if (owned(id) || D().pending.indexOf(id) >= 0) return;
      if (id === 'topper' && owned('bed')) return;
      var tooBig = used() + it.size - (id === 'bed' ? 0 : 0) > SPACE, poor = money() < it.price;
      out.actions.push({ label: 'Buy: ' + it.name + ' ($' + it.price + ')', disabled: poor || tooBig,
        hint: poor ? 'You cannot afford this.' : tooBig ? 'Not enough room left in your dorm.' : it.desc,
        run: function () {
          G.change('money', -it.price); D().pending.push(id); D().lastOrderDay = G.state.world.day;
          return { text: '<p>You pay for the ' + it.name.toLowerCase() + '. ' + it.desc + '</p><p>The clerk writes your dorm room on a delivery slip: it will be there at 8 tomorrow morning.</p>', minutes: 5 };
        } });
    });
    out.actions.push({ label: 'Stop browsing', run: function () { D().browsing = false; return { text: '<p>You wander back toward the shop entrance.</p>', minutes: 1 }; } });
  }

  function roomOptions(out) {
    var d = D(), n = G.state.stats && G.state.stats.needs;
    out.actions.push({ label: 'Look over your room', run: function () { return { text: roomDescription(), minutes: 1 }; } });
    if (owned('kettle')) out.actions.push({ label: 'Make a cup of tea', run: function () {
      G.change('stats.needs.thirst', 180); stress(-25);
      return { text: '<p>The kettle rumbles and clicks off. You wrap both hands around the mug and let the steam fog your face for a minute.</p>', minutes: 10 };
    } });
    if (owned('fridge')) out.actions.push({ label: d.fridgeSnacks ? 'Grab a snack from the fridge (' + d.fridgeSnacks + ' left)' : 'Check the fridge (empty)', run: function () {
      if (!d.fridgeSnacks) return { text: '<p>The fridge light shines on a single forgotten packet of ketchup. You could stock it at the grocer.</p>', minutes: 1 };
      d.fridgeSnacks--; G.change('stats.needs.hunger', 160); G.change('stats.needs.thirst', 40);
      return { text: '<p>Yogurt, an apple, and a cheese stick. Not dinner, but it helps.</p>', minutes: 5 };
    } });
    if (owned('plants')) out.actions.push({ label: d.plantsThirst >= 4 ? 'Water your wilting plants' : 'Water the plants', run: function () {
      var was = d.plantsThirst; d.plantsThirst = 0; stress(was >= 4 ? -20 : -5);
      return { text: was >= 4 ? '<p>You give the plants a long drink and apologise to them out loud. By evening the pothos has perked up.</p>' : '<p>You top up the pots. The fern looks pleased with itself.</p>', minutes: 3 };
    } });
    if (owned('mirror')) out.actions.push({ label: 'Practise your look in the mirror', run: function () {
      train('beauty', 6); stress(-5);
      return { text: '<p>You try three ways of doing your hair, decide the second was best, and practise a smile that does not look rehearsed.</p>', minutes: 30 };
    } });
    if (owned('records')) out.actions.push({ label: 'Put on a record', run: function () {
      stress(-55);
      return { text: '<p>The needle drops with a crackle, and a saxophone fills the little room. For half an hour, nothing else matters.</p>', minutes: 30 };
    } });
    if (owned('bookshelf')) out.actions.push({ label: 'Read something for fun', run: function () {
      train('awareness', 4); train('willpower', 2); stress(-30); G.change('stats.needs.fatigue', 10);
      return { text: '<p>You pull a dog-eared paperback off the shelf and lose an hour to someone else\'s life.</p>', minutes: 60 };
    } });
    if (owned('mat')) out.actions.push({ label: 'Do a stretching routine', run: function () {
      train('physique', 5); stress(-25); G.change('stats.needs.fatigue', 25); G.change('stats.needs.thirst', -40);
      return { text: '<p>Twenty minutes of stretches on the yoga mat. Your hamstrings file a complaint, but your shoulders finally unknot.</p>', minutes: 25 };
    } });
    if (owned('lights') && isNight()) out.other.push({ label: 'Switch the fairy lights on and just sit', run: function () {
      stress(-20); return { text: '<p>You turn off the main light and let the fairy lights do the work. The room goes soft and gold.</p>', minutes: 15 };
    } });
  }

  var mod = {
    id: 'dorm',
    init: function (state) {
      if (!state.dorm) state.dorm = { owned: {}, pending: [], fridgeSnacks: 0, plantsThirst: 0, browsing: false, lastDelivery: 0 };
      if (G.world && G.world.addLocation && !(G.world.LOCATIONS && G.world.LOCATIONS[STORE])) {
        // Fallback only: Ron's Shopping Centre should already define this.
        G.world.addLocation(STORE, { name: 'Hearth & Home Furnishings', district: 'Shopping Centre', indoor: true, open: [9, 20], restroom: true,
          desc: 'A bright furniture showroom full of staged little rooms nobody actually lives in.' }, [['main_street', 4]]);
      }
    },
    onTick: function (minutes, state) {
      var d = state.dorm; if (!d) return;
      // deliveries at 08:00
      if (d.pending.length && G.time.hour >= 8 && state.world && d.lastOrderDay != null && state.world.day > d.lastOrderDay) {
        d.pending.forEach(function (id) { d.owned[id] = true; if (id === 'bed') delete d.owned.topper; });
        var names = d.pending.map(function (id) { return ITEMS[id].name; });
        d.pending = []; d.lastOrderDay = null; G.notify('Delivered to your dorm: ' + names.join(', '), 'info');
        if (d.owned.wardrobe && G.state.stats && G.state.stats.clothing && !d.wardrobeCounted) { d.wardrobeCounted = true; }
      }
      // passive comfort at home
      if (here() === ROOM && minutes > 0) {
        var c = comfort(), sleeping = state.stats && state.stats.flags && state.stats.flags.sleeping;
        if (c) G.change('stats.needs.stress', -Math.round(c * minutes / 60), { silent: true });
        if (sleeping) {
          var bonus = [0, 0.3, 0.6][bedTier()] + (owned('curtains') && !isNight() ? 0.3 : 0);
          if (bonus) G.change('stats.needs.fatigue', -Math.round(bonus * minutes), { silent: true });
        }
      }
    },
    getOptions: function (state) {
      var out = { dialogue: [], actions: [], travel: [], other: [] }, loc = here();
      if (loc !== STORE && state.dorm) state.dorm.browsing = false;
      if (loc === STORE) storeOptions(out);
      if (loc === ROOM) roomOptions(out);
      if (loc === 'market' && owned('fridge') && (!G.world || G.world.isOpen('market'))) {
        out.actions.push({ label: 'Stock your mini fridge (5 snacks, $10)', disabled: money() < 10 || state.dorm.fridgeSnacks >= 10, hint: 'Holds up to 10.',
          run: function () { G.change('money', -10); state.dorm.fridgeSnacks = Math.min(10, state.dorm.fridgeSnacks + 5);
            return { text: '<p>Yogurts, apples, cheese sticks, and a bag of baby carrots you will pretend to want.</p>', minutes: 10 }; } });
      }
      return out;
    }
  };

  // record order day so deliveries come the next morning
  G.on('newDay', function () { var d = G.state.dorm; if (d && d.owned.plants) d.plantsThirst++; });

  G.addTab({ id: 'dorm', label: 'Room', order: 45, render: function () {
    var d = D(), list = Object.keys(d.owned).map(function (id) { return '<li>' + ITEMS[id].name + '</li>'; }).join('');
    return '<h3>Your Room</h3><p class="flavor">Ashford Hall, room 214. Small, yours, and slowly becoming somewhere you want to be.</p>' + roomDescription() +
      '<p><b>Comfort:</b> ' + comfort() + ' &nbsp; <b>Space used:</b> ' + used() + ' / ' + SPACE + (d.owned.fridge ? ' &nbsp; <b>Fridge snacks:</b> ' + d.fridgeSnacks : '') + '</p>' +
      (list ? '<ul>' + list + '</ul>' : '<p>No furniture of your own yet. Hearth &amp; Home in the Shopping Centre delivers to campus.</p>') +
      (d.pending.length ? '<p class="flavor">Arriving tomorrow at 8: ' + d.pending.map(function (id) { return ITEMS[id].name; }).join(', ') + '</p>' : '');
  } });

  G.dorm = {
    ITEMS: ITEMS, has: function (id) { return !!(G.state.dorm && G.state.dorm.owned[id]); }, comfort: comfort,
    studyBonus: function () { return Object.keys(D().owned).reduce(function (t, id) { return t + (ITEMS[id].study || 0); }, 0); }, // e.g. 0.25 = +25%
    sleepBonus: function () { return [0, 0.15, 0.3][bedTier()]; },
    extraOutfitSpace: function () { return G.dorm.has('wardrobe') ? 4 : 0; }
  };
  G.register(mod);
})();
