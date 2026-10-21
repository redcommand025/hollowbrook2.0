/* world.js — set map, travel, clock/calendar, weather, random events.  Owner: Ron
 * Owns G.state.world and keeps G.time in sync.
 * Public helpers for other modules live on G.world (see bottom of file).
 */
(function () {
  'use strict';
  var G = window.G;

  /* ---------------- Calendar ---------------- */
  var WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var SEASONS = ['Autumn', 'Winter', 'Spring', 'Summer'];   // game opens in early autumn term
  var DAYS_PER_SEASON = 28;

  /* ---------------- Map ----------------
   * district groups locations; links are walking minutes between neighbours.
   * open: [fromHour, toHour) or null for always open. indoor: shelters from weather.
   */
  var LOCATIONS = {
    dorm_room:     { name: 'Your Dorm Room', district: 'Campus', indoor: true, open: null, restroom: true,
                     desc: 'A narrow single room in Ashford Hall: a creaky bed, a desk under the window, and a radiator that knocks at night.' },
    dorm_hall:     { name: 'Ashford Hall Corridor', district: 'Campus', indoor: true, open: null, restroom: true,
                     desc: 'Notice boards, a humming vending machine, and the shared bathroom at the end of the hall.' },
    quad:          { name: 'Main Quad', district: 'Campus', indoor: false, open: null,
                     desc: 'An oak-shaded lawn ringed by red-brick buildings. Students cut across it at every hour.' },
    lecture_hall:  { name: 'Lecture Rooms (Calloway Main Building)', district: 'Campus', indoor: true, open: [7, 21], restroom: true,
                     desc: 'Tiered seating, flickering projectors, and the smell of old radiators.' },
    library:       { name: 'Whitlock Library', district: 'Campus', indoor: true, open: [8, 23], restroom: true,
                     desc: 'Three quiet floors of stacks. The top floor carrels are always taken during exams.' },
    cafeteria:     { name: 'Dining Commons', district: 'Campus', indoor: true, open: [7, 20], restroom: true,
                     desc: 'Long tables, a salad bar, and coffee that tastes faintly of the urn.' },
    gym:           { name: 'Fieldhouse & Gym', district: 'Campus', indoor: true, open: [6, 22], restroom: true,
                     desc: 'Squeaking sneakers, a weight room, and an indoor track on the mezzanine.' },
    campus_farm:   { name: 'College Teaching Farm', district: 'Campus Edge', indoor: false, open: [6, 19],
                     desc: 'Raised beds, a polytunnel, two goats, and a few hens kept by the agriculture department.' },
    main_street:   { name: 'Main Street', district: 'Town', indoor: false, open: null, street: true,
                     desc: 'The heart of Hollowbrook: bunting between lampposts, a bakery, a pharmacy, the Copper Kettle, the grocer and the florist.' },
    cafe:          { name: 'The Copper Kettle Café', district: 'Town', indoor: true, open: [7, 19], restroom: true,
                     desc: 'Mismatched armchairs, a chalkboard menu, and a cat who sleeps on the windowsill.' },
    market:        { name: 'Hollowbrook Grocer', district: 'Town', indoor: true, open: [7, 22], restroom: true,
                     desc: 'A family-run grocery store: a bakery shelf by the door, aisles of fruit and veg, tins, pasta and noodles, a chiller of milk and drinks, and discount stickers after six.' },
    florist:       { name: 'Fern & Foxglove Florist', district: 'Town', indoor: true, open: [9, 18],
                     desc: 'Buckets of cut flowers spill onto the pavement. It always smells like rain inside.' },
    park:          { name: 'Millpond Park', district: 'Town', indoor: false, open: null,
                     desc: 'A duck pond, a bandstand, and benches carved with decades of initials.' },
    residential:   { name: 'Elm Row', district: 'Residential', indoor: false, open: null, street: true,
                     desc: 'A residential street of terraced houses with tidy gardens, wind chimes, and a neighbourhood watch sign. Most of your neighbours live here.' },
    alley:         { name: 'Back Alley', district: 'Town', indoor: false, open: null, alleyway: true,
                     desc: 'Bins behind the shops, fire escapes, and a shortcut most people avoid after dark. It threads behind Main Street, the square and the High Street, with a side gate onto the college grounds.' },
    bar:           { name: 'The Lantern Pub', district: 'Town', indoor: true, open: [12, 24], restroom: true,
                     desc: 'Low beams, a darts board, and open-mic night every Thursday.' },
    old_mill:      { name: 'The Old Mill', district: 'Outskirts', indoor: false, open: null,
                     desc: 'A derelict water mill by the river where outcasts and dreamers tend to drift.' },
    deans_office:   { name: "Dean's Office", district: 'Campus', indoor: true, open: [8, 17], restroom: true,
                     desc: 'Wood panelling, a ticking clock, and a secretary who has seen every excuse twice.' },
    town_square:   { name: 'Market Square', district: 'Town', indoor: false, open: null, street: true,
                     desc: 'A cobbled square with a war memorial, a drinking fountain, and pigeons that fear no one.' },
    town_hall:     { name: 'Hollowbrook Town Hall', district: 'Town', indoor: true, open: [8, 18], restroom: true,
                     desc: 'A stone civic building with creaking floors, council notices, and a portrait of every past mayor.' },
    church:        { name: "St. Aldric's Church", district: 'Town', indoor: true, open: [7, 20],
                     desc: 'A small flint church with a cool, quiet nave and a noticeboard full of bake sales.' },
    docks:         { name: 'River Docks', district: 'Outskirts', indoor: false, open: null,
                     desc: 'Old wooden jetties, moored narrowboats, and the slap of the river against the pilings.' },
    shopping_centre: { name: 'Brookside Shopping Centre', district: 'Shopping Centre', indoor: true, open: [9, 20], restroom: true,
                     desc: 'A two-storey glass-roofed arcade with a fountain in the atrium, piped music, and benches full of tired shoppers.' },
    clothing_store: { name: 'Threadbare & Co.', district: 'Shopping Centre', indoor: true, open: [9, 19], tags: ['public', 'mirror'],
                     desc: 'A narrow clothing shop with creaky floorboards, racks sorted by colour, and a velvet-curtained fitting room. The owner hums along to the radio.' },
    furniture_store: { name: 'Hearth & Home Furnishings', district: 'Shopping Centre', indoor: true, open: [9, 19],
                     desc: 'Showroom bedrooms in miniature, a wall of lamps, and a rug section that smells of new wool. Small items to take away; bigger pieces delivered to campus.' },
    pet_store:     { name: 'Paws & Whiskers Pet Shop', district: 'Shopping Centre', indoor: true, open: [9, 18],
                     desc: 'Chirping budgies, a tank of lazy goldfish, and a noticeboard of animals from the local rescue looking for homes.' },
    hair_salon:    { name: 'Snip & Curl Salon', district: 'Shopping Centre', indoor: true, open: [9, 18], tags: ['mirror', 'public'],
                     desc: 'Three chairs, a wall of mirrors, a shelf of dye swatches in every shade, and a radio tuned to golden oldies. It smells of shampoo and hot air.' },
    vet_clinic:    { name: 'Brookside Veterinary Clinic', district: 'Shopping Centre', indoor: true, open: [8, 18], restroom: true,
                     desc: 'A bright waiting room with a weighing scale, a rack of leaflets on fleas, and a receptionist who knows every animal by name.' },
    woods:         { name: 'Hollow Woods', district: 'Outskirts', indoor: false, open: null,
                     desc: 'Birch and bracken, a muddy footpath, and stories about lights between the trees.' }
  };

  var NIGHT_EXTRA = {};

  /* ---------------- Street grid (polish pass): every street has places to go into and streets to travel to ---------------- */
  function S(name, district, desc, night) { return { name: name, district: district, indoor: false, open: null, street: true, tags: ['public'], desc: desc, night: night }; }
  function B(name, district, indoor, open, desc, night, extra) { var o = { name: name, district: district, indoor: indoor, open: open, desc: desc, night: night }; for (var k in (extra || {})) o[k] = extra[k]; return o; }
  var GRID_LOCS = {
    college_road:  S('College Road', 'Town', 'A tree-lined road outside the college\'s iron gates, with a bus shelter, a row of bike racks and a sandwich van at lunchtime.', 'The college gates stand open under two lamps. A few students drift home in twos and threes.'),
    high_street:   S('High Street', 'Town', 'The newer end of town: chain shops, a bank, and the glass front of Brookside Shopping Centre.', 'The shopping centre\'s glass front is dark, and a kebab shop glows on the corner.'),
    river_lane:    S('River Lane', 'Outskirts', 'A lane running down to the river past the Lantern pub, with the docks below and a track out to the old mill and the woods.', 'The Lantern\'s windows glow. Beyond them the lane runs on into dark fields and the sound of the river.'),
    dog_pound:     B('Hollowbrook Dog Pound', 'Residential', true, [9, 17], 'A low brick rescue centre at the end of Elm Row: rows of kennels, a smell of disinfectant and a volunteer rota on the wall. Every dog wants your attention.', 'The kennels are locked for the night. You can hear the dogs settling.', { tags: ['water'] }),
    main_building: B('Calloway Main Building', 'Campus', true, [7, 22], 'The red-brick heart of the college: a tiled entrance hall with corridors to the lecture rooms and the dean\'s office.', 'The entrance hall is half lit and echoing. A cleaner\'s trolley squeaks somewhere down a corridor.', { restroom: true, tags: ['public', 'water'] })
  };
  Object.keys(GRID_LOCS).forEach(function (id) { var o = GRID_LOCS[id], n = o.night; delete o.night; LOCATIONS[id] = o; NIGHT_EXTRA[id] = n; });

  var LINKS = [
    // Campus: the grounds lead into the main building (lectures, dean) and to Ashford Hall, the dorm, a separate building.
    ['dorm_room', 'dorm_hall', 1], ['dorm_hall', 'quad', 3], ['quad', 'main_building', 2],
    ['main_building', 'lecture_hall', 1], ['main_building', 'deans_office', 1],
    ['quad', 'library', 3], ['quad', 'cafeteria', 3], ['quad', 'gym', 4], ['quad', 'campus_farm', 10],
    ['quad', 'college_road', 2],
    // Go-to places off each street
    ['main_street', 'cafe', 1], ['main_street', 'market', 1], ['main_street', 'florist', 1],
    ['town_square', 'town_hall', 1], ['town_square', 'church', 2],
    ['high_street', 'shopping_centre', 1], ['residential', 'dog_pound', 2],
    ['river_lane', 'docks', 2], ['river_lane', 'bar', 2], ['river_lane', 'old_mill', 4], ['river_lane', 'woods', 10],
    ['alley', 'quad', 4],
    // Streets to streets
    ['college_road', 'main_street', 5], ['college_road', 'residential', 5], ['college_road', 'park', 5], ['college_road', 'alley', 4],
    ['main_street', 'town_square', 3], ['main_street', 'high_street', 3], ['main_street', 'alley', 2],
    ['town_square', 'alley', 2], ['town_square', 'park', 5], ['town_square', 'river_lane', 6],
    ['high_street', 'alley', 3], ['residential', 'park', 4], ['residential', 'alley', 4],
    ['river_lane', 'alley', 4], ['river_lane', 'park', 6],
    // Places that hang off other places
    ['old_mill', 'docks', 4], ['old_mill', 'woods', 10], ['campus_farm', 'woods', 12],
    ['shopping_centre', 'clothing_store', 1], ['shopping_centre', 'furniture_store', 1], ['shopping_centre', 'pet_store', 1],
    ['shopping_centre', 'hair_salon', 1], ['shopping_centre', 'vet_clinic', 2], ['pet_store', 'vet_clinic', 1]
  ];
  // Special wording for some links, keyed 'from>to'.
  var LINK_LABEL = {
    'college_road>quad': 'Go through the campus gates', 'quad>college_road': 'Out through the campus gates to College Road',
    'quad>main_building': 'Go into Calloway Main Building', 'quad>dorm_hall': 'Go to Ashford Hall (dorm)',
    'alley>quad': 'Slip through the side gate onto the campus grounds', 'quad>alley': 'Slip out through the side gate into the Back Alley',
    'shopping_centre>clothing_store': 'Ground floor: Threadbare & Co.', 'shopping_centre>hair_salon': 'Ground floor: Snip & Curl Salon',
    'shopping_centre>furniture_store': 'First floor: Hearth & Home Furnishings', 'shopping_centre>pet_store': 'Second floor: Paws & Whiskers Pet Shop',
    'shopping_centre>vet_clinic': 'Second floor: Brookside Veterinary Clinic'
  };
  // Tags read by stats.js (hereHas) and anyone else: outdoors, restroom, water, food, home, gym, quiet, mirror, public.
  var EXTRA_TAGS = {
    dorm_room: ['home', 'quiet', 'mirror', 'water'], dorm_hall: ['water', 'mirror', 'food'],
    library: ['quiet', 'water'], cafeteria: ['food', 'water', 'public'], cafe: ['food', 'water', 'public'],
    market: ['food', 'water', 'public'], bar: ['food', 'water', 'public'], gym: ['gym', 'water', 'mirror'],
    lecture_hall: ['public', 'water'], quad: ['public'], main_street: ['public'], town_square: ['public', 'water'],
    park: ['public', 'water'], shopping_centre: ['public', 'water', 'food'], church: ['quiet'], woods: ['quiet'], town_hall: ['public']
  };
  Object.keys(LOCATIONS).forEach(function (id) { tagLoc(id); });
  function tagLoc(id) {
    var l = LOCATIONS[id], t = (l.tags || []).slice();
    if (!l.indoor) t.push('outdoors'); else t.push('indoors');
    if (l.restroom) t.push('restroom');
    (EXTRA_TAGS[id] || []).forEach(function (x) { if (t.indexOf(x) < 0) t.push(x); });
    l.id = id; l.tags = t;
  }
  // Aliases so other modules' shorthand ids resolve to real map ids (G.world.is / G.world.resolve).
  var ALIASES = {
    school: 'quad', college: 'quad', campus_grounds: 'quad', campus_gates: 'college_road', market_square: 'town_square', pub: 'bar', shop: 'market', forest: 'woods', back_alley: 'alley', home: 'dorm_room', dorms: 'dorm_hall', campus: 'quad', classroom: 'lecture_hall', farm: 'campus_farm',
    office: 'deans_office', street: 'main_street',
    college_classroom: 'lecture_hall', college_library: 'library', college_quad: 'quad', college_office: 'deans_office',
    meadow_farm: 'campus_farm', town_market: 'market', grocer: 'market', grocery: 'market', groceries: 'market', grocery_store: 'market', supermarket: 'market'
  };
  function resolve(id) { return LOCATIONS[id] ? id : (ALIASES[id] || id); }
  var ADJ = {};
  LINKS.forEach(function (l) {
    (ADJ[l[0]] = ADJ[l[0]] || {})[l[1]] = l[2];
    (ADJ[l[1]] = ADJ[l[1]] || {})[l[0]] = l[2];
  });

  /* ---------------- Weather ---------------- */
  var WEATHER = {
    clear:    { label: 'Clear',        text: 'The sky is clear and bright.',                     fatigue: 0,  wet: 0,  stress: -1 },
    cloudy:   { label: 'Overcast',     text: 'A flat grey sky hangs over town.',                 fatigue: 0,  wet: 0,  stress: 0 },
    drizzle:  { label: 'Drizzle',      text: 'A fine drizzle mists everything.',                 fatigue: 1,  wet: 4,  stress: 1 },
    rain:     { label: 'Rain',         text: 'Rain drums on rooftops and fills the gutters.',    fatigue: 2,  wet: 12, stress: 2 },
    storm:    { label: 'Thunderstorm', text: 'Thunder rolls and sheets of rain sweep the streets.', fatigue: 4, wet: 25, stress: 5 },
    fog:      { label: 'Fog',          text: 'Thick fog swallows the far end of every street.',  fatigue: 1,  wet: 2,  stress: 1 },
    snow:     { label: 'Snow',         text: 'Snow falls softly, muffling every sound.',          fatigue: 3,  wet: 6,  stress: 0 },
    hot:      { label: 'Heatwave',     text: 'Heat shimmers off the pavement.',                  fatigue: 3,  wet: 0,  stress: 2, thirst: 4 },
    windy:    { label: 'Blustery',     text: 'Wind tugs at coats and sends leaves skittering.',  fatigue: 1,  wet: 0,  stress: 1 }
  };
  // Season weights: [clear, cloudy, drizzle, rain, storm, fog, snow, hot, windy]
  var KEYS = ['clear', 'cloudy', 'drizzle', 'rain', 'storm', 'fog', 'snow', 'hot', 'windy'];
  var SEASON_WEIGHTS = {
    Autumn: [20, 25, 15, 15, 4, 10, 0, 0, 11],
    Winter: [15, 25, 8, 10, 2, 12, 25, 0, 3],
    Spring: [25, 20, 18, 15, 6, 6, 0, 2, 8],
    Summer: [40, 12, 5, 8, 8, 2, 0, 20, 5]
  };

  function pickWeighted(weights) {
    var total = weights.reduce(function (a, b) { return a + b; }, 0), r = Math.random() * total;
    for (var i = 0; i < weights.length; i++) { r -= weights[i]; if (r < 0) return i; }
    return 0;
  }

  /* ---------------- Random events ----------------
   * Each: id, where (location ids, district names, or '*'), when(state) optional, chance (0-1 per check),
   * run(state) -> {text, minutes}. Fired on arrival, and occasionally on idle actions.
   * Content stays grounded and short; stat effects go through G.change so the player sees them.
   */
  var EVENTS = [
    { id: 'found_coins', where: ['*outdoor'], chance: 0.04,
      run: function () { var n = 1 + Math.floor(Math.random() * 5); G.change('money', n);
        return { text: 'Something glints by the kerb. You pick up <b>$' + n + '</b> in loose change.' }; } },
    { id: 'sudden_shower', where: ['*outdoor'], chance: 0.05, when: function (s) { return ['cloudy', 'drizzle'].indexOf(s.world.weather) >= 0; },
      run: function (s) { s.world.weather = 'rain'; wetClothes(15);
        return { text: 'The clouds give up without warning. A sudden shower soaks you before you can find cover.' }; } },
    { id: 'street_musician', where: ['main_street', 'park'], chance: 0.12, when: function () { return G.time.hour >= 10 && G.time.hour < 20; },
      run: function () { G.change('stats.needs.stress', -20);
        return { text: 'A busker with a battered guitar plays something slow and familiar. You stop to listen for a song, and your shoulders loosen a little.', minutes: 4 }; } },
    { id: 'flyer', where: ['quad', 'dorm_hall', 'cafeteria'], chance: 0.1,
      run: function () { var f = pick(['a pub quiz at The Lantern on Thursday', 'a volunteer day at the teaching farm', 'an open audition for the drama society', 'a lost cat named Biscuit, last seen near Elm Row', 'a study group for midterms in Whitlock Library']);
        return { text: 'A brightly coloured flyer is pinned up here, advertising ' + f + '.' }; } },
    { id: 'spilled_coffee', where: ['cafe', 'cafeteria', 'lecture_hall'], chance: 0.05,
      run: function () { G.change('stats.clothing.upperWetness', 20); G.change('stats.needs.stress', 15);
        return { text: 'Someone squeezing past jogs your elbow and coffee splashes down your front. They apologise in a rush and are gone.' }; } },
    { id: 'free_sample', where: ['market', 'main_street'], chance: 0.08, when: function () { return G.time.hour >= 9 && G.time.hour < 17; },
      run: function () { G.change('stats.needs.hunger', 40);
        return { text: 'A cheerful stallholder presses a warm sample of bread into your hand. It is very good.' }; } },
    { id: 'night_noise', where: ['alley', 'old_mill', 'woods'], chance: 0.12, when: function () { return G.time.hour >= 21 || G.time.hour < 5; },
      run: function () { G.change('stats.needs.stress', 30);
        return { text: 'A clatter somewhere behind you makes your heart jump. Just a fox knocking over a bin, probably. Probably.' }; } },
    { id: 'lights_in_woods', where: ['woods'], chance: 0.15, when: function () { return G.time.hour >= 19 || G.time.hour < 5; },
      run: function () { aware(2);
        return { text: 'Between the birches, a faint blue light drifts and winks out. When you blink, there is only dark.' }; } },
    { id: 'goats_loose', where: ['campus_farm'], chance: 0.1,
      run: function () { G.change('stats.needs.fatigue', 30);
        return { text: 'The goats have got out again. It takes ten undignified minutes and a handful of oats to herd them back.', minutes: 10 }; } },
    { id: 'jogger_wave', where: ['park', 'residential'], chance: 0.08, when: function () { return G.time.hour >= 6 && G.time.hour < 9; },
      run: function () { G.change('stats.needs.stress', -5);
        return { text: 'An early jogger gives you a breathless wave as they pass. Hollowbrook is that kind of town.' }; } },
    { id: 'pickpocket_attempt', where: ['main_street', 'bar', 'alley'], chance: 0.03,
      run: function (s) { var aw = num(s, 'stats.core.awareness.value');
        if (Math.random() < physChance((aw + 200) / 1000)) { aware(3);
          return { text: 'You feel a light tug at your pocket and turn just in time. A hooded figure mutters something and melts into the crowd.' }; }
        var loss = Math.min(num(s, 'money'), 5 + Math.floor(Math.random() * 15)); G.change('money', -loss); G.change('stats.needs.stress', 40);
        return { text: 'Later, you reach for your wallet and find it lighter than it should be. Someone in the crowd was quicker than you.' }; } },
    { id: 'rainbow', where: ['*outdoor'], chance: 0.15, when: function (s) { return s.world.prevWeather === 'rain' && s.world.weather !== 'rain'; },
      run: function () { G.change('stats.needs.stress', -15);
        return { text: 'As the rain eases, a pale rainbow arches over the rooftops. A few people stop and point.' }; } }
  ];


  /* ---------------- Night descriptions (used from dusk to dawn) ---------------- */
  var NIGHT = {
    dorm_room: 'Your desk lamp throws a small yellow circle. Through the wall, a neighbour\'s music thumps faintly.',
    dorm_hall: 'The corridor lights are on their dim setting. Someone has left a pizza box outside their door.',
    quad: 'Path lamps make pools of light under the oaks. A few students hurry across, hoods up.',
    lecture_hall: 'Empty rows and the hum of a vending machine. A cleaner pushes a mop down the aisle.',
    library: 'The late crowd hunches over laptops. The top floor is so quiet you can hear the radiators tick.',
    cafeteria: 'Chairs are upturned on half the tables, and the last tray trolley rattles back to the kitchen.',
    gym: 'Fluorescent lights buzz over a near-empty weight room. One runner circles the mezzanine track.',
    campus_farm: 'The polytunnel glows faintly under the moon. The goats shuffle in their shed.',
    main_street: 'Shop shutters are down. The bakery\'s window is dark, but the Copper Kettle\'s sign still glows.',
    cafe: 'Chairs stacked, chalkboard wiped clean. The cat watches you through the glass.',
    market: 'Strip lights over half-empty shelves and a basket of yellow-stickered bread by the till.',
    florist: 'Buckets brought in for the night. Through the window, petals glow pale in the dark.',
    park: 'The pond is black and still. The bandstand is a dark shape, and something rustles in the reeds.',
    residential: 'Curtains drawn, televisions flickering blue behind them, and a cat on every second wall.',
    alley: 'One flickering bulb over a fire door. Your footsteps echo louder than they should.',
    bar: 'Crowded and loud: darts thudding, a table singing badly, and the smell of chips.',
    old_mill: 'The wheel creaks in the current. Someone has lit a small fire inside the broken walls.',
    woods: 'Pitch dark between the trunks. Every snapped twig sounds like a footstep.',
    shopping_centre: 'Shutters down on every unit. A security guard does slow laps past the switched-off fountain.',
    clothing_store: 'Mannequins stand in the dark window like a silent audience.',
    furniture_store: 'Showroom lamps left on in the window make tiny, cosy rooms no one lives in.',
    pet_store: 'A night light glows over the fish tanks. Somewhere inside, a hamster wheel squeaks.',
    hair_salon: 'The chairs are empty and the dryers hooded like sleeping birds. A price list glows in the window.',
    vet_clinic: 'Closed. A sign on the door gives an emergency number, and a cat in a recovery kennel watches from the window.',
    deans_office: 'The corridor is locked and dark. A single desk lamp has been left on behind frosted glass.',
    town_square: 'The memorial is lit from below. A couple sits on the fountain\'s edge, talking quietly.',
    town_hall: 'The clock face glows over the square, a little slow as always.',
    church: 'Candles gutter by the door. The stained glass is dark from inside.',
    docks: 'Narrowboat windows glow warm along the jetty, and woodsmoke drifts over the water.'
  };
  Object.keys(NIGHT_EXTRA).forEach(function (id) { if (!NIGHT[id]) NIGHT[id] = NIGHT_EXTRA[id]; });


  /* ---------------- Seasonal festivals ----------------
   * One per season on a fixed day. On the day: a notice at dawn, changed descriptions,
   * extra actions at the host location. A flyer appears in the 3 days before.
   */
  var FESTIVALS = [
    { id: 'lantern_fair', season: 'Autumn', day: 14, where: 'town_square', from: 16, to: 23, name: 'Harvest Lantern Fair',
      desc: 'Paper lanterns are strung across the square, stalls sell toffee apples and mulled cider, and a brass band plays by the memorial.',
      acts: [
        { label: 'Buy a toffee apple ($3)', cost: 3, text: 'Sticky, crunchy, and impossible to eat with dignity.', fx: { 'stats.needs.hunger': 120, 'stats.needs.stress': -30 }, minutes: 10 },
        { label: 'Release a paper lantern', text: 'You light a paper lantern with the crowd by the memorial and let it go. Hundreds of small lights drift up over the rooftops.', fx: { 'stats.needs.stress': -80 }, minutes: 30 },
        { label: 'Try the apple-bobbing barrel', text: 'You come up gasping, soaked to the collar, with an apple clamped in your teeth. The crowd cheers.', fx: { 'stats.clothing.upperWetness': 35, 'stats.needs.stress': -40 }, minutes: 10 } ] },
    { id: 'frost_market', season: 'Winter', day: 21, where: 'main_street', from: 10, to: 21, name: 'Frost Market',
      desc: 'Wooden chalets line Main Street, selling knitwear, roasted chestnuts, and hot chocolate. Fairy lights wind up every lamppost.',
      acts: [
        { label: 'Buy roasted chestnuts ($4)', cost: 4, text: 'A paper cone of hot chestnuts warms your hands better than any glove.', fx: { 'stats.needs.hunger': 150, 'stats.needs.stress': -25 }, minutes: 10 },
        { label: 'Buy a hot chocolate ($3)', cost: 3, text: 'Thick, sweet, and topped with far too much cream.', fx: { 'stats.needs.thirst': 200, 'stats.needs.stress': -30, 'stats.needs.bladder': 80 }, minutes: 10 },
        { label: 'Join the carol singers', text: 'You squeeze in among the carollers by the bus shelter. Nobody minds that you only know half the words.', fx: { 'stats.needs.stress': -70, 'stats.needs.fatigue': 30 }, minutes: 30 } ] },
    { id: 'may_fair', season: 'Spring', day: 10, where: 'park', from: 9, to: 19, name: 'Blossom Fair',
      desc: 'Millpond Park is full of bunting, a maypole stands by the bandstand, and the cherry trees are in full, ridiculous bloom.',
      acts: [
        { label: 'Dance around the maypole', text: 'You grab a ribbon and get hopelessly tangled with three strangers. It is the most you have laughed in weeks.', fx: { 'stats.needs.stress': -80, 'stats.needs.fatigue': 60 }, minutes: 20 },
        { label: 'Buy a strawberry lemonade ($3)', cost: 3, text: 'Tart, cold, and pink as the blossom overhead.', fx: { 'stats.needs.thirst': 250, 'stats.needs.bladder': 90 }, minutes: 5 },
        { label: 'Enter the cake-judging tent', text: 'You sample far more sponge than is wise and give everyone full marks.', fx: { 'stats.needs.hunger': 200, 'stats.needs.stress': -20 }, minutes: 25 } ] },
    { id: 'regatta', season: 'Summer', day: 18, where: 'docks', from: 10, to: 20, name: 'Riverside Regatta',
      desc: 'Bunting hangs from every narrowboat, rowing crews splash past the jetties, and an ice-cream van has parked right by the water.',
      acts: [
        { label: 'Cheer on the college rowing crew', text: 'You shout yourself hoarse as Hollowbrook\'s boat edges ahead by half a length.', fx: { 'stats.needs.stress': -50, 'stats.needs.thirst': -60 }, minutes: 30 },
        { label: 'Buy an ice cream ($3)', cost: 3, text: 'It melts down your wrist faster than you can eat it.', fx: { 'stats.needs.hunger': 80, 'stats.needs.thirst': 60, 'stats.needs.stress': -20 }, minutes: 10 },
        { label: 'Join the duck race', text: 'You buy a numbered rubber duck and watch it bob downstream. It finishes a respectable eleventh.', fx: { 'stats.needs.stress': -40 }, minutes: 20 } ] }
    ,{ id: 'bonfire_night', season: 'Autumn', day: 26, where: 'park', from: 18, to: 23, name: 'Bonfire Night',
      desc: 'A huge bonfire crackles by the millpond, sparklers fizz in gloved hands, and fireworks burst over the bandstand.',
      acts: [
        { label: 'Write your name with a sparkler', text: 'You trace looping letters of light in the dark. They hang there for a heartbeat, then vanish.', fx: { 'stats.needs.stress': -40 }, minutes: 5 },
        { label: 'Buy a cup of parkin and tea ($3)', cost: 3, text: 'Sticky ginger cake and stewed tea, eaten standing close to the fire.', fx: { 'stats.needs.hunger': 140, 'stats.needs.thirst': 150, 'stats.needs.bladder': 70 }, minutes: 10 },
        { label: 'Watch the fireworks', text: 'Rockets thump into the sky and open in great slow chrysanthemums of gold and green. The whole crowd goes "ooh" together.', fx: { 'stats.needs.stress': -70 }, minutes: 25 } ] },
    { id: 'new_year', season: 'Winter', day: 28, where: 'town_square', from: 20, to: 24, name: 'New Year\'s Eve Countdown',
      desc: 'The square is packed, a band plays on a trailer stage, and every eye keeps drifting to the town hall clock.',
      acts: [
        { label: 'Count down with the crowd', text: 'Ten, nine, eight... at midnight the town hall clock is three seconds slow, as always, and nobody cares. Strangers hug. Someone starts singing.', fx: { 'stats.needs.stress': -90, 'stats.status.socialiteFame': 4 }, minutes: 30 },
        { label: 'Buy a mulled apple juice ($3)', cost: 3, text: 'Warm and spiced. You wrap both hands around the cup.', fx: { 'stats.needs.thirst': 200, 'stats.needs.bladder': 90 }, minutes: 5 },
        { label: 'Write a resolution on the wishing wall', text: 'You pin a folded card to the board among hundreds of others. Whatever you wrote, it feels like a promise.', fx: { 'stats.needs.stress': -30 }, minutes: 10 } ] },
    { id: 'egg_hunt', season: 'Spring', day: 22, where: 'quad', from: 10, to: 16, name: 'Spring Egg Hunt',
      desc: 'The student union has hidden painted wooden eggs all over the quad, and grown adults are crawling through flowerbeds with total seriousness.',
      acts: [
        { label: 'Join the egg hunt', text: 'You find four eggs, one inside a drainpipe, and trade them in at the union stall for a chocolate bunny.', fx: { 'stats.needs.stress': -50, 'stats.needs.hunger': 80, 'stats.needs.fatigue': 40 }, minutes: 30 },
        { label: 'Paint an egg at the craft table', text: 'Yours is lopsided and very purple. A volunteer calls it "bold".', fx: { 'stats.needs.stress': -30 }, minutes: 20 } ] },
    { id: 'open_air_cinema', season: 'Summer', day: 7, where: 'quad', from: 20, to: 24, name: 'Open-Air Cinema Night',
      desc: 'A huge inflatable screen stands at the end of the quad, deckchairs in rows on the grass, and the smell of popcorn everywhere.',
      acts: [
        { label: 'Watch the film from a deckchair', text: 'It is an old romantic comedy everyone half knows. People quote along with the best lines and cheer the ending.', fx: { 'stats.needs.stress': -60, 'stats.needs.fatigue': 30 }, minutes: 110 },
        { label: 'Buy popcorn and a lemonade ($4)', cost: 4, text: 'Sweet and salty, mixed, the correct way.', fx: { 'stats.needs.hunger': 100, 'stats.needs.thirst': 180, 'stats.needs.bladder': 90 }, minutes: 5 } ] }
  ];
  function festivalToday() {
    var s = season(), d = ((W().day - 1) % DAYS_PER_SEASON) + 1;
    return FESTIVALS.filter(function (f) { return f.season === s && f.day === d; })[0] || null;
  }
  function festivalSoon() {
    var s = season(), d = ((W().day - 1) % DAYS_PER_SEASON) + 1;
    return FESTIVALS.filter(function (f) { return f.season === s && f.day > d && f.day - d <= 3; })[0] || null;
  }
  function festivalLive() {
    var f = festivalToday(); if (!f) return null;
    return (G.time.hour >= f.from && G.time.hour < f.to) ? f : null;
  }

  /* ---------------- Grocer basket items (aisle index matches AISLES: 0 produce, 1 bakery, 2 dairy, 3 drinks) ---------------- */
  // Items go into Jimmy's Bag via G.groceries (stats.js), using his catalog ids, prices and pack sizes.
  var GROCER = [{ id: 'fruit', aisle: 0 }, { id: 'bread', aisle: 1 }, { id: 'noodles', aisle: 1 }, { id: 'pasta', aisle: 1 },
    { id: 'milk', aisle: 2 }, { id: 'eggs', aisle: 2 }, { id: 'water', aisle: 3 }, { id: 'snacks', aisle: 3 }];
  function gcat(id) { return (G.groceries && G.groceries.CATALOG && G.groceries.CATALOG[id]) || null; }
  function gprice(id) { var c = gcat(id); if (!c) return 0; return id === 'bread' && G.time.hour >= 18 ? Math.max(1, c.price - 1) : c.price; }
  function basketTotal(sh) { return sh.basket.reduce(function (t, id) { return t + gprice(id); }, 0); }
  function basketServings(sh) { return sh.basket.reduce(function (t, id) { var c = gcat(id); return t + (c ? c.qty || 1 : 0); }, 0); }
  function bagRoom() { var g = G.groceries; if (!g || !g.total) return 99; var lim = 24; try { if (typeof g.limit === 'function') lim = g.limit(); } catch (e) {} return lim - g.total(); }
  /* ---------------- Sunbathing (paperdoll tan) ---------------- */
  var SUN_SPOTS = { park: 'the grass by the millpond', docks: 'the end of the sunny jetty', quad: 'the lawn under the oaks' };
  function isRaining() { return ['drizzle', 'rain', 'storm'].indexOf(W().weather) >= 0; }
  function sunny() { var wx = W().weather; return wx === 'clear' || wx === 'hot'; }
  function sunOptions() {
    var here = W().location, spot = SUN_SPOTS[here], h = G.time.hour, out = [];
    if (!spot || h < 9 || h >= 19) return out;
    var why = !sunny() ? 'Not sunny right now' : W().temp < 18 ? 'Too cold for sunbathing' : h >= 17 ? 'The sun is too low now' : '';
    var hot = W().weather === 'hot' || W().temp >= 24;
    var a = { label: 'Sunbathe on ' + spot, icon: '☀️', minutes: 30, section: 'here', effects: ['^Tan', '^−Stress', '!−Drink'], run: function () {
      if (G.doll && G.doll.tan) G.doll.tan(3);
      G.change('stats.needs.stress', -30); G.change('stats.needs.thirst', -50);
      return { text: '<p>You stretch out on ' + spot + ', shoes off, and let the sun do its work. Half an hour passes in a warm daze.</p>', minutes: 30 };
    } };
    var b = { label: 'Lie out in full sun for two hours', icon: '🌞', minutes: 120, section: 'here', effects: ['^More tan', '^−Stress', '!Sunburn risk', '!−Drink', '!+Fatigue'], run: function () {
      var burn = hot || Math.random() < 0.6;
      if (G.doll && G.doll.tan) G.doll.tan(8);
      if (burn && G.doll && G.doll.setTemp) G.doll.setTemp('sunburn', 600);
      G.change('stats.needs.stress', -60); G.change('stats.needs.thirst', -150); G.change('stats.needs.fatigue', 40);
      return { text: '<p>You find a spot on ' + spot + ' with no shade at all and stay there, drifting in and out of a doze.</p><p>' +
        (burn ? 'When you finally sit up, your shoulders and nose are pink and tight. That will sting tonight.' : 'You turn over now and then, and come away warm and golden rather than burnt.') + '</p>', minutes: 120 };
    } };
    if (why) { a.disabled = b.disabled = true; a.reason = b.reason = why; }
    out.push(a, b); return out;
  }

  // Body size (Jimmy's stats.js): small makes physical odds harder and carrying more tiring, large the reverse.
  function physChance(p) { try { if (G.stats && G.stats.physicalChance) return G.stats.physicalChance(p); } catch (e) {} return p; }
  function carryFat(f) { var m = 1; try { if (G.stats && G.stats.carryMult) m = G.stats.carryMult() || 1; } catch (e) {} return Math.round(f / m); }
  function endShop() { W().shop = null; if (G.state.lock && G.state.lock.reason === 'world-shop') G.state.lock = null; }

  /* ---------------- Menus (café, dining commons, pub) ----------------
   * fx are G.change deltas. Hunger/thirst are "fullness": higher is better. Drinks fill the bladder, meals the bowels.
   */
  var MENUS = {
    cafe: { title: 'The Copper Kettle chalkboard', items: [
      { id: 'tea', name: 'Pot of tea', price: 3, fx: { 'stats.needs.thirst': 220, 'stats.needs.stress': -25, 'stats.needs.bladder': 90 }, text: 'A proper pot, with a knitted cosy. You pour slowly and let the world wait.' },
      { id: 'latte', name: 'Latte', price: 4, fx: { 'stats.needs.thirst': 160, 'stats.needs.fatigue': -90, 'stats.needs.bladder': 80 }, text: 'Strong enough to straighten your spine.' },
      { id: 'scone', name: 'Cheese scone', price: 3, fx: { 'stats.needs.hunger': 180, 'stats.needs.bowels': 30 }, text: 'Still warm, with a crust of crisp cheese on top.' },
      { id: 'soup', name: 'Soup of the day with bread', price: 6, fx: { 'stats.needs.hunger': 380, 'stats.needs.thirst': 60, 'stats.needs.bowels': 50, 'stats.needs.stress': -15 }, text: 'Today it is leek and potato. It tastes like being looked after.' },
      { id: 'cake', name: 'Slice of lemon drizzle', price: 3, fx: { 'stats.needs.hunger': 140, 'stats.needs.stress': -30 }, text: 'Sharp, sweet, and gone in four bites.' } ] },
    cafeteria: { title: 'Dining Commons counter', items: [
      { id: 'breakfast', name: 'Cooked breakfast', price: 5, hours: [7, 11], fx: { 'stats.needs.hunger': 450, 'stats.needs.bowels': 70 }, text: 'Eggs, beans, toast, and a hash brown that has seen better days. It does the job.' },
      { id: 'pasta', name: 'Pasta bake', price: 5, hours: [11, 20], fx: { 'stats.needs.hunger': 420, 'stats.needs.bowels': 60 }, text: 'Cheesy, beige, and very filling.' },
      { id: 'salad', name: 'Salad bar bowl', price: 4, fx: { 'stats.needs.hunger': 250, 'stats.needs.thirst': 40, 'stats.needs.bowels': 40 }, text: 'You build a respectable bowl and feel briefly virtuous.' },
      { id: 'juice', name: 'Carton of orange juice', price: 2, fx: { 'stats.needs.thirst': 200, 'stats.needs.bladder': 80 }, text: 'Cold from the fridge, with a straw you lose immediately.' },
      { id: 'urn_coffee', name: 'Urn coffee', price: 1, fx: { 'stats.needs.thirst': 100, 'stats.needs.fatigue': -50, 'stats.needs.bladder': 60 }, text: 'It tastes faintly of the urn, as promised.' } ] },
    bar: { title: 'The Lantern bar menu', items: [
      { id: 'cola', name: 'Pint of cola', price: 3, fx: { 'stats.needs.thirst': 260, 'stats.needs.bladder': 120 }, text: 'Too much ice, as always.' },
      { id: 'cider', name: 'Half of cider', price: 4, fx: { 'stats.needs.thirst': 150, 'stats.needs.stress': -50, 'stats.needs.bladder': 130 }, text: 'Crisp and appley. The edges of the day soften a little.' },
      { id: 'ale', name: 'Pint of local ale', price: 5, fx: { 'stats.needs.thirst': 180, 'stats.needs.stress': -70, 'stats.needs.fatigue': 30, 'stats.needs.bladder': 180 }, text: 'Brewed two villages over, the barman tells you proudly.' },
      { id: 'chips', name: 'Basket of chips', price: 4, fx: { 'stats.needs.hunger': 250, 'stats.needs.thirst': -40, 'stats.needs.bowels': 40 }, text: 'Salty, hot, and served in a tiny frying basket.' },
      { id: 'pie', name: 'Steak and ale pie', price: 9, hours: [12, 21], fx: { 'stats.needs.hunger': 520, 'stats.needs.bowels': 80, 'stats.needs.stress': -20 }, text: 'Rich gravy and pastry so flaky it gets everywhere.' } ] }
  };
  function menuOptions(id) {
    var m = MENUS[id], out = [];
    m.items.forEach(function (it) {
      if (it.hours && (G.time.hour < it.hours[0] || G.time.hour >= it.hours[1])) return;
      out.push(afford({ label: it.name + ' ($' + it.price + ')', minutes: 15, effects: fxTags(it.fx, it.price), run: function () {
        W().menuOpen = null;
        if (num(G.state, 'money') < it.price) return { text: '<p>You count your change twice. Not enough for the ' + it.name.toLowerCase() + '.</p>', minutes: 1 };
        G.change('money', -it.price); applyFx(it.fx);
        return { text: '<p>You order the ' + it.name.toLowerCase() + '. ' + it.text + '</p>', minutes: 15 };
      } }, it.price));
    });
    out.push({ label: 'Never mind', icon: '↩️', minutes: 0, section: 'shop', run: function () { W().menuOpen = null; return { text: '<p>You put the menu back.</p>', minutes: 0 }; } });
    return out;
  }
  function applyFx(fx) { Object.keys(fx || {}).forEach(function (k) { G.change(k, fx[k]); }); }
  // Effects tags for the engine: '^' good, '!' bad. Hunger/thirst are fullness (up is good); the rest go up when they get worse.
  var FX_NAME = { hunger: 'Food', thirst: 'Drink', fatigue: 'Fatigue', stress: 'Stress', bladder: 'Bladder', bowels: 'Bowels' };
  function fxTags(fx, cost) {
    var out = [];
    if (cost) out.push('!−$' + cost);
    Object.keys(fx || {}).forEach(function (k) {
      var v = fx[k], n = k.split('.').pop(), name = FX_NAME[n];
      if (!v) return;
      if (k.indexOf('Wetness') >= 0) { if (v > 0) out.push('!Wet clothes'); return; }
      if (k.indexOf('Fame') >= 0) { if (v > 0) out.push('^Fame'); return; }
      if (!name) return;
      var good = (n === 'hunger' || n === 'thirst') ? v > 0 : v < 0;
      if (n === 'bladder' || n === 'bowels') { if (v >= 60) out.push('!+' + name); return; }
      out.push((good ? '^' : '!') + (v > 0 ? '+' : '−') + name);
    });
    return out;
  }
  function money() { return num(G.state, 'money'); }
  function afford(o, cost) { if (cost && money() < cost) { o.disabled = true; o.reason = 'Needs $' + cost; } return o; }
  function closedReason(id) {
    var wc = weatherClosure(id); if (wc) return 'Closed for the weather';
    var l = LOCATIONS[id]; if (!l || !l.open) return 'Closed';
    return 'Closed until ' + G.fmtH(l.open[0]);
  }

  /* ---------------- More random events (phase two) ---------------- */
  [
    { id: 'lost_dog', where: ['park', 'residential'], chance: 0.06,
      run: function () { G.change('stats.status.kindnessFame', 10); G.change('stats.needs.stress', -10);
        return { text: 'A scruffy terrier with a trailing lead trots up to you. The tag says Elm Row. You walk it home, and a relieved owner thanks you three times.', minutes: 15 }; } },
    { id: 'bus_splash', where: ['main_street'], chance: 0.1, when: function (s) { return ['rain', 'storm'].indexOf(s.world.weather) >= 0; },
      run: function () { G.change('stats.clothing.lowerWetness', 30); G.change('stats.needs.stress', 25);
        return { text: 'The number 7 bus hits the puddle by the kerb at full speed. Your legs take the worst of it.' }; } },
    { id: 'fire_alarm', where: ['dorm_hall', 'dorm_room'], chance: 0.03, when: function () { return G.time.hour >= 22 || G.time.hour < 3; },
      run: function () { G.change('stats.needs.fatigue', 60); G.change('stats.needs.stress', 40);
        return { text: 'The fire alarm shrieks. Twenty minutes later you are back inside, cold, in your socks, and someone\'s burnt toast has been blamed.', minutes: 20 }; } },
    { id: 'library_quiet', where: ['library'], chance: 0.08,
      run: function () { G.change('stats.needs.stress', -25);
        return { text: 'You find a carrel by the window on the top floor, sunlight falling across the desk. For a while nothing needs you.', minutes: 5 }; } },
    { id: 'pigeon', where: ['town_square', 'quad'], chance: 0.05,
      run: function () { G.change('stats.needs.stress', 15); G.change('stats.clothing.upperWetness', 5);
        return { text: 'A pigeon on the memorial takes aim and does not miss. A passer-by kindly hands you a tissue.' }; } },
    { id: 'wrong_order', where: ['cafe', 'cafeteria'], chance: 0.05,
      run: function () { G.change('stats.needs.thirst', 100);
        return { text: 'The barista calls a name close enough to yours, and by the time anyone notices, you have half-drunk a stranger\'s free hot chocolate.' }; } },
    { id: 'quiz_night', where: ['bar'], chance: 0.35, when: function () { return G.time.weekdayIndex === 3 && G.time.hour >= 19 && G.time.hour < 22; },
      run: function () { var win = Math.random() < 0.3; if (win) G.change('money', 10); G.change('stats.needs.stress', -20); G.change('stats.status.socialiteFame', 5);
        return { text: 'A team of regulars waves you over for the pub quiz. You know exactly one answer, the capital of Peru, and are briefly a hero.' + (win ? ' Your team wins the $10 bar tab, which they split with you.' : ''), minutes: 45 }; } },
    { id: 'bake_sale', where: ['church', 'town_square'], chance: 0.15, when: function () { return G.time.isWeekend && G.time.hour >= 10 && G.time.hour < 15; },
      run: function () { G.change('money', -2); G.change('stats.needs.hunger', 120); G.change('stats.status.kindnessFame', 3);
        return { text: 'A church bake sale is in full swing. You are talked into a $2 slice of Victoria sponge, which is honestly excellent.', minutes: 10 }; } },
    { id: 'gym_spotter', where: ['gym'], chance: 0.08,
      run: function () { G.change('stats.needs.stress', -10);
        return { text: 'A friendly regular offers to spot you and shares a few tips on form. You leave feeling a little less lost in here.', minutes: 5 }; } },
    { id: 'hen_escape', where: ['campus_farm'], chance: 0.06, when: function () { return G.time.hour >= 6 && G.time.hour < 19; },
      run: function () { G.change('stats.needs.fatigue', 20);
        return { text: 'A hen has found the gap in the fence again. You coax her back with a handful of grain and some very undignified clucking.', minutes: 8 }; } },
    { id: 'narrowboat', where: ['docks'], chance: 0.12, when: function () { return G.time.hour >= 8 && G.time.hour < 20; },
      run: function () { G.change('stats.needs.stress', -20);
        return { text: 'An old couple on a painted narrowboat offers you a cup of tea from their hatch while they wait for the lock. They have been travelling the canals for eleven years.', minutes: 15 }; } },
    { id: 'graffiti', where: ['alley', 'old_mill'], chance: 0.1,
      run: function () { aware(2);
        return { text: 'Fresh graffiti on the brickwork: a fox in a crown and the words <i>THE MILL REMEMBERS</i>. It wasn\'t there yesterday.' }; } },
    { id: 'mushrooms', where: ['woods'], chance: 0.1, when: function () { return season() === 'Autumn'; },
      run: function () { aware(2); G.change('stats.needs.stress', -10);
        return { text: 'A ring of pale mushrooms circles an old stump. You step around it, just in case.' }; } },
    { id: 'snowball', where: ['quad', 'park'], chance: 0.25, when: function (s) { return s.world.weather === 'snow'; },
      run: function () { G.change('stats.clothing.upperWetness', 15); G.change('stats.needs.stress', -40); G.change('stats.needs.fatigue', 40);
        return { text: 'A snowball catches you on the shoulder, and within a minute half the quad has joined in. You give as good as you get.', minutes: 15 }; } },
    { id: 'heat_queue', where: ['main_street', 'park', 'docks'], chance: 0.2, when: function (s) { return s.world.weather === 'hot'; },
      run: function () { G.change('stats.needs.thirst', -80); G.change('stats.needs.fatigue', 30);
        return { text: 'The heat is relentless. The queue for the ice-cream van stretches past the bus shelter, and the tarmac feels soft underfoot.' }; } },
    { id: 'wind_hat', where: ['*outdoor'], chance: 0.15, when: function (s) { return s.world.weather === 'windy'; },
      run: function () { G.change('stats.needs.fatigue', 15);
        return { text: 'A gust snatches someone\'s scarf and you chase it halfway down the street before pinning it under your shoe. The owner applauds.', minutes: 5 }; } },
    { id: 'fog_lost', where: ['park', 'woods', 'old_mill'], chance: 0.2, when: function (s) { return s.world.weather === 'fog'; },
      run: function () { G.change('stats.needs.stress', 30);
        return { text: 'The fog closes in so thickly that you take a wrong turn and spend ten uneasy minutes finding the path again.', minutes: 10 }; } },
    { id: 'thunder_power', where: ['library', 'lecture_hall', 'dorm_room', 'dorm_hall'], chance: 0.25, when: function (s) { return s.world.weather === 'storm'; },
      run: function () { G.change('stats.needs.stress', 20);
        return { text: 'A crack of thunder and the lights die. For a long minute, everyone sits in the dark listening to the rain, then the power stutters back.', minutes: 3 }; } },
    { id: 'florist_bloom', where: ['florist'], chance: 0.1, when: function () { return G.time.hour >= 9 && G.time.hour < 18; },
      run: function () { G.change('stats.needs.stress', -15);
        return { text: 'The florist hands you a single stem that was too short to sell. It smells of honey and rain.' }; } },
    { id: 'salon_gossip', where: ['hair_salon'], chance: 0.2,
      run: function () { G.change('stats.needs.stress', -10);
        return { text: 'Under the dryers, two regulars are trading the week\'s gossip at full volume: who is dating whom, and who parked badly outside the church.', minutes: 5 }; } },
    { id: 'salon_walkin', where: ['hair_salon'], chance: 0.12, when: function () { return G.time.isWeekend; },
      run: function () { G.change('stats.needs.stress', 10);
        return { text: 'Weekend rush: every chair is full and the waiting bench is three deep. A stylist calls over that there might be a gap in forty minutes, maybe.', minutes: 2 }; } },
    { id: 'stargazing', where: ['campus_farm', 'park', 'woods'], chance: 0.15, when: function (s) { return s.world.weather === 'clear' && isDark(G.time.hour) && (G.time.hour >= 21 || G.time.hour < 2); },
      run: function () { G.change('stats.needs.stress', -40);
        return { text: 'Away from the streetlamps, the sky is crowded with stars. You find the Plough, then lose it, then simply look.', minutes: 10 }; } }
  ].forEach(function (e) { EVENTS.push(e); });


  /* ---------------- Pet events (use G.pets from pets.js, Jimmy) ---------------- */
  function addPetEvents() {
    if (!G.pets || G._worldPetEvents) return;
    G._worldPetEvents = true;
    var P = G.pets;
    function out(sp) { return P.following().filter(function (p) { return !sp || p.species === sp; }); }
    function home(sp) { return P.list().filter(function (p) { return p.status === 'home' && !p.following && (!sp || p.species === sp); }); }
    function S(p) { return (P.pronouns(p) || { S: 'They' }).S; }
    function guard(e) { var r = e.run; e.run = function (st) { try { return r(st); } catch (x) { return null; } }; return e; }
    [
      { id: 'pet_puddle', where: ['*outdoor'], chance: 0.2, when: function (s) { return out('dog').length && ['rain', 'drizzle', 'storm'].indexOf(s.world.weather) >= 0; },
        run: function () { var p = pick(out('dog')); G.change('stats.clothing.lowerWetness', 20); P.addHappiness(p.id, 60);
          return { text: p.name + ' spots the deepest puddle on the street and jumps in with all four paws. You get most of it.' }; } },
      { id: 'pet_squirrel', where: ['park', 'quad', 'campus_farm', 'woods'], chance: 0.15, when: function () { return out('dog').length || out('ferret').length; },
        run: function () { var p = pick(out('dog').concat(out('ferret'))); G.change('stats.needs.fatigue', 20); P.addHappiness(p.id, 40);
          return { text: 'A squirrel makes the mistake of crossing in front of ' + p.name + '. You get towed twenty yards before it shoots up an oak, chattering rudely.', minutes: 3 }; } },
      { id: 'pet_playdate', where: ['park', 'residential', 'town_square'], chance: 0.1, when: function () { return out('dog').length; },
        run: function () { var p = pick(out('dog')); P.addHappiness(p.id, 80); P.addBond(p.id, 10); G.change('stats.needs.stress', -20); G.change('stats.status.socialiteFame', 2);
          return { text: 'Another dog walker stops, and ' + p.name + ' and a cheerful spaniel do three laps of each other in a tangle of leads. You end up chatting for ten minutes.', minutes: 10 }; } },
      { id: 'pet_parrot_cafe', where: ['cafe', 'market', 'main_street', 'town_square'], chance: 0.12, when: function () { return out('parrot').length; },
        run: function () { var p = pick(out('parrot')); P.addHappiness(p.id, 40); G.change('stats.needs.stress', -10);
          return { text: p.name + ' leans off your shoulder and announces "' + pick(['Hello, gorgeous!', 'Tea, please!', 'Bless you!', 'Mind the gap!']) + '" to a startled stranger. A small crowd gathers to hear it again.' }; } },
      { id: 'pet_window_birds', where: ['dorm_room'], chance: 0.12, when: function () { return home('cat').length && !isDark(G.time.hour); },
        run: function () { var p = pick(home('cat')); P.addHappiness(p.id, 30); G.change('stats.needs.stress', -10);
          return { text: p.name + ' is pressed against the window, tail lashing, chattering at the sparrows on the gutter. It is very serious business.' }; } },
      { id: 'pet_hamster_escape', where: ['dorm_room'], chance: 0.06, when: function () { return home('hamster').length; },
        run: function () { var p = pick(home('hamster')); G.change('stats.needs.stress', 30);
          return { text: 'The cage door is open and ' + p.name + ' is gone. Fifteen frantic minutes later you find ' + (P.pronouns(p) || { o: 'them' }).o + ' asleep in your sock drawer.', minutes: 15 }; } },
      { id: 'pet_rabbit_binky', where: ['dorm_room'], chance: 0.1, when: function () { return home('rabbit').length; },
        run: function () { var p = pick(home('rabbit')); P.addBond(p.id, 8); G.change('stats.needs.stress', -25);
          return { text: p.name + ' does a sudden twisting leap in the air, kicks out both back feet, and lands as if nothing happened. Rabbit joy, apparently.' }; } },
      { id: 'pet_festival_contest', where: ['*'], chance: 0.4, when: function () { var f = festivalLive(); return f && f.where === W().location && out().length; },
        run: function () { var p = pick(out()), win = Math.random() < 0.35; P.addHappiness(p.id, 60); if (win) G.change('money', 15); G.change('stats.status.socialiteFame', win ? 6 : 2);
          return { text: 'There is a "best-dressed pet" contest by the bandstand, and you enter ' + p.name + ' in a hastily tied ribbon. ' + (win ? S(p) + ' wins first prize and a $15 voucher!' : S(p) + ' gets a very kind honourable mention.'), minutes: 20 }; } }
    ].forEach(function (e) { EVENTS.push(guard(e)); });
  }


  /* ---------------- Phase three: forecast, buses, bikes, weekly market, crowds, moon, seasons ---------------- */
  var BUS_STOPS = ['college_road', 'main_street', 'town_square', 'high_street', 'residential', 'river_lane'];
  var OUTSKIRTS_STOPS = ['river_lane'];   // the 12 serves the industrial edge, 7:00 to 19:00 only
  var BUS_FARE = 2, BIKE_PRICE = 55;
  var BUS_RIDE = 6;
  function busWait() { return G.time.isWeekend ? 9 : 5; }
  function busRunning() { return G.time.hour >= 6 && G.time.hour < 23; }
  function busTo(dest) {
    return function () {
      var w = W(), wait = busWait(), ride = BUS_RIDE;
      if (num(G.state, 'money') < BUS_FARE) return { text: '<p>You pat your pockets at the bus stop. Not even $' + BUS_FARE + ' for the fare.</p>', minutes: 1 };
      G.change('money', -BUS_FARE);
      var from = w.location; w.busOpen = null;
      w.privacy = null; w.location = dest; w.visited[dest] = true;
      var a = onArrive(); if (G.emit) G.emit('arrive', { location: dest });
      var crowd = G.time.hour >= 8 && G.time.hour < 9 || G.time.hour >= 17 && G.time.hour < 18 ? ' It is rush hour, and you stand the whole way, wedged against a rucksack.' : ' You get a window seat and watch Hollowbrook slide past.';
      var line = OUTSKIRTS_STOPS.indexOf(dest) >= 0 || OUTSKIRTS_STOPS.indexOf(from) >= 0 ? '12' : '7';
      return { text: '<p>The number ' + line + ' bus arrives after ' + wait + ' minutes.' + crowd + ' ' + fmtT(wait + ride) + ', $' + BUS_FARE + '.</p>' + a.html, minutes: wait + ride + a.minutes };
    };
  }
  function outskirtsRunning() { return G.time.hour >= 7 && G.time.hour < 19 && W().weather !== 'storm' && W().weather !== 'snow'; }
  function busStopUsable() {
    var here = W().location;
    if (!busRunning() || (W().weather === 'snow' && G.time.hour >= 20)) return false;
    return !(OUTSKIRTS_STOPS.indexOf(here) >= 0 && !outskirtsRunning());
  }
  // The bus stop is a small menu: pick a street, or step away.
  function busOptions() {
    var here = W().location, hereOut = OUTSKIRTS_STOPS.indexOf(here) >= 0, out = [];
    if (busStopUsable()) BUS_STOPS.forEach(function (id) {
      if (id === here) return;
      var twelve = hereOut || OUTSKIRTS_STOPS.indexOf(id) >= 0;
      if (twelve && !outskirtsRunning()) return;
      out.push(afford({ label: (twelve ? 'Number 12 bus to ' : 'Bus to ') + LOCATIONS[id].name + ' ($' + BUS_FARE + ')', icon: '🚌', minutes: busWait() + BUS_RIDE, effects: ['!−$' + BUS_FARE], run: busTo(id), locationId: id }, BUS_FARE));
    });
    out.push({ label: 'Leave the bus stop', icon: '↩️', minutes: 0, run: function () { W().busOpen = null; return { text: '<p>You step away from the bus shelter.</p>' + locationBlurb(), minutes: 0 }; } });
    return out;
  }


  var MARKET_DAY = { where: 'town_square', weekdayIndex: 5, from: 8, to: 13, name: 'Saturday farmers\' market',
    desc: 'Striped awnings fill the square: local honey, muddy carrots, cheese wheels, and a man who sells only mushrooms.',
    acts: [
      { label: 'Buy a jar of local honey ($6)', cost: 6, text: 'Dark, floral heather honey from the hills. The beekeeper tells you to eat a spoonful for hay fever.', fx: { 'stats.needs.hunger': 60, 'stats.needs.stress': -20 }, minutes: 5 },
      { label: 'Buy a bag of crisp apples ($3)', cost: 3, text: 'You eat one on the spot. It snaps like it means it.', fx: { 'stats.needs.hunger': 150, 'stats.needs.thirst': 40 }, minutes: 5 },
      { label: 'Browse the stalls', text: 'You wander the stalls, try three cheeses, and pick up a leaflet for a pottery class. A pleasant hour.', fx: { 'stats.needs.stress': -40, 'stats.needs.hunger': 40 }, minutes: 40 } ] };
  function marketLive() { return G.time.weekdayIndex === MARKET_DAY.weekdayIndex && G.time.hour >= MARKET_DAY.from && G.time.hour < MARKET_DAY.to; }

  function crowdLine(id) {
    var h = G.time.hour, wk = G.time.isWeekend, l = LOCATIONS[id];
    if (l.open && !isOpen(id)) return '';
    var busy = { cafeteria: h >= 12 && h < 14 || h >= 18 && h < 19, cafe: wk ? h >= 10 && h < 14 : h >= 8 && h < 9, bar: h >= 19 && (G.time.weekdayIndex >= 3),
      library: !wk && h >= 13 && h < 18, quad: !wk && h >= 8 && h < 17, main_street: h >= 11 && h < 16, shopping_centre: wk && h >= 11 && h < 17,
      gym: h >= 17 && h < 20, park: wk && h >= 10 && h < 17, lecture_hall: !wk && h >= 9 && h < 15 }[id];
    var dead = h >= 1 && h < 6 || (wk && (id === 'lecture_hall' || id === 'quad')) || (!wk && id === 'park' && h >= 9 && h < 16);
    return busy ? 'It is busy here right now.' : dead ? 'It is almost deserted.' : '';
  }

  var MOON = ['a new moon, barely there', 'a thin waxing crescent', 'a half moon', 'a fat waxing gibbous moon', 'a full moon, bright enough to cast shadows', 'a waning gibbous moon', 'a half moon, waning', 'a thin waning crescent'];
  function moonLine() { return 'Overhead hangs ' + MOON[Math.floor(((W().day - 1) % 28) / 3.5)] + '.'; }
  function moonFull() { return Math.floor(((W().day - 1) % 28) / 3.5) === 4; }

  var SEASON_TOUCH = {
    Autumn: ['Fallen leaves gather in drifts against the kerbs.', 'Woodsmoke hangs faintly in the air.', 'Conkers lie split open on the path.'],
    Winter: ['Your breath clouds in the cold.', 'Frost silvers the edges of everything.', 'Someone has strung fairy lights in a bare tree.'],
    Spring: ['Daffodils crowd the verges.', 'Blossom drifts down like confetti.', 'Birdsong is everywhere, loud and insistent.'],
    Summer: ['Bees drone lazily in the flowerbeds.', 'The long evening light turns everything gold.', 'Someone nearby is mowing a lawn.']
  };
  function seasonTouch() { var a = SEASON_TOUCH[season()]; return a[(W().day + (G.time.hour >> 2)) % a.length]; }

  function forecastLine() {
    var f = W().forecast; if (!f) return 'The forecast is a mystery.';
    return 'Tomorrow\'s forecast: ' + WEATHER[f].label.toLowerCase() + '. ' + ({ clear: 'A good day to be outside.', cloudy: 'Nothing exciting.', drizzle: 'Maybe take a jacket.', rain: 'Bring an umbrella.', storm: 'Stay in if you can.', fog: 'Visibility will be poor in the morning.', snow: 'Wrap up warm.', hot: 'Drink plenty of water.', windy: 'Hold on to your hat.' }[f] || '');
  }
  function rollForecast() {
    var weights = SEASON_WEIGHTS[season()].slice(), k = KEYS[pickWeighted(weights)];
    if (k === 'hot' && season() !== 'Summer' && season() !== 'Spring') k = 'clear';
    W().forecast = k;
  }

  [
    { id: 'church_bells', where: ['town_square', 'main_street', 'church', 'park', 'residential'], chance: 0.5, when: function () { return G.time.weekdayIndex === 6 && G.time.hour >= 9 && G.time.hour < 11; },
      run: function () { G.change('stats.needs.stress', -15); return { text: 'The bells of St. Aldric\'s ring out across town, rolling and tumbling over the rooftops. Sunday has arrived.' }; } },
    { id: 'full_moon', where: ['*outdoor'], chance: 0.3, when: function () { return moonFull() && isDark(G.time.hour); },
      run: function () { aware(2); return { text: 'The full moon is so bright that the streetlamps seem pointless. A dog somewhere starts howling, and another answers.' }; } },
    { id: 'bus_late', where: BUS_STOPS, chance: 0.08, when: function () { return busRunning(); },
      run: function () { G.change('stats.needs.stress', 15); return { text: 'The timetable at the stop says the 7 is due. The display says the 7 is due. The 7 is not due. A pensioner beside you sighs the sigh of decades.' }; } },
    { id: 'bike_puncture', where: ['*outdoor'], chance: 0.03, when: function (s) { return s.world.bike && !s.world.bikeFlat; },
      run: function (s) { s.world.bikeFlat = true; G.change('stats.needs.stress', 25);
        return { text: 'A sharp hiss from your back tyre. Flat. You\'ll be walking until you get it fixed at the shopping centre.' }; } }
  ].forEach(function (e) { EVENTS.push(e); });


  /* ---------------- Phase three: 20 more random events ---------------- */
  [
    { id: 'lecture_overrun', where: ['lecture_hall'], chance: 0.1, when: function () { return !G.time.isWeekend && G.time.hour >= 9 && G.time.hour < 17; },
      run: function () { G.change('stats.needs.fatigue', 20); return { text: 'Through an open door, a professor is overrunning badly, and a hundred students are packing up loudly in protest.' }; } },
    { id: 'vending_double', where: ['dorm_hall', 'lecture_hall', 'gym'], chance: 0.05,
      run: function () { G.change('stats.needs.hunger', 80); return { text: 'The vending machine clunks and drops two chocolate bars instead of one. You look around guiltily and keep both.' }; } },
    { id: 'lost_student', where: ['quad', 'main_street'], chance: 0.06, when: function () { return G.time.dayOfSeason <= 7; },
      run: function () { G.change('stats.status.kindnessFame', 4); return { text: 'A nervous first-year with a crumpled map asks where Calloway is. You walk them halfway there and point.', minutes: 5 }; } },
    { id: 'library_fine', where: ['library'], chance: 0.04,
      run: function () { G.change('money', -2); return { text: 'The librarian reminds you, kindly but firmly, about an overdue book. You pay the $2 fine.' }; } },
    { id: 'dorm_party', where: ['dorm_hall', 'dorm_room'], chance: 0.15, when: function () { return (G.time.weekdayIndex === 4 || G.time.weekdayIndex === 5) && G.time.hour >= 21; },
      run: function () { G.change('stats.needs.stress', 15); G.change('stats.needs.fatigue', 20); return { text: 'Someone down the hall is having a party. The bass comes up through the floor, and a stranger knocks to ask if you have any ice.' }; } },
    { id: 'laundry_lost', where: ['dorm_hall'], chance: 0.05,
      run: function () { G.change('stats.needs.stress', 20); return { text: 'The laundry room has eaten another sock. There is a growing pile of lonely socks on the shelf, and none of them are yours.' }; } },
    { id: 'farm_lamb', where: ['campus_farm'], chance: 0.25, when: function () { return season() === 'Spring'; },
      run: function () { G.change('stats.needs.stress', -40); return { text: 'The farm has new arrivals: two wobbly lambs, bleating and bouncing straight up in the air for no reason at all.', minutes: 10 }; } },
    { id: 'harvest_help', where: ['campus_farm'], chance: 0.15, when: function () { return season() === 'Autumn'; },
      run: function () { G.change('stats.needs.fatigue', carryFat(50)); G.change('money', 5); return { text: 'The farm manager waves you over to help carry pumpkins into the barn and presses $5 into your hand afterwards.', minutes: 30 }; } },
    { id: 'charity_collector', where: ['main_street', 'shopping_centre'], chance: 0.08,
      run: function () { G.change('money', -1); G.change('stats.status.kindnessFame', 3); return { text: 'A volunteer with a rattling tin smiles hopefully. You drop in a dollar and get a paper flower for your lapel.' }; } },
    { id: 'roadworks', where: ['main_street', 'residential'], chance: 0.06,
      run: function () { G.change('stats.needs.stress', 10); return { text: 'Roadworks have closed half the pavement, and a man with a stop-go sign is having a very long day.' }; } },
    { id: 'garden_sale', where: ['residential'], chance: 0.12, when: function () { return G.time.isWeekend && G.time.hour >= 9 && G.time.hour < 15; },
      run: function () { G.change('stats.needs.stress', -10); return { text: 'A garden sale on Elm Row: tables of old records, chipped teacups, and a box of paperbacks marked "free to a good home".', minutes: 10 }; } },
    { id: 'pub_singer', where: ['bar'], chance: 0.15, when: function () { return G.time.hour >= 20; },
      run: function () { G.change('stats.needs.stress', -25); return { text: 'An old man in the corner starts singing a folk song nobody under sixty knows. By the last verse the whole pub has joined the chorus.', minutes: 5 }; } },
    { id: 'heron', where: ['park', 'docks'], chance: 0.1, when: function () { return !isDark(G.time.hour); },
      run: function () { aware(2); G.change('stats.needs.stress', -10); return { text: 'A grey heron stands motionless in the shallows, then strikes so fast you nearly miss it.' }; } },
    { id: 'mill_campfire', where: ['old_mill'], chance: 0.2, when: function () { return isDark(G.time.hour) && W().weather !== 'storm'; },
      run: function () { G.change('stats.needs.stress', -20); return { text: 'A few drifters sit around a small fire in the mill\'s shell. Someone shuffles along to make room and passes you a tin mug of tea without a word.', minutes: 15 }; } },
    { id: 'deer', where: ['woods'], chance: 0.12, when: function () { return G.time.hour >= 5 && G.time.hour < 9 || G.time.hour >= 17 && G.time.hour < 20; },
      run: function () { aware(3); G.change('stats.needs.stress', -25); return { text: 'A roe deer freezes on the path ahead, ears swivelling. For a long moment you both stay perfectly still. Then it is gone.' }; } },
    { id: 'shop_sale', where: ['shopping_centre', 'clothing_store', 'furniture_store'], chance: 0.1,
      run: function () { return { text: 'Red SALE signs have gone up overnight, and a shop assistant is valiantly pretending the "70% off" is not on one single scarf.' }; } },
    { id: 'phone_dies', where: ['*'], chance: 0.02,
      run: function () { G.change('stats.needs.stress', 15); return { text: 'Your phone buzzes once and dies. You forgot to charge it again.' }; } },
    { id: 'icy_path', where: ['*outdoor'], chance: 0.12, when: function () { return season() === 'Winter' && W().temp <= 1; },
      run: function () { G.change('stats.needs.stress', 15); G.change('stats.clothing.lowerWetness', 10); return { text: 'Your foot skates out on a patch of black ice. You land on your backside in the slush, with as much dignity as possible.' }; } },
    { id: 'hay_fever', where: ['*outdoor'], chance: 0.08, when: function () { return (season() === 'Spring' || season() === 'Summer') && W().weather === 'clear'; },
      run: function () { G.change('stats.needs.stress', 10); return { text: 'The pollen count must be sky-high. You sneeze five times in a row, and a passer-by says "bless you" on every one.' }; } },
    { id: 'kind_note', where: ['dorm_room'], chance: 0.04,
      run: function () { G.change('stats.needs.stress', -30); return { text: 'Someone has slipped a note under your door: "Hope your week gets better. — a neighbour". No name.' }; } }
  ].forEach(function (e) { EVENTS.push(e); });

  /* ---------------- Helpers ---------------- */
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function num(s, path) { var o = s; path.split('.').forEach(function (k) { o = o == null ? undefined : o[k]; }); return typeof o === 'number' ? o : 0; }
  function aware(n) { if (G.stats && G.stats.train) G.stats.train('awareness', n); else G.change('stats.core.awareness.value', n); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function wetClothes(n) { if (!n) return; G.change('stats.clothing.upperWetness', n); G.change('stats.clothing.lowerWetness', Math.round(n * 0.7)); }

  function W() { return G.state.world; }
  function loc(id) { return LOCATIONS[id || W().location]; }
  // Bad weather shuts some places regardless of their hours.
  var WEATHER_CLOSED = {
    storm: { campus_farm: 'The farm is shut for the storm; the animals are in their sheds.', florist: 'The florist has pulled everything inside and locked up until the storm passes.',
             docks: 'The jetties are roped off with a sign: closed in high winds.', old_mill: 'Rain pours through the broken roof; there is nowhere dry to be.' },
    snow:  { campus_farm: 'The farm gate is padlocked: snow day.', florist: 'A handwritten sign: "Closed, snowed in. Back tomorrow!"', gym: 'The fieldhouse heating has failed; it is closed for the day.' },
    hot:   { library: null },
    fog:   {}
  };
  function weatherClosure(id) { var wx = W && G.state && G.state.world && G.state.world.weather, m = wx && WEATHER_CLOSED[wx]; return (m && m[id]) || null; }
  function isOpen(id, hour) {
    if (hour == null && weatherClosure(id)) return false;
    var o = LOCATIONS[id].open; if (!o) return true;
    var h = hour == null ? G.time.hour : hour; return h >= o[0] && h < o[1];
  }
  function partOfDay(h) {
    return h < 5 ? 'night' : h < 9 ? 'early morning' : h < 12 ? 'morning' : h < 14 ? 'midday' : h < 18 ? 'afternoon' : h < 21 ? 'evening' : 'night';
  }
  function isDark(h) { var s = season(); var dusk = s === 'Winter' ? 17 : s === 'Summer' ? 21 : 19; var dawn = s === 'Winter' ? 8 : s === 'Summer' ? 5 : 7; return h >= dusk || h < dawn; }
  function season() { return SEASONS[Math.floor((W().day - 1) / DAYS_PER_SEASON) % 4]; }

  function syncTime() {
    var w = W(), total = w.minutes;
    var day = Math.floor(total / 1440) + 1, rem = total % 1440;
    w.day = day;
    G.time.day = day;
    G.time.hour = Math.floor(rem / 60);
    G.time.minute = rem % 60;
    G.time.weekday = WEEKDAYS[(day - 1) % 7];
    G.time.weekdayIndex = (day - 1) % 7;          // 0 = Monday
    G.time.isWeekend = G.time.weekdayIndex >= 5;
    G.time.season = season();
    G.time.dayOfSeason = ((day - 1) % DAYS_PER_SEASON) + 1;
    G.time.total = total;
    G.time.clock = pad(G.time.hour) + ':' + pad(G.time.minute);
  }

  function rollWeather(force) {
    var w = W();
    w.prevWeather = w.weather;
    var weights = SEASON_WEIGHTS[season()].slice();
    if (!force && w.weather) { var i = KEYS.indexOf(w.weather); if (i >= 0) weights[i] += 30; } // weather tends to persist
    w.weather = KEYS[pickWeighted(weights)];
    if (w.weather === 'hot' && season() !== 'Summer' && season() !== 'Spring') w.weather = 'clear';
    w.temp = baseTemp();
  }
  function baseTemp() {
    var s = { Autumn: 12, Winter: 2, Spring: 13, Summer: 23 }[season()];
    var mod = { clear: 2, cloudy: 0, drizzle: -1, rain: -2, storm: -3, fog: -1, snow: -4, hot: 9, windy: -2 }[W().weather] || 0;
    return s + mod + Math.round(Math.random() * 4 - 2);
  }

  function weatherLine() {
    var wx = WEATHER[W().weather];
    return wx.text + ' (' + wx.label + ', ' + fmtTemp(W().temp) + ')';
  }



  // Small things you pass on the way. Shown now and then on walks or rides along the streets.
  var STREET_MOMENTS = {
    any: ['A delivery van double-parks and puts its hazards on.', 'Two neighbours have stopped mid-pavement to chat, and you step around them.', 'A cat crosses in front of you, then sits down to wash, as if it had planned to all along.',
      'Somebody\'s phone rings with an old ringtone, and three people check their pockets.', 'A poster for a lost tortoise is taped to a lamp post. "Answers to Gerald."', 'You catch your reflection in a shop window and fix your hair.'],
    morning: ['A milk float hums past, bottles clinking.', 'A parent jogs by pushing a buggy, coffee in the other hand.'],
    day: ['A group of schoolkids in hi-vis vests crocodiles past behind a teacher.', 'A window cleaner whistles from the top of his ladder.'],
    evening: ['The smell of chips drifts from somewhere, and suddenly you\'re thinking about chips.', 'A couple walks ahead of you, swinging their joined hands.'],
    night: ['Your footsteps sound louder than they should on the empty pavement.', 'A taxi slows hopefully beside you, then pulls away.'],
    rain: ['A bus sends a wave of puddle water over the kerb, just missing you.', 'People hurry past under umbrellas, eyes down.'],
    snow: ['Kids are pelting each other with snowballs by the bus shelter.', 'The pavement crunches underfoot, and you walk like everyone else, carefully.'],
    hot: ['Tar has gone soft in the gutters, and an ice-cream van jingles somewhere nearby.'],
    windy: ['A paper bag tumbles along the street ahead of you like it has somewhere to be.'],
    fog: ['Shapes of people loom out of the fog and fade again.'],
    bike: ['You freewheel down the slope, wind in your face.', 'A driver waves you through at the junction.']
  };
  function streetMoment(biking) {
    if (Math.random() > 0.35) return '';
    var w = W(), h = G.time.hour, pool = STREET_MOMENTS.any.slice(), wx = w.weather;
    var tod = isDark(h) ? 'night' : h < 12 ? 'morning' : h < 18 ? 'day' : 'evening';
    pool = pool.concat(STREET_MOMENTS[tod] || []);
    if (wx === 'rain' || wx === 'storm' || wx === 'drizzle') pool = pool.concat(STREET_MOMENTS.rain, STREET_MOMENTS.rain);
    else if (STREET_MOMENTS[wx]) pool = pool.concat(STREET_MOMENTS[wx], STREET_MOMENTS[wx]);
    if (biking) pool = pool.concat(STREET_MOMENTS.bike);
    var line = pick(pool); if (line === w.lastMoment) line = pick(pool); w.lastMoment = line;
    return line;
  }

  /* ---------------- Ambient flavour: one small line per visit ---------------- */
  // Keys: any, morning (before 12), day (12-18), evening (18-22), night (dark), and season names.
  var AMBIENT = {
    dorm_room: { any: ['Your roommate\'s side of the room is, as ever, a mystery of cables and laundry.', 'The radiator ticks as it warms up.', 'A sticky note on your mirror says "DRINK WATER" in your own handwriting.', 'Someone\'s music thumps faintly through the wall, all bass and no tune.'],
      morning: ['Pale light comes through the gap in the curtains you never quite close.'], night: ['The corridor light makes a thin yellow line under the door.'], Winter: ['Frost has drawn ferns on the inside of the window again.'] },
    dorm_hall: { any: ['A flyer for a lost hoodie has been taped over a flyer for a lost cat.', 'The vending machine hums and swallows somebody\'s coin with a clunk.', 'Two people argue cheerfully about whose turn it is to clean the microwave.', 'The bathroom door swings shut on its own, as it always does.'],
      morning: ['A queue has formed outside the showers, towels over shoulders, nobody talking.'], night: ['Someone is whispering on the phone at the far end of the hall.'] },
    quad: { any: ['A frisbee sails past and someone yells "sorry!" without meaning it.', 'A tour group shuffles after a guide walking backwards.', 'Pigeons work the benches outside the dining commons with professional focus.', 'The clock on Calloway\'s tower is four minutes fast. Everyone knows.'],
      morning: ['Students cut diagonally across the grass with coffee cups, late for something.'], evening: ['The lamp posts come on one by one along the paths.'],
      Spring: ['The cherry trees by the library are just starting to blossom.'], Summer: ['Someone has set up a hammock between two oaks and is fast asleep in it.'], Autumn: ['Leaves gather in drifts against the steps of the main building.'], Winter: ['Somebody has built a lopsided snowman wearing a college scarf.'] },
    main_building: { any: ['The entrance hall smells of floor polish and old radiators.', 'A noticeboard announces a careers fair, a lost umbrella and a choir audition.', 'The porter nods at you from behind the front desk without looking up from his crossword.'], night: ['Your footsteps echo down the half-lit corridor.'] },
    lecture_hall: { any: ['Rows of fold-down seats, half of them with a sticky hinge.', 'Someone has drawn a small cartoon frog on the whiteboard. Nobody has wiped it off.', 'The projector fan whirs even when nothing is on.'] },
    deans_office: { any: ['The secretary types very fast and very loudly.', 'A bowl of wrapped mints sits on the counter, untouched by anyone brave enough.', 'Framed photos of past deans watch you from the wall, all equally stern.'] },
    library: { any: ['A cart of returns waits by the desk, a paperback balanced on top.', 'Somebody\'s laptop fan whines in the silent study area.', 'The librarian\'s pencil scratches as she ticks off a list.', 'A study group whispers loudly enough that they might as well be talking.'], night: ['The top floor is nearly empty; a single desk lamp glows in the corner.'], Winter: ['The radiators under the windows are crowded with damp gloves.'] },
    cafeteria: { any: ['Trays clatter onto the stack by the bins.', 'Today\'s board promises "Chef\'s Special". It doesn\'t say what it is.', 'The coffee urn gurgles like it\'s about to give up.', 'Someone is building a tower of empty yoghurt pots for reasons of their own.'], morning: ['The toast conveyor is running and the smell of slightly burnt bread fills the room.'], day: ['The lunch rush roars: chairs scraping, trays clattering, a dozen conversations.'] },
    gym: { any: ['A treadmill thumps rhythmically in the corner.', 'The changing rooms smell of deodorant and chlorine from the pool next door.', 'Somebody drops a weight and the whole floor jumps.', 'A laminated sign asks you to wipe down the equipment. Nobody has.'] },
    campus_farm: { any: ['The goats watch you with deep suspicion.', 'Hens potter about the yard, complaining softly.', 'A wheelbarrow of compost steams gently.'], morning: ['The cockerel is still making his opinions known.'], Spring: ['Rows of seedlings poke up in neat lines, each with a handwritten label.'], Summer: ['Bees drone over the flowering beans.'], Autumn: ['Pumpkins sit fat and orange in the far field.'], Winter: ['The animals huddle in their shed, breath steaming.'] },
    college_road: { any: ['A cyclist rings their bell at a student walking in the bike lane.', 'Bus timetables flap behind their plastic covers.', 'The takeaway on the corner already has its "OPEN" sign flickering.'], morning: ['A stream of students heads up toward the campus gates.'], night: ['A fox trots along the pavement, unbothered by you.'] },
    main_street: { any: ['A shopkeeper sweeps the pavement outside their door.', 'A dog tied up outside the café watches the door with total devotion.', 'Somebody is trying to parallel park and it isn\'t going well.', 'The bakery\'s extractor fan breathes warm, buttery air onto the street.'], morning: ['Shutters rattle up one by one along the street.'], evening: ['Window displays glow against the dimming street.'], Winter: ['Fairy lights are strung across the street between the lamp posts.'] },
    town_square: { any: ['Pigeons wheel around the war memorial.', 'The town hall clock strikes the quarter hour, slightly off-key.', 'An old man feeds the birds from a paper bag, chatting to them.', 'A busker tunes a guitar and never quite starts playing.'], Summer: ['Children splash in the little fountain while parents pretend not to see.'], Autumn: ['Bunting from the last festival still hangs from one lamp post.'] },
    high_street: { any: ['Shoppers weave around each other with bulging bags.', 'A charity collector rattles a tin with hopeful eyes.', 'The phone shop has a "SALE" sign that has been up for a year.'], evening: ['The shopping centre\'s sliding doors breathe open and shut as the last shoppers leave.'] },
    residential: { any: ['A cat watches you from a windowsill, tail twitching.', 'Somewhere a lawnmower drones.', 'Recycling boxes line the kerb like a little parade.', 'A kid\'s bike lies abandoned on a front lawn.'], evening: ['Kitchen windows glow, and you can smell somebody\'s dinner.'], night: ['Televisions flicker blue behind closed curtains.'], Winter: ['Smoke curls up from a few chimneys.'] },
    river_lane: { any: ['The river slides by, brown and patient.', 'A heron stands in the shallows like it\'s been there for a hundred years.', 'The lane\'s potholes are full of last week\'s rain.'], morning: ['Mist lifts off the water in slow curls.'], Autumn: ['Blackberry brambles along the hedge are heavy with fruit.'] },
    alley: { any: ['A drainpipe drips steadily into a puddle.', 'Bins line the wall, one of them with a lid propped open by a cardboard box.', 'Someone has chalked a hopscotch grid on the cobbles.', 'The smell of frying drifts from a kitchen vent.'], night: ['A single bulb over a back door buzzes and flickers.'] },
    cafe: { any: ['The espresso machine hisses like a steam train.', 'A regular is doing the crossword in pen, frowning.', 'The cake stand has one slice left of something with walnuts.', 'Mugs clink, a chair scrapes, and somebody laughs too loud and then apologises.'], morning: ['There\'s a queue of half-awake people staring at the menu board.'] },
    market: { any: ['A trolley with a squeaky wheel announces itself somewhere in the aisles.', 'The tannoy crackles with a price check on aisle three.', 'Somebody is reading every label on every tin of soup.'], evening: ['The yellow-sticker trolley is out, and a small crowd circles it.'] },
    florist: { any: ['The whole shop smells green and sweet.', 'Buckets of cut stems line the floor, dripping.', 'A ribbon spool spins as the florist ties off a bouquet.'], Spring: ['Tulips crowd every bucket in every colour.'], Winter: ['Holly wreaths hang in the window.'] },
    park: { any: ['Ducks paddle hopefully toward anyone holding a paper bag.', 'A jogger passes, then passes again ten minutes later.', 'Somebody\'s dog is very proud of a stick far too big for it.', 'Teenagers on the swings pretend they\'re too old for the swings.'], Spring: ['Daffodils line the path in loud yellow clumps.'], Summer: ['Picnic blankets dot the grass.'], Autumn: ['Conkers lie split open under the horse chestnut.'], Winter: ['The pond has a thin skin of ice at the edges.'] },
    bar: { any: ['The jukebox plays something from before you were born.', 'A dartboard thuds, followed by a groan.', 'The landlord polishes the same glass for a long time.', 'A quiz sheet from last Thursday is still pinned by the door.'], evening: ['It\'s getting busy: the hum of voices rises above the music.'] },
    town_hall: { any: ['A queue of people with forms waits in silence.', 'Portraits of past mayors line the stairwell.', 'The noticeboard lists planning applications nobody reads.'] },
    church: { any: ['Light comes through the stained glass in coloured patches on the floor.', 'The building is cool and quiet and smells of old stone.', 'A volunteer arranges flowers by the font.'], morning: ['The bells ring out the hour.'] },
    docks: { any: ['Ropes creak against their bollards.', 'Gulls argue over something on a stack of pallets.', 'Diesel and river water mix in the air.'], morning: ['A barge chugs past, its skipper raising a hand.'] },
    old_mill: { any: ['The waterwheel is still, furred with moss.', 'Wind whistles through the broken upper windows.', 'Swallows dart in and out of the rafters.'] },
    woods: { any: ['A woodpecker drums somewhere out of sight.', 'Your footsteps go quiet on the soft path.', 'Sunlight breaks through the canopy in patches.'], Spring: ['Bluebells carpet the ground under the trees.'], Autumn: ['The path is ankle-deep in crunching leaves.'], Winter: ['The bare branches creak in the cold.'], night: ['An owl calls, and something small rustles away in the undergrowth.'] },
    shopping_centre: { any: ['Piped music plays a soft version of a song you used to like.', 'A child presses their face against the toy shop window.', 'The escalator hums, carrying a family slowly upward.', 'The food court smells of fried things and cinnamon.'] },
    clothing_store: { any: ['A shop assistant refolds a stack of jumpers someone just unfolded.', 'The changing room curtain doesn\'t quite reach the wall.'] },
    furniture_store: { any: ['Somebody is sitting on every sofa in turn, very seriously.', 'Little price tags dangle from lamps you can\'t afford.'] },
    pet_store: { any: ['A budgie chatters at its own reflection.', 'The fish tanks bubble softly in their blue light.', 'A puppy in the window pen falls asleep mid-wag.'] },
    hair_salon: { any: ['Hairdryers roar, then stop all at once.', 'The radio plays, and the stylists sing along to the chorus.', 'Someone in the chair holds very still while their fringe is trimmed.'] },
    vet_clinic: { any: ['A cat yowls from inside a carrier, deeply offended.', 'The receptionist knows every pet\'s name and none of the owners\'.', 'A poster on the wall shows the life stages of a tapeworm. Nobody looks at it twice.'] },
    dog_pound: { any: ['A chorus of barks greets you, every one of them hopeful.', 'A volunteer walks a greyhound around the yard on a long lead.', 'A board by the gate shows photos of dogs that found homes.'] }
  };
  var INDOOR_WX = { clear: 'Sunlight slants through the windows.', cloudy: 'Through the windows the sky is flat and grey.', drizzle: 'Fine drizzle beads the windows.', rain: 'Rain streams down the windows.',
    storm: 'Thunder rattles the windows, and the lights flicker once.', fog: 'Fog presses white against the windows.', snow: 'Snow drifts past the windows.', hot: 'The air is stuffy and warm, and every window is propped open.', windy: 'The wind whistles at the window frames.' };
  function ambientLine(id) {
    var a = AMBIENT[id]; if (!a) return '';
    var h = G.time.hour, pool = (a.any || []).slice();
    var tod = isDark(h) ? 'night' : h < 12 ? 'morning' : h < 18 ? 'day' : 'evening';
    if (a[tod]) pool = pool.concat(a[tod], a[tod]);   // time-of-day and season lines turn up more often
    if (a[season()]) pool = pool.concat(a[season()], a[season()]);
    if (!pool.length) return '';
    var w = W(), line = pick(pool);
    if (pool.length > 1 && line === w.lastAmbient) line = pick(pool);
    w.lastAmbient = line;
    return line;
  }

  function locationBlurb() {
    var l = loc(), h = G.time.hour, night = isDark(h) && NIGHT[l.id];
    var out = '<p><b>' + l.name + '</b> · ' + l.district + '</p><p>' + (night ? NIGHT[l.id] : l.desc) + '</p>';
    var f = festivalLive(); if (f && f.where === l.id) out += '<p><b>' + f.name + ':</b> ' + f.desc + '</p>';
    else if (f) out += '<p><i>You can hear the ' + f.name + ' going on over at ' + LOCATIONS[f.where].name + '.</i></p>';
    if (l.id === MARKET_DAY.where && marketLive()) out += '<p><b>' + MARKET_DAY.name + ':</b> ' + MARKET_DAY.desc + '</p>';
    var amb = ambientLine(l.id); if (amb) out += '<p>' + amb + '</p>';
    var cr = crowdLine(l.id); if (cr) out += '<p><i>' + cr + '</i></p>';
    if (!l.indoor) out += '<p>' + weatherLine() + ' ' + (isDark(h) ? (['clear', 'windy', 'hot'].indexOf(W().weather) >= 0 ? moonLine() : 'It is dark out; the streetlamps buzz.') : seasonTouch()) + '</p>';
    else out += '<p>' + (INDOOR_WX[W().weather] || ('Outside the window: ' + WEATHER[W().weather].label.toLowerCase() + '.')) + '</p>';
    return out;
  }

  function tryEvent(trigger) {
    var w = W(), here = w.location, l = loc();
    var pool = EVENTS.filter(function (e) {
      var ok = e.where.some(function (x) { return x === '*' || x === here || x === l.district || (x === '*outdoor' && !l.indoor) ||
        (x === 'main_street' && l.street) || (x === 'residential' && l.district === 'Residential' && (l.street || l.alleyway)) || (x === 'alley' && l.alleyway); });
      if (!ok) return false;
      if (e.when && !e.when(G.state)) return false;
      var last = w.eventsSeen[e.id]; if (last != null && w.minutes - last < 1440) return false; // once per day max
      return true;
    });
    var mult = trigger === 'arrive' ? 1 : 0.35;
    for (var i = 0; i < pool.length; i++) {
      if (Math.random() < pool[i].chance * mult) { var r = pool[i].run(G.state); if (r && r.text) { w.eventsSeen[pool[i].id] = w.minutes; return r; } }
    }
    return null;
  }

  /* ---------------- Travel ---------------- */
  function travelTo(dest) {
    return function (state) {
      var w = W(), from = w.location, mins = ADJ[from][dest];
      var wx = WEATHER[w.weather], dl = LOCATIONS[dest];
      var biking = w.bike && !w.bikeFlat && mins >= 4 && w.weather !== 'storm' && w.weather !== 'snow' && (!LOCATIONS[from].indoor || !dl.indoor);
      if (w.weather === 'storm' || w.weather === 'snow') mins = Math.ceil(mins * 1.4);
      if (biking) mins = Math.max(2, Math.ceil(mins * 0.5));
      var fat = Math.round(mins * (1.5 + wx.fatigue * 0.5) * (biking ? 0.8 : 1));
      if (fat) G.change('stats.needs.fatigue', fat);
      // Exposure only if either end is outdoors
      if (!LOCATIONS[from].indoor || !dl.indoor) {
        var wet = Math.round(wx.wet * Math.min(1, mins / 6));
        if (w.umbrella) wet = Math.round(wet * 0.3);
        wetClothes(wet);
        if (wx.stress) G.change('stats.needs.stress', wx.stress * Math.ceil(mins / 5));
        if (wx.thirst) G.change('stats.needs.thirst', -wx.thirst * Math.ceil(mins / 5));
      }
      w.location = dest;
      w.visited[dest] = true;
      var text = '<p>' + (biking ? 'You cycle to ' : 'You head to ') + dl.name + '. ' + fmtT(mins) + '</p>';
      var sm = (mins >= 3 && (isRoad(dest) || isRoad(w.location) || dest === 'park')) ? streetMoment(biking) : ''; if (sm) text += '<p>' + sm + '</p>';
      var wc = weatherClosure(dest);
      if (wc) text += '<p><i>' + wc + '</i></p>';
      else if (!isOpen(dest, G.time.hour)) text += '<p><i>It is closed right now. Opening hours are ' + dl.open[0] + ':00 to ' + (dl.open[1] % 24) + ':00.</i></p>';
      var after = { text: text, minutes: mins, after: true };
      return after;
    };
  }

  G.fmtH = G.fmtH || function (h) { if (G.fmtClock) return G.fmtClock(h, 0); return h + ':00'; };
  function fmtT(m) { return '(' + Math.floor(m / 60) + ':' + pad(m % 60) + ')'; }
  function isRoad(id) { var l = LOCATIONS[id]; return !!(l && (l.street || l.alleyway)); }
  function travelOptions() {
    var here = W().location, w = W(), roadHere = isRoad(here), goTo = [], travel = [];
    Object.keys(ADJ[here] || {}).forEach(function (id) {
      var l = LOCATIONS[id]; if (!l) return;
      var closed = weatherClosure(id) ? ' (closed: weather)' : !isOpen(id) ? ' (closed)' : '';
      var m = ADJ[here][id];
      if (w.weather === 'storm' || w.weather === 'snow') m = Math.ceil(m * 1.4);
      if (w.bike && !w.bikeFlat && m >= 4 && w.weather !== 'storm' && w.weather !== 'snow' && (!LOCATIONS[here].indoor || !l.indoor)) m = Math.max(2, Math.ceil(m * 0.5));
      var special = LINK_LABEL[here + '>' + id], road = isRoad(id) || id === 'park';
      var label = special || (road ? 'Travel to ' : 'Go to ') + l.name;
      var wxT = WEATHER[w.weather], outd = !LOCATIONS[here].indoor || !l.indoor, eff = [];
      if (outd && wxT.wet && !w.umbrella && m >= 3) eff.push('!Wet clothes');
      if (m >= 8) eff.push('!+Fatigue');
      (roadHere && road ? travel : goTo).push({ label: label + closed, effects: eff, icon: (LOCATIONS[id].indoor ? '🚪' : '🚶'), run: travelTo(id), locationId: id, mins: m, minutes: m, sub: roadHere ? (road ? 'Travel to' : 'Go to') : null });
    });
    goTo.sort(function (a, b) { return a.mins - b.mins || (a.label < b.label ? -1 : 1); });
    travel.sort(function (a, b) { var ap = a.locationId === 'park' || LOCATIONS[a.locationId].alleyway, bp = b.locationId === 'park' || LOCATIONS[b.locationId].alleyway; return ap - bp || a.mins - b.mins; });
    var out = goTo.concat(travel);
    if (BUS_STOPS.indexOf(here) >= 0) out.push({ label: 'Bus stop', icon: '🚌', minutes: 2, sub: 'Travel to', run: function () {
      w.busOpen = here;
      var msg = busStopUsable() ? 'You wait at the bus shelter. The timetable says a bus comes every ten minutes or so.' + (OUTSKIRTS_STOPS.indexOf(here) >= 0 ? ' Only the Number 12 stops out here.' : '') : 'The timetable is taped over: no more buses tonight' + (W().weather === 'snow' ? ' because of the snow' : '') + '.';
      return { text: '<p>' + msg + '</p>', minutes: 2 };
    } });
    if (roadHere) out.push({ label: 'Loiter', icon: '🧍', minutes: 15, sub: 'Travel to', run: loiter });
    return out;
  }
  function knockDoor() {
    var h = G.time.hour;
    if (h >= 21 || h < 8) { G.change('stats.needs.stress', 15); return { text: '<p>You knock. A light comes on upstairs, a curtain twitches, and a voice tells you through the letterbox that it is far too late for callers. You leave quickly.</p>', minutes: 2 }; }
    var r = Math.random();
    if (r < 0.4) return { text: '<p>Nobody answers. A security camera above the door blinks at you.</p>', minutes: 2 };
    if (r < 0.7) { G.change('stats.needs.stress', -5); return { text: '<p>A woman in gardening gloves opens the door, listens politely, says she is not buying anything and wishes you a nice day.</p>', minutes: 2 }; }
    if (r < 0.9) { G.change('money', 8); G.change('stats.needs.fatigue', carryFat(60)); return { text: '<p>An older man asks if you would carry some boxes from his car to the garage. Twenty minutes later he presses $8 into your hand.</p>', minutes: 22 }; }
    G.change('stats.needs.thirst', 120); G.change('stats.needs.stress', -15);
    return { text: '<p>A cheerful retired couple invite you in for a glass of lemonade and show you photos of their grandchildren. It is oddly nice.</p>', minutes: 20 };
  }
  var LOITER = {
    Town: ['You hang around outside the shops, people-watching. Everyone seems to be in a hurry except you.', 'You window-shop slowly and listen in on the conversations drifting out of doorways.', 'You sit on a low wall and watch the traffic, the dog walkers and the bus come and go.'],
    Residential: ['You lean on a garden wall and watch the street. A man washes his car; a kid kicks a ball against a garage door.', 'You dawdle along the pavement, reading the names on doorbells and the notices in windows.'],
    Outskirts: ['You lean on the river wall and watch a narrowboat chug past. A heron ignores you completely.', 'You kick a stone along the lane. The town feels far away out here.']
  };
  function loiter() {
    var l = loc(), ev = tryEvent('arrive'); aware(1);
    var line = l.alleyway ? 'You hang about in the alleyway, listening to the town on the other side of the walls. Nobody comes this way much.' : pick(LOITER[l.district] || LOITER.Town);
    if (isDark(G.time.hour)) line += ' It is dark, and you are more aware than usual of who else is about.';
    return { text: '<p>' + line + '</p>' + (ev ? '<p>' + ev.text + '</p>' : ''), minutes: 15 + ((ev && ev.minutes) || 0) };
  }


  function seasonOffset(state) {
    var c = state.creation && state.creation.world, want = c && c.startSeason ? String(c.startSeason).toLowerCase() : 'autumn';
    var i = SEASONS.map(function (x) { return x.toLowerCase(); }).indexOf(want);
    return (i < 0 ? 0 : i) * DAYS_PER_SEASON;   // 28 days = 4 weeks, so the start stays a Monday
  }

  /* ---------------- Module ---------------- */
  var mod = {
    id: 'world',

    init: function (state) {
      if (!state.world) {
        state.world = {
          minutes: 7 * 60 + 30 + seasonOffset(state) * 1440,     // 07:30 Monday; autumn term unless creation picked another season
          day: 1,
          location: 'dorm_room',
          weather: 'clear', prevWeather: null, temp: 14,
          umbrella: false,
          visited: { dorm_room: true },
          eventsSeen: {},
          lastWeatherHour: 7
        };
      }
      syncTime();
      if (!state.world.temp) rollWeather(true);
      if (!state.world.forecast) rollForecast();
    },

    // Engine calls this with the minutes an option consumed.
    onTick: function (minutes, state) {
      var w = state.world, beforeDay = w.day;
      w.minutes += Math.max(0, minutes | 0);
      syncTime();
      // Weather shifts every ~3 hours, rolled fresh at 6:00 each day.
      var hoursSince = Math.floor(w.minutes / 60) - Math.floor((w.minutes - minutes) / 60);
      if (w.day !== beforeDay) {
        var fc = w.forecast; rollWeather(true);
        if (fc && Math.random() < 0.8) { w.weather = fc; w.temp = baseTemp(); }
        rollForecast();
        if (G.emit) G.emit('newDay', { day: w.day, weekday: G.time.weekday, season: G.time.season });
        var ft = festivalToday(), fs = festivalSoon();
        if (ft && G.notify) { G.notify('Today: ' + ft.name + ' at ' + LOCATIONS[ft.where].name + ', ' + ft.from + ':00 to ' + ft.to + ':00', 'info'); if (G.emit) G.emit('festival', ft); }
        else if (fs && G.notify) G.notify('Posters around town: the ' + fs.name + ' is coming soon.', 'info');
      } else if (hoursSince > 0 && Math.random() < Math.min(0.9, hoursSince / 3)) {
        var old = w.weather; rollWeather(false);
        if (old !== w.weather && !loc().indoor && G.notify) G.notify('Weather: ' + WEATHER[old].label + ' → ' + WEATHER[w.weather].label, 'info');
      }
      // Ongoing exposure while standing outdoors
      if (!loc().indoor && minutes > 0) {
        var wx = WEATHER[w.weather], chunks = Math.floor(minutes / 15);
        if (chunks && wx.wet && !w.umbrella) wetClothes(Math.round(wx.wet * 0.5 * chunks));
        if (chunks && wx.thirst) G.change('stats.needs.thirst', -wx.thirst * chunks);
      }
    },

    getOptions: function (state) {
      var w = state.world, l = loc();
      if (w.busOpen && w.busOpen !== w.location) w.busOpen = null;
      var opts = { dialogue: [], actions: [], travel: w.busOpen ? busOptions() : travelOptions(), other: [] };
      if (w.menuOpen && (w.menuOpen !== w.location || !isOpen(w.location))) w.menuOpen = null;
      if (w.menuOpen) { opts.actions = menuOptions(w.menuOpen); return opts; }
      if (MENUS[w.location] && !isOpen(w.location)) opts.actions.push({ label: 'Look at the menu', icon: '📋', minutes: 1, section: 'shop', disabled: true, reason: closedReason(w.location), run: function () { return {}; } });
      if (MENUS[w.location] && isOpen(w.location)) {
        opts.actions.push({ label: 'Look at the menu', icon: '📋', minutes: 1, section: 'shop', run: function () {
          w.menuOpen = w.location;
          var m = MENUS[w.location], lines = m.items.filter(function (it) { return !it.hours || (G.time.hour >= it.hours[0] && G.time.hour < it.hours[1]); })
            .map(function (it) { return it.name + ', $' + it.price; });
          return { text: '<p><b>' + m.title + '</b></p><p>' + lines.join('<br>') + '</p>', minutes: 1 };
        } });
      }
      var fest = festivalLive();
      if (fest && fest.where === w.location) {
        fest.acts.forEach(function (a) {
          opts.actions.push(afford({ label: a.label, minutes: a.minutes || 10, effects: fxTags(a.fx, a.cost), run: function () {
            if (a.cost) { if (num(G.state, 'money') < a.cost) return { text: '<p>You don\'t have enough cash for that.</p>', minutes: 1 }; G.change('money', -a.cost); }
            applyFx(a.fx); return { text: '<p>' + a.text + '</p>', minutes: a.minutes || 10 };
          } }, a.cost));
        });
      }

      sunOptions().forEach(function (o) { opts.actions.push(o); });
      if (w.location === 'residential') opts.actions.push({ label: 'Knock on one of the houses', icon: '🚪', minutes: 2, effects: function () { var h = G.time.hour; return h >= 21 || h < 8 ? ['!Late to be knocking'] : ['^Maybe a small job']; }, run: knockDoor });
      opts.actions.push({ label: 'Look around', icon: '👀', minutes: 2, run: function () {
        var ev = tryEvent('idle');
        return { text: locationBlurb() + (ev ? '<p>' + ev.text + '</p>' : ''), minutes: 2 + ((ev && ev.minutes) || 0) };
      } });

      opts.actions.push({ label: 'Wait', icon: '⏳', minutes: 30, run: function () {
        var ev = tryEvent('idle');
        return { text: '<p>You let half an hour drift by.</p>' + (ev ? '<p>' + ev.text + '</p>' : ''), minutes: 30 };
      } });

      if (!l.indoor && ['rain', 'storm', 'drizzle'].indexOf(w.weather) >= 0) {
        opts.actions.push({ label: 'Shelter under an awning until it eases', icon: '☔', minutes: 40, effects: ['^Stay dry', '!+Stress'], run: function () {
          var m = 40; G.change('stats.needs.stress', 10);
          return { text: '<p>You tuck yourself under the nearest overhang and watch the rain bounce off the pavement.</p>', minutes: m };
        } });
      }

      var lk = G.state.lock;
      if (w.shop && (w.location !== w.shop.at || !isOpen('market') || w.minutes - (w.shop.t || 0) > 120 || (lk && lk.reason !== 'world-shop'))) endShop();
      if (!w.shop && lk && lk.reason === 'world-shop') G.state.lock = null;
      if (w.location === 'market' && !isOpen('market')) opts.actions.push({ label: 'Do some grocery shopping', icon: '🛒', minutes: 2, section: 'shop', disabled: true, reason: closedReason('market'), run: function () { return {}; } });
      if (w.location === 'market' && isOpen('market')) {
        var hr = G.time.hour, sn = season(), busy = crowd('market');
        var PRODUCE = { spring: 'early rhubarb, bunches of radishes and the first strawberries, still pricey', summer: 'crates of tomatoes, punnets of berries and corn still in its husks',
          autumn: 'local apples by the sack, squash, and a basket of muddy potatoes from a farm up the valley', winter: 'clementines in net bags, parsnips, and sprouts on the stalk' };
        var AISLES = [
          ['Produce', function () { return 'You wander the fruit and veg: ' + (PRODUCE[sn] || PRODUCE.autumn) + '. A hand-written sign says "Ask Marcus about the bruised box, half price."'; }, '🍎'],
          ['Bakery and dry goods', function () { var hr = G.time.hour; return hr < 10 ? 'The bakery shelf is still warm: crusty loaves, soft rolls and a tray of iced buns. The whole front of the shop smells of it.'
            : hr >= 18 ? 'The bakery shelf is picked over, but what\'s left wears yellow discount stickers: a lopsided loaf, two rolls, a lonely croissant.'
            : 'Sliced loaves, bagels and a few cakes under a plastic dome. The good stuff went this morning.'; }, '🥖'],
          ['Dairy', function () { return 'The chiller hums. Milk in three sizes, local butter in paper, eggs from the campus farm, and a cheese wedge someone has clearly put back in the wrong place.'; }, '🧀'],
          ['Drinks and snacks', function () { return 'Bottled water, fizzy drinks, crisps by the multipack and a fridge of energy drinks with a "students: 2 for $3" sign taped crookedly to the door.'; }, '🥤']
        ];
        var sh = w.shop;
        if (!sh) opts.actions.push({ label: 'Do some grocery shopping', icon: '🛒', minutes: 2, section: 'shop', effects: ['^Groceries for your bag'], disabled: !!G.state.lock, reason: G.state.lock ? 'Already busy' : '', run: function () {
          if (G.state.lock) return { text: '<p>You can\'t start shopping right now.</p>', minutes: 0 };
          w.shop = { at: 'market', seen: [], basket: [], t: w.minutes }; G.state.lock = { reason: 'world-shop', allow: [] };
          return { text: '<p>You grab a red plastic basket from the stack by the door.' + (busy > 0.5 ? ' The aisles are busy; you sidestep a trolley almost at once.' : busy > 0.2 ? ' A few other shoppers drift between the shelves.' : ' The shop is quiet, just you and the hum of the fridges.') + '</p>', minutes: 2 };
        } });
        else {
          opts.actions = []; opts.travel = [];   // the shopping scene holds G.state.lock (reason 'world-shop'); its steps are always:true
          AISLES.forEach(function (ai, n) {
            if (sh.seen.indexOf(n) >= 0) return;
            opts.actions.push({ label: (sh.seen.length ? 'Keep going: ' : 'Start with the ') + ai[0].toLowerCase() + ' aisle', icon: ai[2], minutes: 3, section: 'now', run: function () { sh.seen.push(n); return { text: '<p>' + ai[1]() + '</p>', minutes: 3 }; } });
          });
          var room = bagRoom() - basketServings(sh);
          if (gcat('water')) GROCER.forEach(function (it) {
            var c = gcat(it.id), n = sh.basket.filter(function (x) { return x === it.id; }).length;
            if (!c || sh.seen.indexOf(it.aisle) < 0 || n >= 3) return;
            var price = gprice(it.id), o = { label: 'Put ' + (n ? 'another ' : '') + c.label.toLowerCase() + ' in your basket ($' + price + ')', icon: '🧺', minutes: 1, section: 'now',
              effects: ['^+' + c.qty + ' ' + c.unit + (c.qty === 1 ? '' : /(sh|ch|ss|s)$/.test(c.unit) ? 'es' : 's') + ' for your bag'], run: function () {
              sh.basket.push(it.id); return { text: '<p>' + c.label + ' goes in the basket.' + (it.id === 'bread' && G.time.hour >= 18 ? ' It has a yellow sticker.' : '') + '</p>', minutes: 1 };
            } };
            if ((c.qty || 1) > room) { o.disabled = true; o.reason = 'Your bag is full'; }
            opts.actions.push(o);
          });
          var total = basketTotal(sh), q = busy > 0.5 ? 8 : busy > 0.2 ? 4 : 2;
          var co = { label: 'Take a break at the till' + (sh.basket.length ? ' and pay ($' + total + ')' : ''), icon: '💳', minutes: q + 1, section: 'now',
            effects: sh.basket.length ? ['!−$' + total, '^Groceries in your bag'] : [], run: function () {
              var t = basketTotal(sh), counts = {}, names = [];
              sh.basket.forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });
              Object.keys(counts).forEach(function (id) { var c = gcat(id); names.push((counts[id] > 1 ? counts[id] + ' × ' : '') + c.label.toLowerCase()); if (G.groceries && G.groceries.add) G.groceries.add(id, (c.qty || 1) * counts[id]); });
              G.change('money', -t); endShop();
              return { text: '<p>' + (q >= 8 ? 'The queue takes an age. ' : q >= 4 ? 'You wait behind two people. ' : '') + 'The cashier scans ' + names.join(', ') + '. $' + t + ' all told.</p><p>You pack it all into your bag.</p>', minutes: q + 1 };
            } };
          co.label = sh.basket.length ? 'Pay at the till ($' + total + ')' : 'Pay at the till';
          if (!sh.basket.length) { co.disabled = true; co.reason = 'Your basket is empty'; }
          else afford(co, total);
          opts.actions.push(co);
          opts.actions.push({ label: 'Put the basket back and leave', icon: '↩️', minutes: 1, section: 'now', run: function () {
            var had = sh.basket.length; endShop();
            return { text: '<p>' + (had ? 'You put everything back where you found it, mostly, and stack the basket by the door.' : 'You stack the empty basket back by the door.') + '</p>', minutes: 1 };
          } });
          opts.actions.forEach(function (o) { o.always = true; });
          return opts;
        }
      }

      if (w.location === 'market' && isOpen('market') && !w.umbrella) {
        opts.actions.push({ label: 'Buy an umbrella ($12)', icon: '☂️', minutes: 3, effects: ['!−$12', '^Less rain soaking'], disabled: money() < 12, reason: money() < 12 ? 'Needs $12' : '', run: function () {
          if (num(G.state, 'money') < 12) return { text: '<p>You turn the umbrella over, check the price tag, and check your wallet. Not today.</p>', minutes: 1 };
          G.change('money', -12); w.umbrella = true;
          return { text: '<p>You buy a sturdy black umbrella. It clicks open satisfyingly.</p>', minutes: 3 };
        } });
      }

      if (w.location === MARKET_DAY.where && marketLive()) MARKET_DAY.acts.forEach(function (a) {
        opts.actions.push(afford({ label: a.label, minutes: a.minutes || 10, effects: fxTags(a.fx, a.cost), run: function () {
          if (a.cost) { if (num(G.state, 'money') < a.cost) return { text: '<p>You don\'t have enough cash for that.</p>', minutes: 1 }; G.change('money', -a.cost); }
          applyFx(a.fx); return { text: '<p>' + a.text + '</p>', minutes: a.minutes || 10 };
        } }, a.cost));
      });
      if (w.location === 'shopping_centre' && isOpen('shopping_centre')) {
        if (!w.bike) opts.actions.push({ label: 'Buy a second-hand bicycle from the cycle kiosk ($' + BIKE_PRICE + ')', icon: '🚲', minutes: 10, effects: ['!−$' + BIKE_PRICE, '^Faster trips'], disabled: money() < BIKE_PRICE, reason: money() < BIKE_PRICE ? 'Needs $' + BIKE_PRICE : '', run: function () {
          if (num(G.state, 'money') < BIKE_PRICE) return { text: '<p>The kiosk owner shows you a sturdy green bike with a basket. You check your wallet and sadly hand it back.</p>', minutes: 3 };
          G.change('money', -BIKE_PRICE); w.bike = true; w.bikeFlat = false;
          return { text: '<p>You wheel out a sturdy green bike with a wicker basket and a bell that dings a little sadly. Longer trips around town will take half the time now, unless the weather is foul.</p>', minutes: 10 };
        } });
        else if (w.bikeFlat) opts.actions.push({ label: 'Get your puncture fixed ($6)', icon: '🔧', minutes: 15, effects: ['!−$6', '^Bike fixed'], disabled: money() < 6, reason: money() < 6 ? 'Needs $6' : '', run: function () {
          if (num(G.state, 'money') < 6) return { text: '<p>Not enough cash for the repair.</p>', minutes: 1 };
          G.change('money', -6); w.bikeFlat = false; return { text: '<p>The kiosk owner patches the tube in ten minutes flat, whistling.</p>', minutes: 15 };
        } });
      }
      if (w.location === 'dorm_room') opts.other.push({ label: 'Check the weather app', icon: '🌦️', minutes: 1, section: 'self', run: function () {
        return { text: '<p>It is ' + G.time.clock + ' on ' + G.time.weekday + ', day ' + G.time.dayOfSeason + ' of ' + G.time.season +
          '. ' + weatherLine() + '</p><p>' + forecastLine() + '</p>', minutes: 1 };
      } });
      opts.other.push({ label: 'Open the town map', icon: '🗺️', minutes: 0, section: 'self', run: function () { return { text: mapHtml(), minutes: 0 }; } });
      return opts;
    }
  };


  // Temperature in the player's chosen unit. Reads G.settings.tempUnit ('C' or 'F') or G.settings.fahrenheit.
  function useF() { var st = G.settings || {}; return st.tempUnit === 'F' || st.tempUnit === 'f' || st.fahrenheit === true; }
  function fmtTemp(c) { if (G.fmtTemp) return G.fmtTemp(c); return useF() ? Math.round(c * 9 / 5 + 32) + '°F' : c + '°C'; }

  /* ---------------- Clickable town map ---------------- */
  // Minutes for one hop, with the same weather and bike rules as the travel options.
  function hopMins(from, to) {
    var w = W(), m = ADJ[from][to], l = LOCATIONS[to];
    if (w.weather === 'storm' || w.weather === 'snow') m = Math.ceil(m * 1.4);
    if (w.bike && !w.bikeFlat && m >= 4 && w.weather !== 'storm' && w.weather !== 'snow' && (!LOCATIONS[from].indoor || !l.indoor)) m = Math.max(2, Math.ceil(m * 0.5));
    return m;
  }
  // Quickest walking route from here to every place: {id: {mins, path:[...]}}
  function routes(from) {
    var dist = {}, prev = {}, done = {}; dist[from] = 0;
    for (;;) {
      var u = null; Object.keys(dist).forEach(function (k) { if (!done[k] && (u === null || dist[k] < dist[u])) u = k; });
      if (u === null) break; done[u] = true;
      Object.keys(ADJ[u] || {}).forEach(function (v) { if (!LOCATIONS[v]) return; var d = dist[u] + hopMins(u, v); if (dist[v] === undefined || d < dist[v]) { dist[v] = d; prev[v] = u; } });
    }
    var out = {};
    Object.keys(dist).forEach(function (id) { var path = [], c = id; while (c !== from) { path.unshift(c); c = prev[c]; } out[id] = { mins: dist[id], path: path }; });
    return out;
  }
  // An option that walks the whole route, so the engine runs it like any other action.
  function routeOption(dest) {
    var r = routes(W().location)[dest]; if (!r || !r.path.length) return null;
    return { label: 'Go to ' + LOCATIONS[dest].name, minutes: r.mins, section: 'travel', run: function (state) {
      var w = W(), path = r.path, mins = 0, via = [];
      w.busOpen = null; w.menuOpen = null;
      for (var k = 0; k < path.length - 1; k++) { var step = _travelTo(path[k])(state); mins += step.minutes; via.push(LOCATIONS[path[k]].name); }
      var last = travelTo(dest)(state);
      return { text: (via.length ? '<p>You make your way via ' + via.join(', ') + '. ' + fmtT(mins + last.minutes) + ' in all.</p>' : '') + last.text, minutes: mins + last.minutes };
    } };
  }
  var MAP_ORDER = ['Campus', 'Campus Edge', 'Town', 'Shopping Centre', 'Residential', 'Outskirts'];
  function mapHtml() {
    var here = W().location, byDistrict = {}, rt = routes(here);
    Object.keys(LOCATIONS).forEach(function (id) { var d = LOCATIONS[id].district || 'Other'; (byDistrict[d] = byDistrict[d] || []).push(id); });
    var ds = Object.keys(byDistrict).sort(function (a, b) { var ia = MAP_ORDER.indexOf(a), ib = MAP_ORDER.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
    var html = '<p><b>Map of Hollowbrook</b> · tap a place to go there</p><div class="wmap">';
    ds.forEach(function (d) {
      var ids = byDistrict[d].slice().sort(function (a, b) { return (rt[a] ? rt[a].mins : 999) - (rt[b] ? rt[b].mins : 999); });
      html += '<div class="wmap-d' + (LOCATIONS[here].district === d ? ' wmap-here-d' : '') + '"><div class="wmap-h">' + d + '</div>';
      ids.forEach(function (id) {
        var l = LOCATIONS[id], closed = weatherClosure(id) || !isOpen(id), r = rt[id];
        var hrs = l.open ? l.open[0] + ':00–' + (l.open[1] % 24) + ':00' : 'always open';
        if (id === here) { html += '<div class="wmap-p wmap-here">➤ ' + l.name + '<small>You are here</small></div>'; return; }
        if (!r) { html += '<div class="wmap-p wmap-off">' + l.name + '<small>No way there</small></div>'; return; }
        html += '<a href="#" class="wmap-p' + (closed ? ' wmap-closed' : '') + (W().visited[id] ? '' : ' wmap-new') + '" data-wgo="' + id + '" title="' + hrs + '">' + l.name +
          '<small>' + fmtT(r.mins) + (closed ? ' · closed' : '') + (W().visited[id] ? '' : ' · new') + '</small></a>';
      });
      html += '</div>';
    });
    return html + '</div>';
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-wgo]') : null; if (!t) return;
      e.preventDefault(); e.stopPropagation();
      var lk = G.state && G.state.lock; if (lk && (lk.allow || []).indexOf('travel') < 0) { if (G.notify) G.notify('You can\'t travel right now.', 'info'); return; }
      var o = routeOption(t.getAttribute('data-wgo')); if (o && G.act) G.act(o);
    }, true);
    var css = '.wmap{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;margin:6px 0 10px}' +
      '.wmap-d{border:1px solid rgba(128,128,128,.35);border-radius:8px;padding:6px}.wmap-here-d{border-color:#c9a227}' +
      '.wmap-h{font-weight:bold;font-size:.85em;text-transform:uppercase;letter-spacing:.05em;opacity:.75;margin-bottom:4px}' +
      '.wmap-p{display:block;padding:4px 6px;margin:2px 0;border-radius:5px;text-decoration:none;color:inherit;background:rgba(128,128,128,.12);line-height:1.25}' +
      'a.wmap-p:hover,a.wmap-p:focus{background:rgba(201,162,39,.25)}.wmap-p small{display:block;opacity:.7;font-size:.8em}' +
      '.wmap-here{background:rgba(201,162,39,.35);font-weight:bold}.wmap-closed{opacity:.55}.wmap-new{font-style:italic}.wmap-off{opacity:.4}';
    var add = function () { if (document.getElementById('wmap-css')) return; var st = document.createElement('style'); st.id = 'wmap-css'; st.textContent = css; (document.head || document.body).appendChild(st); };
    if (document.head) add(); else document.addEventListener('DOMContentLoaded', add);
  }

  // Arrival hook: describe the new place and roll an arrival event.
  // Engine should emit 'arrive' after a travel option; we also handle it via the `after` flag if engine passes results through.
  function onArrive() {
    var ev = tryEvent('arrive');
    var html = locationBlurb() + (ev ? '<p>' + ev.text + '</p>' : '');
    return { html: html, minutes: (ev && ev.minutes) || 0 };
  }
  // Wrap travel run so the arrival blurb is part of the same story text regardless of engine behaviour.
  var _travelTo = travelTo;
  travelTo = function (dest) {
    var base = _travelTo(dest);
    return function (state) {
      W().privacy = null;
      var r = base(state), a = onArrive();
      if (G.emit) G.emit('arrive', { location: dest });
      return { text: r.text + a.html, minutes: r.minutes + a.minutes };
    };
  };


  // How busy a place is right now, 0 (empty) to 1 (packed). Used to scale the chance of being seen or smelled.
  var CROWD_BASE = { dorm_room: 0, dorm_hall: 0.35, quad: 0.6, main_building: 0.55, lecture_hall: 0.75, deans_office: 0.2, library: 0.45, cafeteria: 0.7,
    gym: 0.45, campus_farm: 0.15, college_road: 0.45, main_street: 0.65, town_square: 0.6, high_street: 0.55, residential: 0.3, river_lane: 0.2,
    alley: 0.08, cafe: 0.55, market: 0.55, florist: 0.25, park: 0.4, bar: 0.6, town_hall: 0.3, church: 0.2, docks: 0.25, old_mill: 0.05, woods: 0.03,
    shopping_centre: 0.6, dog_pound: 0.2 };
  function crowd(id) {
    id = resolve(id || W().location);
    var l = LOCATIONS[id]; if (!l) return 0;
    if (id === 'dorm_room') return 0;
    if (l.open && !isOpen(id)) return 0.02;
    var c = CROWD_BASE[id]; if (c === undefined) c = l.indoor ? 0.4 : 0.3;
    var h = G.time.hour, wkend = G.time.weekdayIndex >= 5, campus = l.district === 'Campus' || l.district === 'Campus Edge';
    if (h < 6) c *= 0.1; else if (h < 8) c *= 0.5; else if (h >= 23) c *= 0.3; else if (h >= 20) c *= (id === 'bar' ? 1.3 : 0.6);
    if (campus && id !== 'dorm_hall') c *= wkend ? 0.5 : 1.15;
    if (!campus && wkend && h >= 10 && h < 18) c *= 1.2;
    var wx = W().weather;
    if (!l.indoor && (wx === 'rain' || wx === 'storm' || wx === 'snow')) c *= wx === 'rain' ? 0.6 : 0.35;
    var f = festivalLive && festivalLive(); if (f && (f.where === id || (f.where && f.where.indexOf && f.where.indexOf(id) >= 0))) c = Math.max(c, 0.9);
    return Math.max(0, Math.min(1, Math.round(c * 100) / 100));
  }

  /* ---------------- Public helpers for other modules ---------------- */
  G.world = {
    LOCATIONS: LOCATIONS,
    WEATHER: WEATHER,
    WEEKDAYS: WEEKDAYS,
    here: function () { return loc(); },
    fmtTime: function (m) { return fmtT(Math.max(0, Math.round(m || 0))); },   // 75 -> '(1:15)'
    onCampus: function (id) { var l = LOCATIONS[resolve(id || W().location)]; return !!l && (l.district === 'Campus' || l.district === 'Campus Edge'); },   // grounds, main building, dorm, library, dining, gym, farm            // location object: {id, name, district, indoor, tags, ...}
    hereId: function () { return W().location; },
    is: function (id) { return W().location === resolve(id); },
    resolve: resolve,
    ALIASES: ALIASES,
    location: loc,
    isOpen: isOpen,
    isDark: function () { return isDark(G.time.hour); },
    isIndoors: function () { return !!loc().indoor; },
    hasRestroom: function () { return !!loc().restroom; },
    // Privacy. Private: your dorm room, any location with private:true, or a spot another module has marked
    // with setPrivate (a restroom stall, a fitting room). That mark lasts until you leave the location or it's cleared.
    isPrivate: function (id) {
      var w = W(); id = resolve(id || w.location); var l = LOCATIONS[id]; if (!l) return false;
      if (id === 'dorm_room' || l.private) return true;
      return !!(w.privacy && w.privacy.at === id && id === w.location);
    },
    isPublic: function (id) { return !G.world.isPrivate(id); },
    // Out of sight but not private (woods, the old mill, an empty alley at night): crowd under 0.1.
    isSecluded: function (id) { return !G.world.isPrivate(id) && crowd(id) < 0.1; },
    setPrivate: function (on, why) { var w = W(); w.privacy = on ? { at: w.location, why: why || '' } : null; },
    crowd: crowd,   // 0..1 how busy a place is right now (default: here); scales witness/smell odds
    weather: function () { return W().weather; },
    temp: function () { return W().temp; },
    isRaining: isRaining,             // drizzle, rain or storm right now
    isSunny: sunny,
    fmtTemp: fmtTemp,                 // 14 -> '14°C' or '57°F' per G.settings.tempUnit
    routeTo: routeOption,             // option that walks the quickest route to a place (or null)
    mapHtml: mapHtml,
    season: season,
    partOfDay: function () { return partOfDay(G.time.hour); },
    distance: function (a, b) { a = resolve(a); b = resolve(b); return (ADJ[a] && ADJ[a][b]) || null; },
    neighbours: function (id) { return Object.keys(ADJ[id || W().location]); },
    // Move the player without walking (e.g. passing out, being escorted). Returns nothing.
    teleport: function (id) { id = resolve(id); if (LOCATIONS[id]) { W().privacy = null; W().location = id; W().visited[id] = true; if (G.emit) G.emit('arrive', { location: id }); } },
    // Let other modules add events: same shape as EVENTS entries.
    addEvent: function (e) { EVENTS.push(e); },
    // Let other modules add locations: addLocation('greenhouse', {...}, [['campus_farm', 3]])
    addLocation: function (id, data, links) {
      if (!LOCATIONS[id]) { LOCATIONS[id] = data; tagLoc(id); }   // already on the map: keep ours, just add links
      (links || []).forEach(function (l) { (ADJ[id] = ADJ[id] || {})[l[0]] = l[1]; (ADJ[l[0]] = ADJ[l[0]] || {})[id] = l[1]; });
    },
    describeHere: locationBlurb,
    festivalToday: festivalToday,     // {id, name, where, from, to, ...} or null
    festivalLive: festivalLive,       // same, but only during its hours
    FESTIVALS: FESTIVALS,
    MENUS: MENUS,
    BUS_STOPS: BUS_STOPS,
    forecast: function () { return W().forecast || null; },
    hasBike: function () { return !!W().bike && !W().bikeFlat; },
    marketLive: marketLive,
    moonFull: moonFull,
    weatherClosure: function (id) { return weatherClosure(resolve(id || W().location)); },
    crowdText: function (id) { return crowdLine(resolve(id || W().location)); },
    EVENTS: EVENTS                    // read-only use, for tests and debugging
  };

  // Creation runs after modules init, so re-apply the chosen start season when the game actually starts.
  if (G.on) G.on('start', function (state) {
    var w = state.world; if (!w || w.started) return;
    w.started = true;
    w.minutes = 7 * 60 + 30 + seasonOffset(state) * 1440;
    syncTime(); rollWeather(true); rollForecast();
  });

  if (G.on) G.on('start', addPetEvents);
  setTimeout(addPetEvents, 0); setTimeout(addPetEvents, 200);   // pets.js loads after us

  if (!G.time) G.time = {};
  if (G.register) G.register(mod);
  else console.warn('world.js: G.register not found; is engine.js loaded first?');
})();
