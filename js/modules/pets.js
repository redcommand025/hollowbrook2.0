/* pets.js: companions for Hollowbrook. Owner: Jimmy.
   Adopt from Paws & Whiskers or rescue a stray; feed, groom, play, walk, train, take along.
   Neglected pets get sick and may run away (and can be found again). Pets never die.
   Public API: G.pets (see bottom). Character menu tab "Companions" at order 35. */
(function () {
  'use strict';
  var MAX = 1000;

  // ---------- species ----------
  // rates are points lost per hour (needs run 0..1000, 1000 = fully satisfied)
  var SPECIES = {
    dog: { label: 'Dog', price: 120, food: 'kibble', follow: 'leash', walks: true, home: 'petbed',
      rates: { hunger: 32, thirst: 45, energy: 0, hygiene: 14, happiness: 26 },
      breeds: ['scruffy terrier mix', 'gentle old lab', 'wiry-haired collie cross', 'stubby-legged corgi mix', 'lanky greyhound rescue'],
      tricks: ['Sit', 'Paw', 'Roll over', 'Fetch', 'Play dead'],
      perk: { id: 'pickpocketWarning', label: 'Watchful', desc: 'Growls when someone reaches for your pockets in town.' },
      idle: ['thumps %p tail against the floor every time you look over', 'brings you a slobbery sock as a gift', 'sighs dramatically and flops at your feet', 'stares at the door, then at you, then at the door'],
      sound: 'woof' },
    cat: { label: 'Cat', price: 90, food: 'catfood', follow: null, home: 'cattree',
      rates: { hunger: 26, thirst: 30, energy: 0, hygiene: 6, happiness: 16 },
      breeds: ['sleek black shorthair', 'fluffy orange tabby', 'grey tabby with white socks', 'one-eared calico', 'cream-coloured longhair'],
      tricks: ['High five', 'Come when called', 'Fetch a hair tie'],
      perk: { id: 'nightPurr', label: 'Night purr', desc: 'Curls up on your chest at night. You wake calmer.' },
      idle: ['knocks a pen off your desk while holding eye contact', 'kneads your blanket with great concentration', 'sits in a sunbeam like it was put there personally', 'chirps at a pigeon through the window'],
      sound: 'mrrp' },
    rabbit: { label: 'Rabbit', price: 60, food: 'pellets', follow: null, home: 'petbed',
      rates: { hunger: 34, thirst: 34, energy: 0, hygiene: 12, happiness: 22 },
      breeds: ['lop-eared brown rabbit', 'tiny white dwarf rabbit', 'spotted Dutch rabbit', 'grey rabbit with a twitchy nose'],
      tricks: ['Spin', 'Come when called', 'Stand up for a treat'],
      perk: { id: 'binky', label: 'Binkies', desc: 'Happy leaps and twists that lift your mood at home.' },
      idle: ['does a sudden binky, leaping and twisting in mid-air', 'thumps a back foot at a noise only %s heard', 'flops onto %p side in total contentment', 'chews the corner of your notebook'],
      sound: 'a soft snuffle' },
    ferret: { label: 'Ferret', price: 80, food: 'ferretfood', follow: 'harness', home: 'cattree',
      rates: { hunger: 36, thirst: 36, energy: 0, hygiene: 18, happiness: 30 },
      breeds: ['sable ferret with a bandit mask', 'cinnamon ferret', 'albino ferret with ruby eyes', 'silver mitt ferret'],
      tricks: ['Come when called', 'Roll over', 'Jump through a hoop'],
      perk: { id: 'treasureHunter', label: 'Treasure hunter', desc: 'Sniffs out dropped coins on walks.' },
      idle: ['does the war dance, bouncing sideways and dooking', 'steals one of your socks and hides it', 'is asleep so deeply %s seems boneless', 'wriggles into your bag and refuses to leave'],
      sound: 'dook dook' },
    parrot: { label: 'Parrot', price: 150, food: 'seed', follow: 'shoulder', home: null,
      rates: { hunger: 22, thirst: 28, energy: 0, hygiene: 8, happiness: 30 },
      breeds: ['green conure with a red belly', 'grey African parrot', 'yellow-faced cockatiel', 'small blue budgerigar'],
      tricks: ['Wave', 'Step up', 'Whistle a tune'],
      perk: { id: 'mimic', label: 'Chatterbox', desc: 'Repeats words you teach, sometimes at the worst moment.' },
      idle: ['whistles the ringtone of your phone perfectly', 'preens and fluffs into a ball', 'hangs upside down from the cage roof', 'says "hello" in your exact voice'],
      sound: 'a bright whistle' },
    hamster: { label: 'Hamster', price: 25, food: 'pellets', follow: null, home: 'tank',
      rates: { hunger: 18, thirst: 20, energy: 0, hygiene: 10, happiness: 14 },
      breeds: ['golden Syrian hamster', 'tiny dwarf hamster', 'white winter hamster', 'cream teddy-bear hamster'],
      tricks: ['Come to your hand', 'Spin in a circle'],
      perk: { id: 'studyBuddy', label: 'Study buddy', desc: 'The squeak of the wheel keeps you company while you study.' },
      idle: ['stuffs both cheeks until %p face is twice as wide', 'runs on the wheel like it owes %o money', 'buries %r completely in bedding', 'washes %p face with tiny paws'],
      sound: 'a tiny squeak' },
    lizard: { label: 'Lizard', price: 110, food: 'insects', follow: null, home: 'tank',
      rates: { hunger: 10, thirst: 14, energy: 0, hygiene: 6, happiness: 8 },
      breeds: ['leopard gecko', 'bearded dragon', 'crested gecko', 'blue-tongued skink'],
      tricks: ['Eat from your hand', 'Touch a target'],
      perk: { id: 'zen', label: 'Unbothered', desc: 'Watching %o bask is oddly calming. Stress fades faster at home.' },
      idle: ['basks under the lamp with %p eyes closed', 'licks the glass, then you, with great dignity', 'stares into the middle distance', 'climbs a branch with slow-motion determination'],
      sound: 'nothing at all' }
  };

  // Exotic animals: only offered once the pet shop keeper trusts you (G.pets.unlockExotics()).
  var EXOTIC = {
    hedgehog: { label: 'Hedgehog', price: 140, food: 'insects', follow: null, home: 'tank', exotic: true,
      rates: { hunger: 20, thirst: 22, energy: 0, hygiene: 10, happiness: 14 },
      breeds: ['salt-and-pepper African pygmy hedgehog', 'pale cinnamon hedgehog', 'snowflake hedgehog'],
      tricks: ['Uncurl for you', 'Come to your hand', 'Sniff out a hidden treat'],
      perk: { id: 'nightWatch', label: 'Night owl', desc: 'Snuffles around at night. Late study sessions feel less lonely.' },
      idle: ['huffs and puffs up %p spines at nothing', 'snores in a tiny ball', 'self-anoints with frothy spit, which is apparently normal', 'trundles across the floor with great purpose'], sound: 'a tiny huff' },
    chinchilla: { label: 'Chinchilla', price: 170, food: 'pellets', follow: null, home: 'cattree', exotic: true,
      rates: { hunger: 18, thirst: 20, energy: 0, hygiene: 6, happiness: 20 },
      breeds: ['standard grey chinchilla', 'velvety black chinchilla', 'beige chinchilla'],
      tricks: ['Come when called', 'Hop to your shoulder', 'Dust-bath on cue'],
      perk: { id: 'softTouch', label: 'Softest thing alive', desc: 'Stroking %o lowers stress far more than it should.' },
      idle: ['popcorns straight up off the shelf', 'rolls joyfully in %p dust bath', 'watches you with huge black eyes', 'chews a lava block with total focus'], sound: 'a soft chirp' },
    tortoise: { label: 'Tortoise', price: 160, food: 'pellets', follow: null, home: 'tank', exotic: true,
      rates: { hunger: 8, thirst: 10, energy: 0, hygiene: 4, happiness: 6 },
      breeds: ['Hermann\'s tortoise', 'Russian tortoise', 'small spur-thighed tortoise'],
      tricks: ['Come to your voice', 'Follow a target stick'],
      perk: { id: 'slowDown', label: 'Slow and steady', desc: 'Watching %o eat a strawberry is a whole meditation. Stress fades at home.' },
      idle: ['eats a dandelion leaf one tiny bite at a time', 'pushes against the glass with ancient determination', 'basks with %p neck fully stretched out', 'has wedged %r in a corner and seems pleased'], sound: 'nothing at all' },
    axolotl: { label: 'Axolotl', price: 120, food: 'insects', follow: null, home: 'tank', exotic: true,
      rates: { hunger: 10, thirst: 0, energy: 0, hygiene: 14, happiness: 6 },
      breeds: ['pink leucistic axolotl', 'golden albino axolotl', 'dark wild-type axolotl'],
      tricks: ['Swim to your finger', 'Eat from tongs'],
      perk: { id: 'smile', label: 'Permanent smile', desc: 'It is hard to stay stressed when %s is smiling at you.' },
      idle: ['floats with %p frilly gills waving gently', 'smiles at you through the glass', 'sits on a rock doing absolutely nothing', 'snaps up a worm with a surprising gulp'], sound: 'a faint bubble' },
    cornsnake: { label: 'Corn snake', price: 130, food: 'insects', follow: null, home: 'tank', exotic: true,
      rates: { hunger: 6, thirst: 10, energy: 0, hygiene: 5, happiness: 5 },
      breeds: ['orange-and-red corn snake', 'pale snow corn snake', 'striped anery corn snake'],
      tricks: ['Calm handling', 'Come to the glass'],
      perk: { id: 'coolHead', label: 'Cool-headed', desc: 'Handling %o steadies your nerves. Willpower checks feel easier.' },
      idle: ['tastes the air with a flicker of %p tongue', 'coils neatly on the warm side of the tank', 'investigates your sleeve very slowly', 'has shed %p skin in one perfect piece'], sound: 'nothing at all' }
  };
  EXOTIC.sugarglider = { label: 'Sugar glider', price: 180, food: 'seed', follow: 'pouch', home: 'cattree', exotic: true, nocturnal: true,
    rates: { hunger: 22, thirst: 24, energy: 0, hygiene: 8, happiness: 34 },
    breeds: ['classic grey sugar glider', 'creamy leucistic sugar glider', 'mosaic-patterned sugar glider'],
    tricks: ['Glide to your hand', 'Come to your whistle', 'Ride in your pocket'],
    perk: { id: 'pocketPal', label: 'Pocket pal', desc: 'Rides in a pouch under your jacket. Busy days feel less stressful.' },
    idle: ['crabs at you, then immediately wants cuddles', 'glides from the curtain rail onto your head', 'sleeps curled in %p pouch until dusk', 'eats a grape with tiny, sticky hands'], sound: 'a soft barking yip' };
  var QUIRKS = {
    hedgehog: 'Feels the cold: gets glum in winter unless the room is cosy. Shy of loud noise.',
    chinchilla: 'Needs dust baths, not water. Hates heat and loves to chew.',
    tortoise: 'Eats very little and lives forever. Happiest after a sunny day.',
    axolotl: 'Lives in cool water. Cleaning means changing the tank water. Needs a terrarium.',
    cornsnake: 'Eats rarely, sheds often. Calm to handle once it trusts you. Needs a terrarium.',
    sugarglider: 'Nocturnal and social: lonely if you are away all evening. Can ride with you in a pouch.'
  };
  Object.keys(EXOTIC).forEach(function (k) { SPECIES[k] = EXOTIC[k]; });

  var PERSONALITIES = {
    playful: { label: 'Playful', desc: 'needs more play, bonds through games', mods: { happiness: 1.3 }, play: 1.5 },
    lazy: { label: 'Lazy', desc: 'naps a lot, happy with less', mods: { happiness: 0.8 }, train: 0.7 },
    curious: { label: 'Curious', desc: 'gets into everything, learns quickly', train: 1.3 },
    shy: { label: 'Shy', desc: 'slow to trust, very loyal once won', bond: 0.7, bondHigh: 1.4 },
    affectionate: { label: 'Affectionate', desc: 'loves cuddles', bond: 1.3, pet: 1.5 },
    mischievous: { label: 'Mischievous', desc: 'steals things, causes small chaos', mods: { hygiene: 1.2 } },
    greedy: { label: 'Greedy', desc: 'always hungry, will do anything for treats', mods: { hunger: 1.3 }, treat: 1.6 },
    brave: { label: 'Brave', desc: 'unfazed by crowds and noise', outing: 1.4 },
    vocal: { label: 'Vocal', desc: 'has a lot to say', mimic: 1.5 },
    independent: { label: 'Independent', desc: 'fine alone, aloof with strangers', mods: { happiness: 0.7 }, pet: 0.7 }
  };

  var BOND_TIERS = [
    { min: 0, key: 'wary', label: 'Wary' }, { min: 150, key: 'accepting', label: 'Accepting' },
    { min: 350, key: 'friendly', label: 'Friendly' }, { min: 600, key: 'loyal', label: 'Loyal' }, { min: 850, key: 'devoted', label: 'Devoted' }
  ];

  var FOODS = {
    kibble: { label: 'Dog kibble (14 meals)', price: 12, servings: 14 }, catfood: { label: 'Cat food (14 meals)', price: 12, servings: 14 },
    pellets: { label: 'Pellets and hay (14 meals)', price: 8, servings: 14 }, ferretfood: { label: 'Ferret food (14 meals)', price: 13, servings: 14 },
    seed: { label: 'Seed and fruit mix (14 meals)', price: 10, servings: 14 }, insects: { label: 'Live insects (10 meals)', price: 9, servings: 10 }
  };
  var SUPPLIES = {
    treats: { label: 'Bag of treats (10)', price: 5, qty: 10 },
    toy: { label: 'A new toy', price: 6, qty: 1 },
    groomkit: { label: 'Grooming kit', price: 12, once: true },
    leash: { label: 'Leash and collar', price: 10, once: true },
    pouch: { label: 'Bonding pouch', price: 14, once: true },
    harness: { label: 'Small-pet harness', price: 9, once: true },
    medicine: { label: 'Pet medicine', price: 15, qty: 1 }
  };
  var NAMES = ['Biscuit', 'Pepper', 'Maple', 'Juniper', 'Pickle', 'Mochi', 'Bean', 'Clementine', 'Sprout', 'Waffles', 'Fig', 'Pip', 'Nutmeg', 'Olive', 'Toast', 'Moss', 'Bramble', 'Ziggy', 'Pumpkin', 'Juniper'];
  var WORDS = ['hello', 'good morning', 'pretty bird', 'snack time', 'what\'s that', 'oh no', 'I love you', 'bye bye', 'Hollowbrook', 'study'];
  // places pets may not go
  var NO_PETS = ['lecture_hall', 'library', 'cafeteria', 'deans_office', 'cafe', 'market', 'bar', 'gym', 'church', 'town_hall', 'clothing_store', 'furniture_store'];

  // ---------- helpers ----------
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rnd(n) { return Math.round(n); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function chance(p) { return Math.random() < p; }
  function P() { return G.state.pets; }
  function note(m, k) { if (G.notify) G.notify(m, k || 'info'); }
  function money() { return Number(G.state.money) || 0; }
  function spend(d) { if (G.change) G.change('money', -d); else G.state.money = money() - d; }
  function hereId() { var h = G.world && G.world.here ? G.world.here() : (G.state.world || {}).location; return (h && h.id) || h || ''; }
  function hereObj() { var h = G.world && G.world.here ? G.world.here() : null; return (h && typeof h === 'object') ? h : (G.world && G.world.LOCATIONS ? G.world.LOCATIONS[h] || {} : {}); }
  function atHome() { return hereId() === 'dorm_room'; }
  function outdoors() { var h = hereObj(); return h.indoor === false; }
  function day() { return (G.time && G.time.day) || 1; }
  function tending() { var s = G.state.stats; return (s && s.skills && s.skills.tending) || 0; }
  function trainTending(n) { if (G.school && G.school.trainTending) G.school.trainTending(n); else if (G.stats && G.stats.trainSkill) G.stats.trainSkill('tending', n); }
  function tb() { try { return (G.school && G.school.tendingBonus) ? G.school.tendingBonus() : 1 + tending() / 1000; } catch (e) { return 1; } }
  function soothe() { try { return (G.school && G.school.sootheChance) ? G.school.sootheChance() : 0.4 + tending() / 1800; } catch (e) { return 0.5; } }
  function hazelLikes(p, n) { if (!sp(p).exotic) return; if (G.emit) G.emit('exoticCare', { pet: p.id, amount: n }); try { if (window.NPCS && NPCS.changeRep) NPCS.changeRep(G.state, 'hazel', n, true); } catch (e) {} }
  function stress(d) { if (G.change) G.change('stats.needs.stress', d); }
  function dormHas(id) { try { return !!(G.dorm && G.dorm.has && G.dorm.has(id)); } catch (e) { return false; } }
  function opt(label, run, extra) { var o = { label: label, run: run }; if (run && run.time) o.time = run.time; if (extra) for (var k in extra) o[k] = extra[k]; return o; }
  function sp(p) { return SPECIES[p.species]; }
  function has(p, t) { return p.traits.indexOf(t) !== -1; }
  function trait(p, key, def) { var v = def; p.traits.forEach(function (t) { var x = PERSONALITIES[t]; if (x && x[key] !== undefined) v *= x[key]; }); return v; }
  function pron(p) { return p.sex === 'f' ? { s: 'she', o: 'her', p: 'her', r: 'herself', S: 'She' } : { s: 'he', o: 'him', p: 'his', r: 'himself', S: 'He' }; }
  function fill(str, p) { var x = pron(p); return str.replace(/%s/g, x.s).replace(/%o/g, x.o).replace(/%p/g, x.p).replace(/%r/g, x.r); }
  function tierOf(b) { var t = BOND_TIERS[0]; BOND_TIERS.forEach(function (x) { if (b >= x.min) t = x; }); return t; }
  function tierIdx(b) { var i = 0; BOND_TIERS.forEach(function (x, j) { if (b >= x.min) i = j; }); return i; }
  function hasPermit() { try { if (G.school && G.school.hasPetPermit) return !!G.school.hasPetPermit(); } catch (e) {} return !!P().permit; }
  function capacity() { return 1 + (hasPermit() ? 1 : 0); }
  function exoticsOpen() {
    if (!P()) return false;
    if (!P().exotics && G.state.npcs && G.state.npcs.flags && G.state.npcs.flags.exotics_unlocked) P().exotics = true;
    return !!P().exotics;
  }
  function homePets() { return P().list.filter(function (p) { return p.status === 'home'; }); }
  function activePets() { return P().list.filter(function (p) { return p.status !== 'runaway'; }); }
  function following() { return P().list.filter(function (p) { return p.status === 'home' && p.following; }); }
  function withYou() { return atHome() ? homePets() : following(); }
  function canFollow(p) { var f = sp(p).follow; if (!f) return false; if (f === 'shoulder') return true; return !!P().supplies[f]; }

  var TIER_MEMO = {
    accepting: '%n stopped flinching when you reached out. A small start.',
    friendly: '%n came to greet you at the door for the first time.',
    loyal: '%n chose to fall asleep next to you instead of in %p own bed.',
    devoted: 'You realised %n would follow you anywhere. You would do the same.'
  };
  var RARE = {
    dog: ['silver-dappled whippet', 'red merle sheltie'], cat: ['blue-eyed white cat with one green eye', 'lilac point Siamese'],
    rabbit: ['tiny blue Netherland dwarf', 'satin-coated rex'], ferret: ['pure white dark-eyed ferret'], parrot: ['lutino cockatiel with flame-orange cheeks'],
    hamster: ['long-haired golden teddy bear hamster'], lizard: ['near-white hypomelanistic gecko'], hedgehog: ['cinnamon pinto hedgehog'],
    chinchilla: ['velvety ebony chinchilla'], tortoise: ['golden-shelled Hermann\'s tortoise'], axolotl: ['shimmering copper axolotl', 'golden albino axolotl'],
    cornsnake: ['pastel "bloodred" corn snake'], sugarglider: ['white-faced platinum sugar glider']
  };
  function memo(p, text) { if (!p.memories) p.memories = []; p.memories.push({ day: day(), text: text }); if (p.memories.length > 20) p.memories.shift(); }
  function lifeStage(p) { var a = (p.ageStart || 0) + (day() - (p.adoptedDay || 0)); return a < 30 ? 'young' : a < 365 ? 'adult' : 'senior'; }
  function bond(p, d) {
    if (d > 0) {
      var m = trait(p, 'bond', 1);
      if (G.stats && G.stats.hasTrait && G.stats.hasTrait('animalFriend')) m *= 1.2;
      if (has(p, 'shy') && p.bond >= 350) m *= PERSONALITIES.shy.bondHigh;
      if (p.health < 400) m *= 0.6;
      d = rnd(d * m);
    }
    var before = tierOf(p.bond);
    p.bond = clamp(p.bond + d, 0, MAX);
    var after = tierOf(p.bond);
    if (d) note(p.name + ': Bond ' + (d > 0 ? '+' : '') + d, d > 0 ? 'up' : 'down');
    if (after.key !== before.key) {
      note(p.name + ' is now ' + after.label + ' with you.', d > 0 ? 'up' : 'down');
      if (d > 0) memo(p, TIER_MEMO[after.key] ? fill(TIER_MEMO[after.key].replace(/%n/g, p.name), p) : p.name + ' became ' + after.label + ' with you.');
      if (after.key === 'devoted' && d > 0) note('Perk unlocked: ' + sp(p).perk.label + '. ' + fill(sp(p).perk.desc, p), 'up');
      if (G.emit) G.emit('petBond', { pet: p.id, tier: after.key });
    }
  }
  function need(p, k, d) { p[k] = clamp(p[k] + d, 0, MAX); }

  function newPet(species, opts) {
    opts = opts || {};
    var S = SPECIES[species], keys = Object.keys(PERSONALITIES);
    var isRare = !opts.breed && !!RARE[species] && chance(0.06);
    var t1 = pick(keys), t2 = pick(keys.filter(function (k) { return k !== t1 && !(k === 'lazy' && t1 === 'playful') && !(k === 'playful' && t1 === 'lazy') && !(k === 'affectionate' && t1 === 'independent') && !(k === 'independent' && t1 === 'affectionate'); }));
    return {
      id: 'pet' + (P().nextId++), species: species, name: opts.name || pick(NAMES), sex: chance(0.5) ? 'f' : 'm',
      rare: isRare,
      breed: opts.breed || (isRare ? pick(RARE[species]) : pick(S.breeds)), traits: chance(0.6) ? [t1, t2] : [t1],
      hunger: 800, thirst: 800, energy: 800, hygiene: opts.stray ? 250 : 850, happiness: opts.stray ? 350 : 650, health: opts.stray ? 600 : 1000,
      bond: opts.stray ? 80 : 120, tricks: {}, words: [], sick: false, vaccinated: false, neglect: 0, status: 'home', following: false,
      ageStart: opts.stray ? 200 + Math.floor(Math.random() * 600) : Math.floor(Math.random() * 20), memories: [], adoptedDay: day(), lastWalkDay: day(), lastPetDay: 0, stray: !!opts.stray, runawayDay: null
    };
  }

  function askName(species, fallback) {
    var n = null;
    try { if (typeof window.prompt === 'function') n = window.prompt('What will you name your new ' + SPECIES[species].label.toLowerCase() + '?', fallback); } catch (e) {}
    n = (n || '').replace(/[<>&"]/g, '').trim().slice(0, 20);
    return n || fallback;
  }

  // ---------- state ----------
  function fresh() {
    return { list: [], nextId: 1, permit: false, permitPending: false,
      supplies: { kibble: 0, catfood: 0, pellets: 0, ferretfood: 0, seed: 0, insects: 0, treats: 0, toy: 0, groomkit: false, leash: false, harness: false, pouch: false, medicine: 0 },
      bowls: { food: 0, water: 0 }, stray: null, exotics: false, exoticsSeen: false, lastEvent: '', history: [] };
  }

  // ---------- ticking ----------
  var accum = 0;
  function onTick(minutes) {
    var st = P(); if (!st) return;
    var hrs = minutes / 60, sleeping = G.state.stats && G.state.stats.flags && G.state.stats.flags.sleeping;
    st.list.forEach(function (p) {
      if (p.status === 'runaway') return;
      var r = sp(p).rates, mods = {};
      p.traits.forEach(function (t) { var m = PERSONALITIES[t].mods || {}; for (var k in m) mods[k] = (mods[k] || 1) * m[k]; });
      ['hunger', 'thirst', 'hygiene', 'happiness'].forEach(function (k) { need(p, k, -r[k] * (mods[k] || 1) * hrs * (sleeping ? 0.5 : 1)); });
      // energy: rests at home, tires when out
      need(p, 'energy', (p.following && !atHome() ? -60 : 40) * hrs);
      // automatic bowls at home
      if (!p.following || atHome()) {
        if (p.hunger < 500 && st.bowls.food > 0) { st.bowls.food--; need(p, 'hunger', 450); }
        if (p.thirst < 600 && st.bowls.water > 0) { var drink = Math.min(st.bowls.water, 500); st.bowls.water -= drink; need(p, 'thirst', drink); }
      }
      // comforts from Jenny's dorm furniture
      var home = sp(p).home;
      if (home && dormHas(home) && (!p.following || atHome())) need(p, 'happiness', 6 * hrs);
      // sleeping together: loyal cuddly pets curl up with you
      if (sleeping && atHome() && tierIdx(p.bond) >= 3 && ['dog', 'cat', 'rabbit', 'ferret', 'sugarglider', 'chinchilla'].indexOf(p.species) !== -1) {
        if (G.change) G.change('stats.needs.stress', -12 * hrs);
        if (p.lastSnuggle !== day()) { p.lastSnuggle = day(); need(p, 'happiness', 80); if (!p.firstSnuggle) { p.firstSnuggle = true; memo(p, 'The first night %n slept curled up against you.'.replace('%n', p.name)); } }
      }
      // gifts: cats and ferrets leave little finds at loyal+
      if (!sleeping && atHome() && tierIdx(p.bond) >= 3 && (p.species === 'cat' || p.species === 'ferret') && p.lastGift !== day() && chance(0.04 * hrs)) {
        p.lastGift = day();
        var finds = p.species === 'cat' ? ['a crumpled leaf', 'a hair tie you lost weeks ago', 'a very dead moth', 'a bottle cap'] : ['a shiny coin', 'one of your socks', 'a pen lid', 'a key that isn\'t yours'];
        var f = finds[Math.floor(Math.random() * finds.length)];
        if (f === 'a shiny coin' && G.change) G.change('money', 1);
        if (G.appendStory) G.appendStory('<p class="flavor">' + p.name + ' trots up and proudly drops ' + f + ' at your feet. It is clearly a gift.</p>');
      }
      // seniors slow down
      if (lifeStage(p) === 'senior') need(p, 'energy', -10 * hrs);
      // species quirks
      var season = (G.time && G.time.season) || '';
      if (p.species === 'hedgehog' && /winter/i.test(season) && !(G.dorm && G.dorm.comfort && G.dorm.comfort() > 3)) need(p, 'happiness', -8 * hrs);
      if (p.species === 'chinchilla' && /hot/.test((G.state.world || {}).weather || '')) need(p, 'happiness', -12 * hrs);
      if (p.species === 'sugarglider' && G.time && (G.time.hour >= 18 && G.time.hour < 24) && !atHome() && !p.following) need(p, 'happiness', -20 * hrs);
      if (p.species === 'tortoise' && /clear|hot/.test((G.state.world || {}).weather || '')) need(p, 'happiness', 4 * hrs);
      if (sp(p).exotic && p.happiness > 600 && p.health > 700 && chance(0.02 * hrs)) hazelLikes(p, 1);
      // dogs need walks
      if (sp(p).walks && day() - p.lastWalkDay >= 1) need(p, 'happiness', -10 * hrs);
      // neglect & sickness
      var low = ['hunger', 'thirst', 'hygiene', 'happiness'].filter(function (k) { return p[k] < 150; }).length;
      if (low) p.neglect += hrs * low; else p.neglect = Math.max(0, p.neglect - hrs * 2);
      if (!p.sick && p.neglect > 18 && chance(0.04 * hrs * (p.vaccinated ? 0.4 : 1))) {
        p.sick = true; note(p.name + ' seems unwell: listless and off ' + pron(p).p + ' food. A vet visit would help.', 'down');
      }
      if (!p.sick && p.hygiene < 80 && chance(0.01 * hrs * (p.vaccinated ? 0.4 : 1))) { p.sick = true; note(p.name + ' has picked up something from a dirty habitat. A vet visit would help.', 'down'); }
      if (p.sick) need(p, 'health', -25 * hrs); else need(p, 'health', 15 * hrs);
      if (p.health < 300) need(p, 'happiness', -10 * hrs);
      // runaway (never dies)
      if (p.sick && p.health < 400 && p.neglect > 72 && p.happiness < 150 && p.bond < 600 && chance(0.05 * hrs)) {
        p.status = 'runaway'; p.following = false; p.runawayDay = day();
        note(p.name + ' is gone. The window was open and the bowl was empty. Maybe someone around town has seen ' + pron(p).o + '.', 'down');
        stress(120);
        if (G.emit) G.emit('petRanAway', { pet: p.id });
      }
      // bond slowly fades if ignored
      if (day() - p.lastPetDay > 2) p.bond = clamp(p.bond - 4 * hrs, 0, MAX);
      // perks
      if (p.status === 'home' && tierIdx(p.bond) >= 4) {
        if (p.species === 'cat' && sleeping && !p.following) stress(-rnd(8 * hrs) || 0);
        if ((p.species === 'lizard' || p.species === 'tortoise' || p.species === 'axolotl') && atHome()) stress(-rnd(4 * hrs) || 0);
        if (p.species === 'rabbit' && atHome() && chance(0.1 * hrs)) { note(p.name + ' does a joyful binky across the floor. You can\'t help smiling.', 'up'); stress(-15); }
        if (p.species === 'ferret' && p.following && outdoors() && chance(0.06 * hrs)) { var c = 1 + Math.floor(Math.random() * 4); G.change && G.change('money', c); note(p.name + ' digs something shiny out of the leaves and drops it at your feet.', 'up'); }
      }
      // company: a happy pet at home eases stress
      if (p.status === 'home' && (atHome() || p.following) && p.happiness > 500 && !sleeping) stress(-rnd(3 * hrs) || 0);
    });
    // parrot blurts
    st.list.forEach(function (p) {
      if (p.species === 'parrot' && p.status === 'home' && p.words.length && (p.following || atHome()) && chance(0.03 * hrs * trait(p, 'mimic', 1))) {
        note(p.name + ' squawks: "' + pick(p.words) + '!"', 'info');
      }
    });
    // stray expires
    if (st.stray && (st.stray.until <= absMinutes() || st.stray.where !== hereId())) st.stray = null;
    warnings();
  }
  function absMinutes() { var t = G.time || {}; return ((t.day || 1) * 24 + (t.hour || 0)) * 60 + (t.minute || 0); }

  var warned = {};
  function warnings() {
    P().list.forEach(function (p) {
      if (p.status !== 'home') return;
      [['hunger', 250, 'is hungry'], ['thirst', 250, 'is thirsty'], ['hygiene', 200, 'needs cleaning'], ['happiness', 200, 'seems lonely and miserable']].forEach(function (w) {
        var key = p.id + w[0];
        if (p[w[0]] < w[1] && !warned[key]) { warned[key] = true; note(p.name + ' ' + w[2] + '.', 'down'); }
        if (p[w[0]] > w[1] + 100) delete warned[key];
      });
    });
  }

  // ---------- describing ----------
  function needWord(k, v) {
    var w = { hunger: ['Starving', 'Hungry', 'Peckish', 'Fed'], thirst: ['Parched', 'Thirsty', 'Fine', 'Hydrated'], energy: ['Exhausted', 'Tired', 'Lively', 'Bursting with energy'],
      hygiene: ['Filthy', 'Grubby', 'Clean enough', 'Spotless'], happiness: ['Miserable', 'Glum', 'Content', 'Joyful'], health: ['Very sick', 'Unwell', 'Healthy', 'Thriving'] }[k];
    return w[v < 200 ? 0 : v < 450 ? 1 : v < 750 ? 2 : 3];
  }
  function moodLine(p) {
    if (p.sick) return p.name + ' is curled up and listless, nose warm, not interested in much.';
    if (p.hunger < 250) return p.name + ' keeps looking from you to the empty bowl.';
    if (p.happiness < 250) return p.name + ' barely reacts when you come in.';
    if (p.hygiene < 200) return p.name + ' could really use a clean.';
    return p.name + ' ' + fill(pick(sp(p).idle), p) + '.';
  }
  function describe(p) {
    var t = tierOf(p.bond);
    return '<p><b>' + p.name + '</b>, your ' + p.breed + ' (' + p.traits.map(function (k) { return PERSONALITIES[k].label.toLowerCase(); }).join(', ') + '). ' + moodLine(p) + '</p>' +
      '<p>' + ['hunger', 'thirst', 'energy', 'hygiene', 'happiness', 'health'].map(function (k) { return '<b>' + k.charAt(0).toUpperCase() + k.slice(1) + ':</b> ' + needWord(k, p[k]); }).join(' · ') +
      '<br><b>Bond:</b> ' + t.label + '</p>';
  }

  // ---------- care actions ----------
  function careOptions(out) {
    var st = P(), pets = withYou(), home = atHome();
    if (!pets.length) return;
    pets.forEach(function (p) {
      var S = sp(p), x = pron(p);
      out.actions.push(opt('Spend time with ' + p.name, function () { return { text: describe(p), minutes: 2 }; }));
      if (p.hunger < 850 && st.supplies[S.food] > 0) out.actions.push(opt('Feed ' + p.name, function () {
        st.supplies[S.food]--; need(p, 'hunger', 600 * tb()); bond(p, rnd(8 * tb())); trainTending(2); hazelLikes(p, 1);
        return { text: '<p>You fill a dish for ' + p.name + '. ' + (has(p, 'greedy') ? x.S + ' inhales it before you have even straightened up.' : x.S + ' eats with quiet focus.') + '</p>', minutes: 5 };
      }));
      if (p.hunger < 850 && st.supplies[S.food] <= 0 && home) out.other.push(opt('You are out of ' + FOODS[S.food].label.split(' (')[0].toLowerCase() + ' for ' + p.name, function () { return { text: '<p>The bag is empty. Paws & Whiskers at the shopping centre sells more.</p>', minutes: 0 }; }, { time: false, disabled: true, hint: 'Buy food at the pet shop' }));
      out.actions.push(opt((p.lastPetDay === day() ? 'Cuddle ' : 'Pet ') + p.name, function () {
        var gain = rnd(15 * trait(p, 'pet', 1)), first = p.lastPetDay !== day();
        p.lastPetDay = day(); need(p, 'happiness', 120 * trait(p, 'pet', 1) * tb()); trainTending(1); bond(p, first ? gain + 10 : Math.max(2, rnd(gain / 3))); stress(-25);
        var line = has(p, 'independent') ? p.name + ' tolerates exactly four strokes, then walks off with dignity.' : has(p, 'affectionate') ? p.name + ' melts against you, ' + (p.species === 'cat' ? 'purring like an engine' : 'eyes half-closed') + '.' : p.name + ' leans into your hand.';
        return { text: '<p>' + line + '</p>', minutes: 10 };
      }));
      if (p.energy > 250 && !p.sick) out.actions.push(opt('Play with ' + p.name + (st.supplies.toy ? '' : ' (no toys yet)'), function () {
        var toy = st.supplies.toy > 0, m = trait(p, 'play', 1) * (toy ? 1.4 : 1);
        need(p, 'happiness', 220 * m * tb()); need(p, 'energy', -200); need(p, 'thirst', -80); bond(p, rnd(14 * m * tb())); stress(-30); trainTending(3);
        if (toy && chance(0.08)) { st.supplies.toy--; note(p.name + ' finally destroys a toy.', 'info'); }
        var lines = { dog: 'You toss a ball until your arm aches and ' + p.name + ' still wants more.', cat: 'You drag a string across the floor. ' + p.name + ' stalks it like a tiny tiger, then pounces.', rabbit: p.name + ' zooms around your legs and nudges a stacking cup over.', ferret: p.name + ' wrestles your hand, dooking with glee.', parrot: p.name + ' bobs and dances to the song you whistle.', hamster: 'You build a cardboard maze and ' + p.name + ' explores every tunnel.', lizard: 'You let ' + p.name + ' climb a branch across your desk. ' + x.S + ' seems pleased, in a lizard way.' };
        return { text: '<p>' + lines[p.species] + '</p>', minutes: 20 };
      }));
      if (home && p.hygiene < 750) out.actions.push(opt(p.species === 'axolotl' ? 'Change ' + p.name + '\'s tank water' : p.species === 'chinchilla' ? 'Give ' + p.name + ' a dust bath' : (st.supplies.groomkit ? 'Groom ' : 'Clean up after ') + p.name + (['cat', 'rabbit', 'hamster', 'lizard', 'hedgehog', 'tortoise', 'cornsnake'].indexOf(p.species) !== -1 ? ' and the habitat' : ''), function () {
        var kit = st.supplies.groomkit; need(p, 'hygiene', (kit ? 650 : 350) * tb()); bond(p, rnd((kit ? 8 : 3) * tb())); trainTending(kit ? 4 : 2); hazelLikes(p, 1);
        if (!kit) need(p, 'happiness', -20);
        return { text: '<p>' + (kit ? 'You brush ' + p.name + ' out properly and tidy the bedding. ' + x.S + ' looks almost smug.' : 'You do what you can with a damp cloth and fresh bedding. A grooming kit would make this easier.') + '</p>', minutes: kit ? 25 : 15 };
      }, { time: st.supplies.groomkit ? 25 : 15 }));
      if ((p.sick || p.happiness < 300 || p.health < 500) && p.soothedToday !== day()) out.actions.push(opt('Soothe ' + p.name, function () {
        p.soothedToday = day();
        if (chance(soothe())) { need(p, 'happiness', 150 * tb()); need(p, 'health', 60); bond(p, 10); trainTending(3); hazelLikes(p, 1);
          return { text: '<p>You sit with ' + p.name + ', speaking softly and moving slowly. Bit by bit ' + x.s + ' relaxes against you.</p>', minutes: 15 }; }
        trainTending(1); return { text: '<p>You try to calm ' + p.name + ', but ' + x.s + ' is too unsettled right now. Maybe later, or maybe the vet.</p>', minutes: 15 };
      }));
      // training
      var next = S.tricks.filter(function (t) { return (p.tricks[t] || 0) < 100; })[0];
      if (next && p.energy > 200 && !p.sick && tierIdx(p.bond) >= 1) out.actions.push(opt('Train ' + p.name + ': ' + next + ' (' + (p.tricks[next] || 0) + '%)', function () {
        var treat = st.supplies.treats > 0, g = (8 + tierIdx(p.bond) * 3) * tb();
        g *= trait(p, 'train', 1) * (treat ? trait(p, 'treat', 1.5) : 1);
        if (p.happiness < 300) g *= 0.5;
        if (treat) st.supplies.treats--;
        p.tricks[next] = clamp(rnd((p.tricks[next] || 0) + g), 0, 100);
        need(p, 'energy', -150); bond(p, 6); trainTending(5);
        if (p.tricks[next] >= 100) { note(p.name + ' learned a new trick: ' + next + '!', 'up'); memo(p, p.name + ' learned to ' + next.toLowerCase() + '.'); bond(p, 30); if (G.emit) G.emit('petTrick', { pet: p.id, trick: next }); return { text: '<p>On the tenth try it clicks. ' + p.name + ' does it perfectly, then looks at you like ' + x.s + ' knew all along. <b>' + next + '</b> learned.</p>', minutes: 20 }; }
        return { text: '<p>You practise <i>' + next.toLowerCase() + '</i> with ' + p.name + (treat ? ', rewarding every attempt with a treat' : '') + '. ' + pick(['Progress, slowly.', x.S + ' gets it once, then forgets.', x.S + ' tries very hard.', 'Mostly ' + x.s + ' just wants the treat.']) + '</p>', minutes: 20 };
      }));
      if (p.species === 'parrot' && p.words.length < WORDS.length && tierIdx(p.bond) >= 1) out.actions.push(opt('Teach ' + p.name + ' a word', function () {
        var w = pick(WORDS.filter(function (x) { return p.words.indexOf(x) === -1; }));
        if (chance(0.45 * trait(p, 'mimic', 1) + tierIdx(p.bond) * 0.08)) { p.words.push(w); bond(p, 8); return { text: '<p>You repeat "' + w + '" over and over. Then ' + p.name + ' tilts ' + x.p + ' head and says it back, perfectly.</p>', minutes: 15 }; }
        bond(p, 3); return { text: '<p>You say "' + w + '" a dozen times. ' + p.name + ' replies with a wolf whistle.</p>', minutes: 15 };
      }));
      if (p.sick && st.supplies.medicine > 0) out.actions.push(opt('Give ' + p.name + ' medicine', function () {
        st.supplies.medicine--; p.sick = false; p.neglect = 0; need(p, 'health', 150); bond(p, -5);
        return { text: '<p>' + p.name + ' does not appreciate the medicine one bit, but ' + x.s + ' perks up within the hour.</p>', minutes: 10 };
      }));
      // walks (dogs) or outings
      if (S.walks && p.following && outdoors() && p.energy > 200) out.actions.push(opt('Walk ' + p.name + ' around here', function () {
        p.lastWalkDay = day(); need(p, 'happiness', 300); need(p, 'energy', -250); need(p, 'thirst', -120); bond(p, 18); trainTending(4);
        if (G.stats && G.stats.train) G.stats.train('physique', 6);
        if (G.change) G.change('stats.needs.stress', -40);
        return { text: '<p>' + pick([p.name + ' sniffs every single lamppost like it holds the secrets of the universe.', p.name + ' trots ahead with ' + x.p + ' tail high, greeting every dog you pass.', 'You let ' + p.name + ' choose the route. It is a strange route, but ' + x.s + ' is delighted.']) + '</p>', minutes: 30 };
      }));
    });
    // bowls
    if (home && homePets().length) {
      var foodPet = homePets().filter(function (p) { return st.supplies[sp(p).food] > 0; })[0];
      if (st.bowls.water < 600) out.actions.push(opt('Fill the water bowl', function () { st.bowls.water = 1500; return { text: '<p>You rinse the bowl and fill it with fresh water.</p>', minutes: 2 }; }));
      if (st.bowls.food < 2 && foodPet) out.actions.push(opt('Top up the food bowl (2 meals)', function () {
        var f = sp(foodPet).food, n = Math.min(2, st.supplies[f]); st.supplies[f] -= n; st.bowls.food += n;
        return { text: '<p>You leave enough food out for later, so nobody goes hungry while you are in class.</p>', minutes: 2 };
      }));
    }
    // taking pets along
    if (home) homePets().forEach(function (p) {
      if (!sp(p).follow) return;
      if (p.following) out.other.push(opt('Leave ' + p.name + ' at home', function () { p.following = false; return { text: '<p>' + p.name + ' settles in to wait for you.</p>', minutes: 1 }; }));
      else if (canFollow(p)) out.other.push(opt('Bring ' + p.name + ' along', function () { p.following = true; return { text: '<p>' + (sp(p).follow === 'shoulder' ? p.name + ' hops onto your shoulder and grips on.' : sp(p).follow === 'pouch' ? p.name + ' scrambles into the pouch under your jacket and goes quiet.' : 'You clip on ' + p.name + '\'s ' + sp(p).follow + '. ' + pron(p).S + ' is already at the door.') + '</p>', minutes: 2 }; }));
      else out.other.push(opt('Bring ' + p.name + ' along (needs a ' + sp(p).follow + ')', function () { return { text: '', minutes: 0 }; }, { time: false, disabled: true, hint: 'Buy one at Paws & Whiskers' }));
    });
  }

  // ---------- shops ----------
  function shopOptions(out) {
    var st = P(), id = hereId();
    if (id === 'pet_store') {
      var room = activePets().length < capacity();
      Object.keys(SPECIES).forEach(function (k) {
        var S = SPECIES[k];
        if (S.exotic && !exoticsOpen()) return;
        var needsTank = ['lizard', 'axolotl', 'cornsnake'].indexOf(k) !== -1;
        if (room && needsTank && !dormHas('tank')) { out.other.push(opt('Adopt a' + (/^[aeiou]/i.test(S.label) ? 'n ' : ' ') + S.label.toLowerCase() + ' (needs a terrarium at home)', function () { return { text: '', minutes: 0 }; }, { time: false, disabled: true, hint: 'Hearth & Home sells a glass terrarium' })); return; }
        if (room) out.actions.push(opt('Adopt a' + (/^[aeiou]/i.test(S.label) ? 'n ' : ' ') + S.label.toLowerCase() + ' ($' + S.price + ')' + (S.exotic ? ' (exotic)' : ''), function () {
          if (money() < S.price) return { text: '<p>You look at the price tag, then at your wallet. Not today.</p>', minutes: 2 };
          spend(S.price);
          var p = newPet(k); p.name = askName(k, p.name); st.list.push(p); memo(p, 'You brought ' + p.name + ' home from Paws & Whiskers.');
          if (G.emit) G.emit('petAdopted', { pet: p.id, species: k });
          return { text: '<p>The clerk brings out a ' + p.breed + '. ' + p.name + ' ' + (has(p, 'shy') ? 'hides behind the clerk\'s ankles before peeking out at you.' : 'looks you over and decides you will do.') + ' You sign the forms, and ' + p.name + ' is coming home with you.</p><p>' + (S.follow ? 'You can bring ' + pron(p).o + ' out with you if you have a ' + S.follow + '.' : '') + ' Don\'t forget food: ' + FOODS[S.food].label.split(' (')[0].toLowerCase() + '.</p>' + describe(p), minutes: 30 };
        }, { time: 30, hint: S.label + ': ' + S.perk.label + ' perk at Devoted' }));
      });
      if (!room) out.other.push(opt('Adopt another pet (your dorm allows ' + capacity() + ')', function () { return { text: '', minutes: 0 }; }, { time: false, disabled: true, hint: hasPermit() ? 'Your room is full' : 'Get a pet permit at the dean\'s office' }));
      Object.keys(FOODS).forEach(function (f) {
        var owner = activePets().some(function (p) { return sp(p).food === f; });
        if (owner) out.actions.push(opt('Buy ' + FOODS[f].label + ' ($' + FOODS[f].price + ')', buy(function () { st.supplies[f] += FOODS[f].servings; }, FOODS[f].price, 'You heft the bag onto your hip.')));
      });
      if (activePets().length) Object.keys(SUPPLIES).forEach(function (k) {
        var s = SUPPLIES[k]; if (s.once && st.supplies[k]) return;
        if (k === 'leash' && !activePets().some(function (p) { return sp(p).follow === 'leash'; })) return;
        if (k === 'harness' && !activePets().some(function (p) { return sp(p).follow === 'harness'; })) return;
        if (k === 'pouch' && !activePets().some(function (p) { return sp(p).follow === 'pouch'; })) return;
        out.actions.push(opt('Buy ' + s.label + ' ($' + s.price + ')', buy(function () { if (s.once) st.supplies[k] = true; else st.supplies[k] += s.qty; }, s.price, k === 'toy' ? 'The clerk swears this one is indestructible.' : 'The clerk rings it up.')));
      });
      if (exoticsOpen() && !P().exoticsSeen) { P().exoticsSeen = true; note('The back room of Paws & Whiskers is open to you now: exotic animals are available.', 'up'); }
      out.dialogue.push(opt('Ask the clerk for pet advice', function () {
        return { text: '<p>"' + pick(['Dogs need walking every day, or they go stir-crazy.', 'Cats like routine. Same food, same time, and a clean litter tray.', 'Rabbits need company and space to hop. And hay, always hay.', 'Ferrets sleep eighteen hours a day and spend the other six causing trouble.', 'Parrots get bored. Talk to them. They will talk back eventually.', 'A vaccinated pet gets sick far less. The vet next door does it.', 'Treats make training go much faster.', 'Neglected animals run off. Then they turn up at the old mill or in the park, looking sorry for themselves.']) + '"</p>', minutes: 5 };
      }));
    }
    if (id === 'vet_clinic') {
      activePets().forEach(function (p) {
        out.actions.push(opt('Check-up for ' + p.name + ' ($25)', buy(function () { var was = p.sick; p.sick = false; p.neglect = 0; need(p, 'health', 400); bond(p, -3); return was; }, 25, 'The vet listens to ' + p.name + '\'s heart, checks ' + pron(p).p + ' ears, and declares ' + pron(p).o + ' ' + (p.sick ? 'treated and on the mend.' : 'in good shape.'))));
        if (!p.vaccinated) out.actions.push(opt('Vaccinate ' + p.name + ' ($30)', buy(function () { p.vaccinated = true; }, 30, p.name + ' gets a quick jab and a treat for being brave. Less chance of getting sick from now on.')));
      });
      out.actions.push(opt('Buy pet medicine ($15)', buy(function () { P().supplies.medicine++; }, 15, 'A small bottle with a dropper, for emergencies.')));
      if (!activePets().length) out.other.push(opt('Read the adoption notices', function () { return { text: '<p>The corkboard is covered in photos: a one-eyed cat called Admiral, a pair of rabbits who must go together, a dog "good with everyone except postmen".</p>', minutes: 5 }; }));
    }
  }
  function buy(fn, price, text) {
    var f = function () {
      if (money() < price) return { text: '<p>You don\'t have enough money for that.</p>', minutes: 1 };
      spend(price); fn(); trainTending(1);
      return { text: '<p>' + text + '</p>', minutes: 5 };
    };
    f.time = 5; return f;
  }

  // ---------- strays & runaways ----------
  // ---------- Hollowbrook Dog Pound: rescue adoptions, lost pets ----------
  function poundOptions(out) {
    var st = P(); if (hereId() !== 'dog_pound') return;
    var wk = Math.floor(day() / 7);
    if (!st.pound || st.pound.week !== wk) {
      st.pound = { week: wk, list: [0, 1, 2].map(function () { var k = chance(0.65) ? 'dog' : 'cat'; return { species: k, breed: (function (b) { return /\bold\b/.test(b) ? b : 'older ' + b; })(pick(SPECIES[k].breeds)), name: pick(NAMES) }; }) };
    }
    st.list.filter(function (p) { return p.status === 'runaway' && day() - (p.runawayDay || day()) >= 2; }).forEach(function (p) {
      out.actions.push(opt('Ask whether anyone has handed in ' + p.name + ' ($15 release fee)', function () {
        if (!chance(0.6)) return { text: '<p>The volunteer checks the book and the kennels. No ' + sp(p).label.toLowerCase() + ' matching ' + p.name + '. She takes your number in case one turns up.</p>', minutes: 15 };
        if (G.state.money < 15) return { text: '<p>' + p.name + ' is here! But the release fee is $15, and you don\'t have it. The volunteer says they will hold ' + pron(p).o + ' until tomorrow.</p>', minutes: 15 };
        if (G.change) G.change('money', -15);
        p.status = 'home'; p.neglect = 0; p.sick = false; p.health = Math.max(p.health, 600); p.happiness = 450; p.hunger = 700; p.thirst = 700; bond(p, -30);
        memo(p, 'You found ' + p.name + ' safe at the Hollowbrook Dog Pound after ' + pron(p).s + ' ran away.');
        if (G.emit) G.emit('petReturned', { pet: p.id });
        return { text: '<p>A volunteer leads you to the back kennels, and there is ' + p.name + ', clean and fed. ' + pron(p).S + ' spots you and goes still, then bolts into your arms.</p>', minutes: 20 };
      }, { time: 15 }));
    });
    out.actions.push(opt('Volunteer walking the kennel dogs (1 hour)', function () {
      stress(-30); trainTending(3); if (G.stats && G.stats.fame) G.stats.fame('kindness', 4);
      return { text: '<p>You take three very excited dogs around the block, one at a time. By the end your arms ache and your coat is covered in fur, and you feel good.</p>', minutes: 60 };
    }));
    st.pound.list.forEach(function (r, i) {
      if (!r) return;
      var full = activePets().length >= capacity();
      out.actions.push(opt('Adopt ' + r.name + ', ' + (/^[aeiou]/i.test(r.breed) ? 'an ' : 'a ') + r.breed + ' ($20 rescue fee)', function () {
        if (full) return { text: '<p>Your dorm can\'t take another pet right now.</p>', minutes: 1 };
        if (G.state.money < 20) return { text: '<p>The rescue fee is $20, which you don\'t have right now.</p>', minutes: 2 };
        if (G.change) G.change('money', -20);
        var p = newPet(r.species, { stray: true, breed: r.breed, name: r.name }); p.vaccinated = true; p.bond = 100; st.list.push(p);
        memo(p, 'You adopted ' + p.name + ' from the Hollowbrook Dog Pound. Nobody else had wanted ' + pron(p).o + '.');
        st.pound.list[i] = null;
        if (G.stats && G.stats.fame) G.stats.fame('kindness', 10);
        return { text: '<p>You sign the forms, and the volunteer hands over ' + p.name + ' with a vaccination card and a worn blanket. ' + pron(p).S + ' sniffs your hand, then leans against your leg.</p>', minutes: 30 };
      }, full ? { time: 30, disabled: true, hint: 'Your dorm is at its pet limit.' } : { time: 30 }));
    });
  }

  function strayOptions(out) {
    var st = P();
    if (st.stray && st.stray.where === hereId()) {
      var s = st.stray;
      if (activePets().length < capacity()) out.actions.push(opt('Take the stray ' + SPECIES[s.species].label.toLowerCase() + ' home', function () {
        var p = newPet(s.species, { stray: true, breed: s.breed }); p.name = askName(s.species, p.name); st.list.push(p); memo(p, 'You took ' + p.name + ' in off the street, cold and hungry.'); st.stray = null; p.following = false;
        if (G.stats && G.stats.fame) G.stats.fame('kindness', 15);
        if (G.emit) G.emit('petAdopted', { pet: p.id, species: p.species, stray: true });
        return { text: '<p>You scoop up the ' + s.breed + ' and carry ' + pron(p).o + ' home. ' + p.name + ' is thin and grubby, but ' + pron(p).s + ' falls asleep in your arms before you reach the dorm. A vet check-up would be a good idea.</p>', minutes: 25 };
      }));
      out.actions.push(opt('Share some food with the stray', function () {
        st.stray.fed = true; if (G.stats && G.stats.fame) G.stats.fame('kindness', 5);
        return { text: '<p>You crouch down and offer a bit of your snack. The ' + s.breed + ' takes it carefully, then sits a little closer.</p>', minutes: 5 };
      }));
    }
    // search for runaways
    st.list.filter(function (p) { return p.status === 'runaway'; }).forEach(function (p) {
      if (['park', 'old_mill', 'woods', 'residential', 'alley', 'campus_farm'].indexOf(hereId()) === -1) return;
      out.actions.push(opt('Search for ' + p.name, function () {
        var aw = (G.stats && G.stats.effective) ? G.stats.effective('awareness') : 200;
        var odds = 0.15 + aw / 2500 + (p.bond / 4000) + (day() - p.runawayDay) * 0.03;
        if (chance(odds)) {
          p.status = 'home'; p.neglect = 0; p.happiness = 400; p.hunger = Math.max(p.hunger, 300); p.thirst = Math.max(p.thirst, 300); p.hygiene = 150; bond(p, -60);
          if (G.emit) G.emit('petReturned', { pet: p.id });
          return { text: '<p>You call ' + p.name + '\'s name for the hundredth time, and something rustles. ' + p.name + ' creeps out, muddy and hungry, and lets you pick ' + pron(p).o + ' up. You promise to do better.</p>', minutes: 45 };
        }
        return { text: '<p>You search under hedges and behind bins, calling ' + p.name + '\'s name. Nothing yet, but someone mentions seeing a ' + p.breed + ' around ' + pick(['the park', 'the old mill', 'Elm Row', 'the woods']) + '.</p>', minutes: 45 };
      }));
    });
  }

  // ---------- restrictions & reactions on arrival ----------
  function onArrive(data) {
    var f = following(); if (!f.length) return;
    var id = (data && data.location) || hereId();
    f.forEach(function (p) {
      if (NO_PETS.indexOf(id) !== -1) {
        note('Pets aren\'t allowed in here. Someone gives ' + p.name + ' a pointed look.', 'down');
        if (G.change) G.change('stats.needs.stress', 15);
        if (G.emit) G.emit('petInRestricted', { pet: p.id, where: id });
      } else if (outdoors() && chance(0.35)) {
        var wx = (G.state.world && G.state.world.weather) || '';
        if (/rain|storm|drizzle/.test(wx)) { need(p, 'hygiene', -120); need(p, 'happiness', -40); note(p.name + ' gives the rain a deeply betrayed look.', 'info'); }
        else if (/snow/.test(wx) && p.species === 'dog') { need(p, 'happiness', 80); note(p.name + ' plunges nose-first into the snow and comes up delighted.', 'up'); }
        else { need(p, 'happiness', 30); note(p.name + ' ' + pick(['looks around with bright, curious eyes.', 'gets cooed at by a passer-by.', 'is very interested in a nearby pigeon.']), 'info'); }
      }
    });
  }

  // ---------- world events ----------
  function addEvents() {
    if (!G.world || !G.world.addEvent || G._petEventsAdded) return;
    G._petEventsAdded = true;
    G.world.addEvent({ id: 'stray_animal', where: ['park', 'alley', 'residential', 'old_mill', 'campus_farm', 'main_street'], chance: 0.025,
      when: function () { return !P().stray; },
      run: function () {
        var k = pick(['cat', 'cat', 'dog', 'dog', 'rabbit', 'ferret']), breed = pick(SPECIES[k].breeds);
        P().stray = { species: k, breed: breed, where: hereId(), until: absMinutes() + 120 };
        return { text: 'A thin ' + breed + ' with no collar is watching you from ' + pick(['under a bench', 'beside the bins', 'the shadow of a doorway', 'the long grass']) + '. It hasn\'t eaten in a while, by the look of it.' };
      } });
    G.world.addEvent({ id: 'pet_compliment', where: ['*outdoor'], chance: 0.08, when: function () { return following().length > 0; },
      run: function () { var p = pick(following()); need(p, 'happiness', 60); if (G.stats && G.stats.fame) G.stats.fame('socialite', 2);
        return { text: 'A ' + pick(['little kid', 'retired couple', 'jogger', 'student from your year']) + ' stops to fuss over ' + p.name + '. "What a sweetheart!" ' + p.name + ' laps up the attention.' }; } });
    G.world.addEvent({ id: 'pet_mischief', where: ['dorm_room'], chance: 0.1, when: function () { return homePets().some(function (p) { return has(p, 'mischievous') || p.species === 'ferret' || p.species === 'cat'; }); },
      run: function () { var p = pick(homePets()); return { text: pick(['Your charging cable has been chewed. ' + p.name + ' is suspiciously far away from it.', 'Something is missing. You find it, eventually, inside ' + p.name + '\'s bed.', p.name + ' has knocked your mug off the desk. ' + pron(p).S + ' regrets nothing.']) }; } });
    G.world.addEvent({ id: 'runaway_sighting', where: ['main_street', 'quad', 'park', 'residential'], chance: 0.15, when: function () { return P().list.some(function (p) { return p.status === 'runaway'; }); },
      run: function () { var p = pick(P().list.filter(function (x) { return x.status === 'runaway'; })); return { text: 'A poster on a lamppost catches your eye. Someone has written underneath: "Saw a ' + p.breed + ' near ' + pick(['the old mill', 'Millpond Park', 'Elm Row', 'Hollow Woods']) + '." Could it be ' + p.name + '?' }; } });
  }

  function addVet() {
    if (!G.world || !G.world.addLocation || !G.world.LOCATIONS || G.world.LOCATIONS.vet_clinic) return;
    var hub = G.world.LOCATIONS.shopping_centre ? 'shopping_centre' : 'main_street';
    G.world.addLocation('vet_clinic', { name: 'Brookside Vet Clinic', district: G.world.LOCATIONS.shopping_centre ? 'Shopping Centre' : 'Town', indoor: true, open: [8, 19], restroom: true,
      desc: 'A small clinic that smells of disinfectant and dog biscuits. A waiting-room cat supervises from the counter.', tags: ['public'] }, [[hub, 2]]);
  }

  // ---------- options entry ----------
  function getOptions() {
    var out = { dialogue: [], actions: [], travel: [], other: [] };
    if (!P()) return out;
    careOptions(out); shopOptions(out); strayOptions(out); showOptions(out); poundOptions(out);
    return out;
  }

  // ---------- Sunday pet show (park, 11:00-15:00) ----------
  function showScore(p) {
    var learned = sp(p).tricks.filter(function (x) { return (p.tricks[x] || 0) >= 100; }).length;
    return p.bond / 12 + p.hygiene / 20 + p.happiness / 25 + p.health / 40 + learned * 14 + (p.rare ? 25 : 0) + tending() / 25 + (lifeStage(p) === 'young' ? 8 : 0) + Math.random() * 40;
  }
  function showOptions(out) {
    var st = P(), t = G.time; if (!t || hereId() !== 'park' || t.weekdayIndex !== 6 || t.hour < 11 || t.hour >= 15) return;
    var wk = Math.floor(day() / 7);
    var with_ = activePets().filter(function (p) { return p.following && !p.sick; });
    if (st.lastShowWeek === wk) { out.other.push(opt('Watch the pet show judging', function () { return { text: '<p>You watch the judges peer at a very serious basset hound. The crowd cheers when a rabbit does a perfect hop.</p>', minutes: 20 }; })); return; }
    if (!with_.length) { out.other.push(opt('Watch the Sunday pet show', function () { stress(-20); return { text: '<p>A ring of bunting, a folding table of ribbons and a dozen proud owners. Next week you could bring a companion of your own and enter.</p>', minutes: 20 }; })); return; }
    with_.forEach(function (p) {
      out.actions.push(opt('Enter ' + p.name + ' in the Sunday pet show ($5)', function () {
        if (G.state.money < 5) return { text: '<p>The entry fee is $5. You don\'t have it on you.</p>', minutes: 1 };
        if (G.change) G.change('money', -5); st.lastShowWeek = wk; trainTending(4);
        var me = showScore(p), rivals = [0, 0, 0, 0, 0].map(function () { return 40 + Math.random() * 110; }).sort(function (a, b) { return b - a; });
        var place = 1 + rivals.filter(function (r) { return r > me; }).length, x = pron(p);
        var prize = { 1: 40, 2: 20, 3: 10 }[place] || 0, ribbon = { 1: 'blue ribbon (1st)', 2: 'red ribbon (2nd)', 3: 'yellow ribbon (3rd)' }[place];
        need(p, 'happiness', 100); bond(p, place <= 3 ? 20 : 8);
        var txt = '<p>You and ' + p.name + ' wait your turn in the ring. The judge checks ' + x.p + ' coat, asks to see a trick, and scribbles on a clipboard.</p>';
        if (ribbon) {
          if (G.change) G.change('money', prize);
          if (G.stats && G.stats.fame) G.stats.fame('socialite', place === 1 ? 15 : 6);
          if (!p.ribbons) p.ribbons = []; p.ribbons.push(ribbon); memo(p, p.name + ' won a ' + ribbon + ' at the Sunday pet show.');
          if (sp(p).exotic) hazelLikes(p, 2);
          txt += '<p>When the results come in, ' + p.name + ' takes the <b>' + ribbon + '</b>' + (prize ? ' and $' + prize + ' in prize money' : '') + '. People stop to say congratulations.</p>';
          if (G.emit) G.emit('petShowWin', { pet: p.id, place: place });
        } else txt += '<p>' + p.name + ' places ' + place + 'th out of six. No ribbon this time, but ' + x.s + ' got a lot of attention and seems very pleased with ' + x.r + '. Better grooming and more tricks would help next week.</p>';
        return { text: txt, minutes: 90 };
      }));
    });
  }

  // ---------- Companions tab ----------
  function bar(v) { var pct = clamp(v / 10, 0, 100), c = pct < 25 ? 'bad' : pct < 50 ? 'warn' : 'ok'; return '<div class="stat-bar ' + c + '"><span style="width:' + pct.toFixed(0) + '%"></span></div>'; }
  function tab() {
    var st = P(); if (!st) return '<p>Nothing yet.</p>';
    var h = ['<h3>Companions</h3><p class="flavor">The animals who share your life. Feed them, play with them, and they will make Hollowbrook feel like home. Your dorm allows ' + capacity() + ' pet' + (capacity() > 1 ? 's' : '') + (hasPermit() ? ' (permit approved)' : '; a permit from the dean\'s office allows a second') + '.</p>'];
    if (!st.list.length) h.push('<p class="flavor">No companions yet. Paws & Whiskers in the shopping centre has animals for adoption, and strays sometimes turn up around town.</p>');
    st.list.forEach(function (p) {
      var S = sp(p), t = tierOf(p.bond), learned = S.tricks.filter(function (x) { return (p.tricks[x] || 0) >= 100; });
      h.push('<div class="pet-card"><h4>' + p.name + ' <small>' + S.label + ', ' + p.breed + (p.stray ? ', rescued' : '') + (p.rare ? ', <b>rare</b>' : '') + '</small></h4>' + (p.ribbons && p.ribbons.length ? '<p>Ribbons: ' + p.ribbons.join(', ') + '</p>' : ''));
      if (p.status === 'runaway') { h.push('<p class="flavor">Missing since day ' + p.runawayDay + '. Search the park, Elm Row, the old mill or the woods.</p></div>'); return; }
      h.push('<p class="flavor">' + moodLine(p) + '</p>');
      if (QUIRKS[p.species]) h.push('<p class="flavor">Care notes: ' + QUIRKS[p.species] + '</p>');
      h.push('<p>Life stage: ' + { young: 'Young and full of energy', adult: 'Grown up', senior: 'Getting on in years. Gentle walks and warm beds' }[lifeStage(p)] + '. With you ' + (day() - p.adoptedDay) + ' day(s).</p>');
      h.push('<p>Personality: ' + p.traits.map(function (k) { return '<b>' + PERSONALITIES[k].label + '</b> (' + PERSONALITIES[k].desc + ')'; }).join(', ') + '</p>');
      ['hunger', 'thirst', 'energy', 'hygiene', 'happiness', 'health'].forEach(function (k) { h.push('<div class="char-row"><b>' + k.charAt(0).toUpperCase() + k.slice(1) + '</b>: ' + needWord(k, p[k]) + bar(p[k]) + '</div>'); });
      h.push('<div class="char-row"><b>Bond</b>: ' + t.label + ' (' + rnd(p.bond) + '/1000)' + bar(p.bond) + '</div>');
      h.push('<p>Tricks: ' + S.tricks.map(function (x) { var v = p.tricks[x] || 0; return v >= 100 ? '<b>' + x + '</b>' : x + ' ' + v + '%'; }).join(', ') + '</p>');
      if (p.species === 'parrot') h.push('<p>Words: ' + (p.words.length ? p.words.map(function (w) { return '"' + w + '"'; }).join(', ') : 'none yet') + '</p>');
      if (p.memories && p.memories.length) h.push('<details><summary>Memories with ' + p.name + '</summary><ul>' + p.memories.slice().reverse().map(function (m) { return '<li>Day ' + m.day + ': ' + m.text + '</li>'; }).join('') + '</ul></details>');
      h.push('<p>Perk, ' + S.perk.label + ': ' + fill(S.perk.desc, p) + (tierIdx(p.bond) >= 4 ? ' <b>(active)</b>' : ' <i>(unlocks at Devoted)</i>') + '</p>');
      h.push('<p class="flavor">' + (p.sick ? 'Sick: take ' + pron(p).o + ' to the vet or give medicine. ' : '') + (p.vaccinated ? 'Vaccinated. ' : 'Not vaccinated. ') + (p.following ? 'Out with you.' : 'At home.') + (learned.length ? ' Knows ' + learned.length + ' trick' + (learned.length > 1 ? 's' : '') + '.' : '') + '</p></div>');
    });
    var s = st.supplies, inv = [];
    Object.keys(FOODS).forEach(function (f) { if (s[f]) inv.push(FOODS[f].label.split(' (')[0] + ': ' + s[f] + ' meals'); });
    if (s.treats) inv.push('Treats: ' + s.treats); if (s.toy) inv.push('Toys: ' + s.toy); if (s.medicine) inv.push('Medicine: ' + s.medicine);
    ['groomkit', 'leash', 'harness'].forEach(function (k) { if (s[k]) inv.push(SUPPLIES[k].label); });
    h.push('<h4>Supplies</h4><p>' + (inv.length ? inv.join(' · ') : 'Nothing stocked.') + '</p><p>Bowls at home: ' + st.bowls.food + ' meal' + (st.bowls.food === 1 ? '' : 's') + ' of food, ' + (st.bowls.water > 0 ? 'water filled' : 'water empty') + '.</p>');
    return h.join('');
  }

  // ---------- public API ----------
  G.pets = {
    SPECIES: SPECIES, PERSONALITIES: PERSONALITIES, BOND_TIERS: BOND_TIERS,
    list: function () { return P() ? P().list.slice() : []; },
    active: function () { return P() ? activePets() : []; },
    following: function () { return P() ? following() : []; },     // pets out with the player right now
    withYou: function () { return P() ? withYou() : []; },          // pets in the same place as the player
    has: function (species) { return !!P() && activePets().some(function (p) { return !species || p.species === species; }); },
    bondTier: function (p) { return tierOf(p.bond).key; },
    perk: function (id) { return !!P() && activePets().some(function (p) { return p.status === 'home' && tierIdx(p.bond) >= 4 && sp(p).perk.id === id && (id === 'nightPurr' || id === 'zen' || id === 'studyBuddy' || id === 'binky' || p.following); }); },
    // Roy: a one-line description for NPC reactions, e.g. "a scruffy terrier mix called Biscuit"
    describeShort: function (p) { return 'a ' + p.breed + ' called ' + p.name; },
    pronouns: pron,
    addBond: function (petId, d) { var p = P().list.filter(function (x) { return x.id === petId; })[0]; if (p) bond(p, d); },
    addHappiness: function (petId, d) { var p = P().list.filter(function (x) { return x.id === petId; })[0]; if (p) need(p, 'happiness', d); },
    allowedHere: function (id) { return NO_PETS.indexOf(id || hereId()) === -1; },
    // Ted: G.pets.care(id, 'happiness'|'hunger'|'energy'|'bond'|'hygiene'|'thirst'|'health', delta)
    care: function (petId, key, d) { var p = P().list.filter(function (x) { return x.id === petId; })[0]; if (!p) return; if (key === 'bond') bond(p, d); else if (p[key] !== undefined) need(p, key, d); },
    // Roy: call when the pet shop keeper trusts the player enough
    unlockExotics: function () { if (P() && !P().exotics) { P().exotics = true; note('You now have access to the exotic animals at Paws & Whiskers.', 'up'); if (G.emit) G.emit('exoticsUnlocked'); } },
    exoticsUnlocked: function () { return exoticsOpen(); },
    EXOTIC: Object.keys(EXOTIC)
  };

  function boot() {
    if (!window.G || !G.register) return setTimeout(boot, 20);
    G.register({
      id: 'pets',
      init: function (state) {
        var f = fresh();
        if (G.on && !G._petsPermitHooked) { G._petsPermitHooked = true; G.on('petPermit', function () { if (P()) { P().permit = true; note('Your dorm now allows two pets.', 'up'); } }); }
        if (!state.pets) state.pets = f; else for (var k in f) if (state.pets[k] === undefined) state.pets[k] = f[k];
        for (var s in f.supplies) if (state.pets.supplies[s] === undefined) state.pets.supplies[s] = f.supplies[s];
        addVet(); addEvents();
        if (G.on && !G._petsHooked) { G._petsHooked = true; G.on('arrive', onArrive); ['exoticsUnlocked', 'exoticUnlocked'].forEach(function (e) { G.on(e, function () { if (P()) P().exotics = true; }); }); }
        if (G.addTab) G.addTab({ id: 'companions', label: 'Companions', order: 35, render: tab });
      },
      onTick: function (m) { onTick(m); },
      getOptions: getOptions
    });
  }
  boot();
})();
