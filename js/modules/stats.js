/* stats.js — Hollowbrook College: player condition, characteristics, skills,
   traits, attitudes, transformations, clothing, character-menu tabs.
   Owner: Jimmy. Talks to the engine only through window.G (see CONTRACT.md). */
(function () {
  'use strict';

  // ---------- constants ----------
  var TIERS = ['F', 'F+', 'D', 'D+', 'C', 'C+', 'B', 'B+', 'A', 'A+', 'S'];
  var MAX = 1000;

  var NEEDS_INFO = {
    fatigue: { label: 'Fatigue', flavor: 'How worn out you are. Sleep is the only real cure.' },
    stress:  { label: 'Stress',  flavor: 'The weight on your shoulders. High stress makes everything else drain faster.' },
    control: { label: 'Control', flavor: 'How well you can hold it together, bladder and bowels included. It shifts slowly.' },
    bladder: { label: 'Bladder', flavor: 'How badly you need a restroom.' },
    bowels:  { label: 'Bowels',  flavor: 'Slower than your bladder, but just as insistent in the end.' },
    thirst:  { label: 'Thirst',  flavor: 'How hydrated you are. Full is good; empty means you collapse.' },
    hunger:  { label: 'Hunger',  flavor: 'How fed you are. Full is good; empty means you collapse.' }
  };

  var CORE = {
    beauty:    { label: 'Beauty',    flavor: ['Plain, and nobody looks twice.', 'You clean up all right.', 'People notice you when you walk in.', 'Heads turn. You have a presence.', 'Strikingly attractive; it opens doors.'] },
    physique:  { label: 'Physique',  flavor: ['The stairs to the library leave you winded.', 'Reasonably fit for a student.', 'Toned, and you can keep a pace.', 'Strong and quick; the track team asks about you.', 'You are in peak condition.'] },
    willpower: { label: 'Willpower', flavor: ['You fold under the smallest pressure.', 'You can push through a boring lecture.', 'Steady. Temptation has to work for it.', 'Hard to rattle, hard to talk out of things.', 'Iron resolve.'] },
    awareness: { label: 'Awareness', flavor: ['The world mostly happens around you.', 'You catch the obvious.', 'You notice details others miss.', 'Little escapes you: a glance, a lie, a loose wallet.', 'You read rooms like books.'] }
  };

  var SKILLS = {
    skulduggery: { label: 'Skulduggery', flavor: 'Light fingers and a calm face. Used for petty theft.' },
    tending:     { label: 'Tending',     flavor: 'Care for plants and animals on the farm plots.' },
    athletics:   { label: 'Athletics',   flavor: 'Running, climbing, keeping up.' },
    charm:       { label: 'Charm',       flavor: 'Saying the right thing at the right time.' },
    cooking:     { label: 'Cooking',     flavor: 'Turning groceries into meals that are cheaper than takeout.' },
    housekeeping:{ label: 'Housekeeping',flavor: 'Laundry, mending, keeping your room livable.' }
  };

  // Traits: granted when requirements are met, lost when they stop being met.
  var TRAITS = [
    { id: 'charming', hint: 'Raise Beauty to B. Grooming, showers and looking after your clothes help.',    label: 'Charming',      desc: 'Beauty B or higher: NPC first impressions start warmer.', req: function (s) { return tierIdx(s.core.beauty.value) >= 6; } },
    { id: 'athletic', hint: 'Raise Physique to B. Work out at the gym or go jogging outdoors.',    label: 'Athletic',      desc: 'Physique B or higher: fatigue builds 10% slower.',        req: function (s) { return tierIdx(s.core.physique.value) >= 6; } },
    { id: 'steady', hint: 'Raise Willpower to B. Meditating and pushing through hard days help.',      label: 'Steady Nerves', desc: 'Willpower B or higher: stress gains reduced by 15%.',     req: function (s) { return tierIdx(s.core.willpower.value) >= 6; } },
    { id: 'sharpEyed', hint: 'Raise Awareness to B. People-watch in busy places and pay attention around town.',   label: 'Sharp-eyed',    desc: 'Awareness B or higher: you spot extra options and events.', req: function (s) { return tierIdx(s.core.awareness.value) >= 6; } },
    { id: 'ironBladder', hint: 'Get Control to 900. Stay calm and avoid accidents; it climbs slowly when stress is low.', label: 'Iron Bladder',  desc: 'Control 900+: you can hold it right up to the limit.',    req: function (s) { return s.needs.control >= 900; } },
    { id: 'lightFingers', hint: 'Reach Skulduggery C by practising petty theft (carefully).',label: 'Light Fingers', desc: 'Skulduggery C or higher: thefts are less likely to be noticed.', req: function (s) { return tierIdx(s.skills.skulduggery) >= 4; } },
    { id: 'greenThumb', hint: 'Reach Tending C by working the farm plots and caring for the animals.',  label: 'Green Thumb',   desc: 'Tending C or higher: crops grow faster and animals calm quicker.', req: function (s) { return tierIdx(s.skills.tending) >= 4; } },
    { id: 'nightOwl', hint: 'Be awake past 1am on five different nights.', label: 'Night Owl', desc: 'Late nights come easy: fatigue builds 15% slower after 10pm.', req: function (s) { return rec(s).lateNights >= 5; } },
    { id: 'earlyBird', hint: 'Be up and about before 7am on five different days.', label: 'Early Bird', desc: 'Mornings suit you: stress eases twice as fast before noon.', req: function (s) { return rec(s).earlyRises >= 5; } },
    { id: 'resilient', hint: 'Get over a head cold.', label: 'Resilient', desc: 'You shake off illness: half the chance of catching a cold.', req: function (s) { return rec(s).coldsBeaten >= 1; } },
    { id: 'animalFriend', hint: 'Raise any companion to Devoted.', label: 'Animal Friend', desc: 'Animals warm to you: pet bond grows 20% faster.', req: function () { try { return !!(G.pets && G.pets.list().some(function (p) { return p.bond >= 850; })); } catch (e) { return false; } } },
    { id: 'gymRat', hint: 'Finish 20 workouts at the gym.', label: 'Gym Regular', desc: 'Workouts tire you 30% less, and you never get sore.', req: function (s) { return rec(s).workouts >= 20; } },
    { id: 'castIron', hint: 'Get over a bout of food poisoning.', label: 'Cast-iron Stomach', desc: 'Dodgy food rarely gets you: food poisoning is much less likely.', req: function (s) { return rec(s).poisoningsBeaten >= 1; } },
    { id: 'homeCook', hint: 'Reach Cooking C by making meals at home.', label: 'Home Cook', desc: 'Meals you cook at home fill you up 25% more and ease stress.', req: function (s) { return tierIdx(s.skills.cooking || 0) >= 4; } },
    { id: 'socialButterfly', hint: 'Become known around campus as a socialite (Socialite fame 200).', label: 'Social Butterfly', desc: 'Busy public places calm you instead of draining you.', req: function (s) { return s.status.socialiteFame >= 200; } },
    { id: 'goodSamaritan', hint: 'Become known for helping people (Kindness fame 200).', label: 'Good Samaritan', desc: 'People trust you: strangers and NPCs react more warmly to you.', req: function (s) { return s.status.kindnessFame >= 200; } },
    { id: 'streetwise', hint: 'Spend 15 evenings out in the alley, bar or docks.', label: 'Streetwise', desc: 'You read rough places well: you are harder to pickpocket and spot trouble sooner.', req: function (s) { return rec(s).nightsOut >= 15; } },
    { id: 'wellRested', hint: 'Sleep seven hours or more in one go.',  label: 'Well Rested',   desc: 'Slept a full night: willpower checks +5% today.',         req: function (s) { return !!s.flags.sleptFull; } }
  ];

  // Attitudes: -100 (hates it) .. +100 (comfortable). Shift slowly with repetition.
  var ATTITUDES = {
    flirting:     { label: 'Flirting',          low: 'Mortifying', high: 'Second nature' },
    theft:        { label: 'Theft',             low: 'Wrong',      high: 'Just business' },
    publicSpeech: { label: 'Speaking up',       low: 'Terrifying', high: 'Easy' },
    hardWork:     { label: 'Hard work',         low: 'A chore',    high: 'Satisfying' },
    rulebreaking: { label: 'Breaking rules',    low: 'Unthinkable',high: 'Whatever' },
    publicRestroom:{ label: 'Public restrooms', low: 'Avoid them',  high: 'No big deal' },
    exercise:     { label: 'Exercise',          low: 'Dreaded',    high: 'Energising' },
    crowds:       { label: 'Crowds',            low: 'Draining',   high: 'Lively' },
    spending:     { label: 'Spending money',    low: 'Painful',    high: 'Easy come, easy go' },
    animals:      { label: 'Animals',           low: 'Nervous',    high: 'Love them' },
    nightlife:    { label: 'Nightlife',         low: 'Not for you', high: 'Where you come alive' }
  };

  // Transformations: subtle folklore, never monstrous. Stages 0..3. Triggered by npcs.js etc.
  var TRANSFORMS = {
    fox:   { label: 'Fox-touched', stages: ['', 'Your eyes catch the light with an amber sheen.', 'Your hearing has sharpened; you hear whispers across a room.', 'You walk with a fox\'s quiet grace, and your hair has a russet streak.'], bonus: { awareness: 40 } },
    fae:   { label: 'Fae-kissed',  stages: ['', 'There is a faint shimmer to your skin in moonlight.', 'Flowers seem to lean toward you.', 'People find you hard to look away from, and harder to lie to.'], bonus: { beauty: 40 } },
    river: { label: 'River-blessed', stages: ['', 'Cold water never seems to bother you.', 'You can hold your breath far longer than you should.', 'Rain feels like a friend; you dry off unnaturally fast.'], bonus: { physique: 40 } }
  };

  // ---------- helpers ----------
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function tierIdx(v) { return clamp(Math.floor(v / 91), 0, 10); }
  function tier(v) { return TIERS[tierIdx(v)]; }
  // Coloured letter grade: F (red) up to A+ (green), S in gold. Inline colour so it works without extra CSS.
  var TIER_COLORS = ['#c0392b', '#d35400', '#e67e22', '#e69a22', '#d4ac0d', '#b7b51f', '#8db600', '#5cae2e', '#27ae60', '#1e9e70', '#d4a017'];
  function tierColor(v) { return TIER_COLORS[tierIdx(v)]; }
  function tierHTML(v) {
    var i = tierIdx(v);
    return '<span class="tier grade-' + i + (i === 10 ? ' grade-s' : '') + '" style="color:' + TIER_COLORS[i] + ';font-weight:bold' + (i === 10 ? ';text-shadow:0 0 4px rgba(212,160,23,.6)' : '') + '">' + TIERS[i] + '</span>';
  }

  // Need wording: level 0 (fine) to 6 (critical). HIGH_BAD needs get worse as they rise; the rest as they fall.
  var HIGH_BAD = { fatigue: 1, stress: 1, bladder: 1, bowels: 1 };
  var NEED_WORDS = {
    fatigue: ['Wide awake', 'Alert', 'A little tired', 'Tired', 'Very tired', 'Exhausted', 'About to drop'],
    stress:  ['Calm', 'Relaxed', 'A bit tense', 'Stressed', 'Very stressed', 'Overwhelmed', 'At breaking point'],
    control: ['Composed', 'Steady', 'Holding together', 'A bit shaky', 'Struggling', 'Slipping', 'Barely holding on'],
    bladder: ['Empty', 'Fine', 'You could go', 'You need to go soon', 'You need to go badly', 'Desperate', 'You can\'t hold it much longer'],
    bowels:  ['Empty', 'Fine', 'A little full', 'You need to go soon', 'You need to go badly', 'Desperate', 'You can\'t hold it much longer'],
    thirst:  ['Hydrated', 'Quenched', 'A little thirsty', 'Thirsty', 'Very thirsty', 'Parched', 'Dangerously dehydrated'],
    hunger:  ['Full', 'Satisfied', 'Peckish', 'Hungry', 'Very hungry', 'Starving', 'Faint with hunger']
  };
  function needValue(id, value) {
    if (value !== undefined && value !== null) return +value;
    var n = (G.state && G.state.stats && G.state.stats.needs) || {};
    return n[id] || 0;
  }
  function needLevel(id, value) {
    var v = clamp(needValue(id, value), 0, MAX);
    var bad = HIGH_BAD[id] ? v : MAX - v;
    return clamp(Math.floor(bad / MAX * 7), 0, 6);
  }
  function needWords(id, value) {
    var w = NEED_WORDS[id]; if (!w) return { text: '', level: 0, toString: function () { return ''; } };
    var lv = needLevel(id, value), t = w[lv];
    try { if ((id === 'bladder' || id === 'bowels') && lv >= 5 && (value === undefined || value === null || Math.abs(+value - S().needs[id]) < 1.5) && holdingFor(id)) t = 'Holding it in'; } catch (e) {}
    return { text: t, level: lv, toString: function () { return t; } };
  }

  // Difficulty labels for a check(stat, base) roll: success chance = (value + 500 - base) / 1000.
  var DIFF_LABELS = ['Very Hard', 'Hard', 'Challenging', 'Reasonable', 'Easy', 'Simple'];
  // ---------- creation: body size and background (creation.js sets player.bodySize / player.background) ----------
  function player() { return (G.state.creation && G.state.creation.player) || {}; }
  function bodySize() { var b = String(player().bodySize || player().size || 'average').toLowerCase(); return b === 'small' || b === 'large' ? b : 'average'; }
  var PHYSICAL = { physique: 1, athletics: 1 };
  // Small makes physical checks harder, large easier (a difficulty dial). Used for shoving through crowds,
  // fending off a pickpocket, sports and carrying. There are no fights in Hollowbrook.
  function sizeMod() { return { small: -100, average: 0, large: 100 }[bodySize()]; }
  function carryMult() { return { small: 0.85, average: 1, large: 1.15 }[bodySize()]; }
  var BACKGROUNDS = {
    waif:       { core: { beauty: 40, physique: 40, willpower: 40, awareness: 40 }, skills: { housekeeping: 60, cooking: 60 } },
    nerd:       { core: { awareness: 160, willpower: 120, physique: -60 }, skills: { charm: -40 }, attitudes: { publicSpeech: -20, crowds: -15 } },
    athlete:    { core: { physique: 260, willpower: 40, awareness: -40 }, skills: { athletics: 260 }, attitudes: { exercise: 40 }, workouts: 10 },
    delinquent: { core: { awareness: 80, willpower: -40 }, skills: { skulduggery: 220, charm: 40 }, status: { crime: 150 }, attitudes: { theft: 60, rulebreaking: 70 } },
    beautiful:  { core: { beauty: 320 }, skills: { charm: 260 }, needs: { stress: 150 }, status: { socialiteFame: 80 }, attention: 1.25 }
  };
  // Old background ids from earlier saves map onto the new list.
  var BG_ALIAS = { scholarship: 'nerd', local: 'waif', farmhand: 'athlete', streetwise: 'delinquent', comfortable: 'waif' };
  function backgroundId() { var b = player().background || 'waif'; b = BG_ALIAS[b] || b; return BACKGROUNDS[b] ? b : 'waif'; }
  function attentionMult() { return BACKGROUNDS[backgroundId()].attention || 1; }
  function applyBackground() {
    var s = S(); if (s.flags.bgApplied) return;
    var bg = BACKGROUNDS[backgroundId()]; s.flags.bgApplied = backgroundId();
    Object.keys(bg.core || {}).forEach(function (k) { var c = s.core[k]; if (!c) return; c.value = clamp(c.value + bg.core[k], 0, MAX); c.base = clamp(c.base + bg.core[k], 0, MAX); });
    Object.keys(bg.skills || {}).forEach(function (k) { s.skills[k] = clamp((s.skills[k] || 0) + bg.skills[k], 0, MAX); });
    Object.keys(bg.status || {}).forEach(function (k) { s.status[k] = clamp((s.status[k] || 0) + bg.status[k], 0, MAX); });
    Object.keys(bg.needs || {}).forEach(function (k) { s.needs[k] = clamp(s.needs[k] + bg.needs[k], 0, MAX); });
    Object.keys(bg.attitudes || {}).forEach(function (k) { s.attitudes[k] = clamp((s.attitudes[k] || 0) + bg.attitudes[k], -100, 100); });
    if (bg.workouts) rec().workouts += bg.workouts;
    updateTraits();
  }
  // Trade-off lines for the creator (Lucy can show these under each background).
  var BG_SUMMARY = {
    waif: 'Balanced: a little of everything. Recommended for beginners.',
    nerd: 'Awareness and Willpower up; Physique and Charm down.',
    athlete: 'Physique and Athletics way up, and you start as a gym regular; Awareness down.',
    delinquent: 'Skulduggery up, Crime starts high; Willpower down.',
    beautiful: 'Beauty and Charm way up; you start more stressed and get noticed more.'
  };
  var SIZE_SUMMARY = { small: 'Harder: physical checks are tougher and you carry less.', average: 'Normal difficulty.', large: 'Easier: physical checks are easier and you carry more.' };

  function checkValue(stat) {
    var s = S(); var v = s.core[stat] !== undefined ? effective(stat) : (s.skills[stat] || 0);
    if (hasTrait('sharpEyed') && stat === 'awareness') v += 50;
    if (PHYSICAL[stat]) v += sizeMod();
    if (s.core[stat] === undefined) v -= urgePenalty(); // desperate for a restroom: hard to focus (core stats drop via debuffs)
    return v;
  }
  function checkChance(stat, base) {
    return clamp((checkValue(stat) + 500 - (base === undefined ? 500 : base)) / MAX, 0, 1);
  }
  function difficultyInfo(stat, base) {
    var c = checkChance(stat, base);
    var i = c >= 0.9 ? 5 : c >= 0.75 ? 4 : c >= 0.55 ? 3 : c >= 0.35 ? 2 : c >= 0.15 ? 1 : 0;
    return { label: DIFF_LABELS[i], level: 5 - i, chance: c };
  }
  function difficulty(stat, base) { return difficultyInfo(stat, base).label; }
  // For modules with their own odds: label from a success chance (0..1).
  function difficultyFromChance(c) {
    c = clamp(+c || 0, 0, 1);
    return DIFF_LABELS[c >= 0.9 ? 5 : c >= 0.75 ? 4 : c >= 0.55 ? 3 : c >= 0.35 ? 2 : c >= 0.15 ? 1 : 0];
  }
  function S() { return G.state.stats; }
  function hasTrait(id) { return S().traits.indexOf(id) !== -1; }
  function note(msg, kind) { if (G.notify) G.notify(msg, kind || 'info'); }
  function rnd(n) { return Math.round(n); }
  function bar(v, max, invert) {
    var pct = clamp(v / (max || MAX), 0, 1) * 100;
    var cls = invert ? (pct < 20 ? 'bad' : pct < 50 ? 'warn' : 'ok') : (pct > 80 ? 'bad' : pct > 60 ? 'warn' : 'ok');
    return '<div class="stat-bar ' + cls + '"><span style="width:' + pct.toFixed(0) + '%"></span></div>';
  }
  var TAGS = {
    home: ['dorm_room'], water: ['dorm_room', 'dorm_hall', 'cafeteria', 'cafe', 'gym', 'library', 'lecture_hall', 'bar', 'market', 'park'],
    food: ['cafeteria', 'cafe', 'market', 'bar'], gym: ['gym'], quiet: ['library', 'park', 'woods', 'old_mill'],
    mirror: ['dorm_room', 'dorm_hall', 'gym'], public: ['quad', 'main_street', 'park', 'cafe', 'cafeteria', 'bar']
  };
  function here() {
    var h = (G.world && G.world.here) ? G.world.here() : (G.state.world || {}).location;
    if (h && typeof h === 'object') return h;
    var l = (G.world && G.world.LOCATIONS && G.world.LOCATIONS[h]) || {};
    return { id: h, indoor: l.indoor, restroom: l.restroom, tags: l.tags };
  }
  function hereHas(tag) {
    var h = here();
    if (!h || !h.id) return null; // world.js not loaded: allow everything
    if (h.tags && h.tags.indexOf(tag) !== -1) return true;
    if (tag === 'restroom') return !!h.restroom;
    if (tag === 'outdoors') return h.indoor === false;
    return (TAGS[tag] || []).indexOf(h.id) !== -1;
  }
  function rec(s) { s = s || S(); if (!s.records) s.records = { lateNights: 0, earlyRises: 0, coldsBeaten: 0, lastLate: -1, lastEarly: -1 }; var r = s.records; ['workouts', 'poisoningsBeaten', 'nightsOut'].forEach(function (k) { if (r[k] === undefined) r[k] = 0; }); if (r.lastNightOut === undefined) r.lastNightOut = -1; if (r.lastWeights === undefined) r.lastWeights = -9; if (!s.illness) s.illness = { cold: 0, exposure: 0 }; if (s.illness.food === undefined) s.illness.food = 0; if (s.illness.sore === undefined) s.illness.sore = 0; return s.records; }
  function hasPoison() { rec(); return S().illness.food > 0; }
  function hasCold() { rec(); return S().illness.cold > 0; }
  function weatherNow() {
    var w = G.state.world || {};
    var wx = w.weather;
    return (typeof wx === 'object' && wx) ? (wx.type || '') : (wx || '');
  }
  function money() { return Number(G.state.money) || 0; }
  function addMoney(d) { if (G.change) G.change('money', d); else G.state.money = money() + d; }
  function pace() { var w = (G.state.creation && G.state.creation.world) || {}; return { gentle: 0.7, normal: 1, harsh: 1.35 }[w.needsPace] || 1; }
  function chg(path, d) { if (G.change) G.change('stats.' + path, d); else setPath(path, getPath(path) + d); }
  function getPath(p) { return p.split('.').reduce(function (o, k) { return o[k]; }, S()); }
  function setPath(p, v) { var ks = p.split('.'), o = S(); for (var i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = v; }

  // Effective value of a core stat after debuffs, traits and transformations.
  function effective(stat) {
    var s = S(), v = s.core[stat].value;
    Object.keys(s.transforms).forEach(function (k) {
      var t = TRANSFORMS[k]; if (t && t.bonus[stat]) v += t.bonus[stat] * s.transforms[k];
    });
    debuffs().forEach(function (d) { if (d.mods && d.mods[stat]) v += d.mods[stat]; });
    if (stat === 'willpower' && hasTrait('wellRested')) v *= 1.05;
    return clamp(rnd(v), 0, MAX);
  }

  // Debuffs computed from current condition.
  function debuffs() {
    var n = S().needs, out = [];
    if (n.fatigue >= 900) out.push({ id: 'exhausted', label: 'Exhausted', mods: { awareness: -150, physique: -150, willpower: -100 } });
    else if (n.fatigue >= 700) out.push({ id: 'tired', label: 'Tired', mods: { awareness: -60, physique: -60 } });
    if (n.stress >= 800) out.push({ id: 'overwhelmed', label: 'Overwhelmed', mods: { willpower: -120, beauty: -40 } });
    else if (n.stress >= 600) out.push({ id: 'stressed', label: 'Stressed', mods: { willpower: -50 } });
    if (n.thirst <= 100) out.push({ id: 'parched', label: 'Parched', mods: { awareness: -120, physique: -100 } });
    else if (n.thirst <= 250) out.push({ id: 'thirsty', label: 'Thirsty', mods: { awareness: -40 } });
    if (n.hunger <= 100) out.push({ id: 'starving', label: 'Starving', mods: { physique: -120, willpower: -80 } });
    else if (n.hunger <= 250) out.push({ id: 'hungry', label: 'Hungry', mods: { willpower: -40 } });
    if (hasPoison()) out.push({ id: 'foodPoisoning', label: 'Food poisoning', mods: { physique: -80, willpower: -40 } });
    if (S().illness && S().illness.sore > 0) out.push({ id: 'sore', label: 'Sore muscles', mods: { physique: -40 } });
    if (hasCold()) out.push({ id: 'cold', label: 'Head cold', mods: { awareness: -60, physique: -60 } });
    var urg = Math.max(n.bladder, n.bowels); // matches the need levels: 4 = needs to go, 5 = desperate, 6 = at the limit
    if (urg >= 858) out.push({ id: 'bursting', label: 'Bursting for the restroom', mods: { awareness: -150, willpower: -80, physique: -40 } });
    else if (urg >= 715) out.push({ id: 'desperate', label: 'Desperate', mods: { awareness: -80, willpower: -40 } });
    else if (urg >= 572) out.push({ id: 'needToGo', label: 'Needs the restroom', mods: { awareness: -30 } });
    if (S().soiled && (S().soiled.wet >= 10 || isSoiled())) out.push({ id: 'accidentClothes', label: isSoiled() ? 'Soiled clothes' : 'Wet clothes', mods: { beauty: -60 } });
    var c = S().clothing;
    if (c.upperWetness + c.lowerWetness >= 60) out.push({ id: 'soaked', label: 'Soaked', mods: { beauty: -80 } });
    if (c.upperIntegrity < 25 || c.lowerIntegrity < 25) out.push({ id: 'tattered', label: 'Tattered clothes', mods: { beauty: -100 } });
    return out;
  }

  // ---------- default state ----------
  function freshState() {
    var core = {};
    Object.keys(CORE).forEach(function (k) { core[k] = { value: 200, base: 200, lastUsedDay: 0 }; });
    var skills = {}; Object.keys(SKILLS).forEach(function (k) { skills[k] = 0; });
    var att = {}; Object.keys(ATTITUDES).forEach(function (k) { att[k] = 0; });
    att.theft = -40; att.rulebreaking = -30;
    return {
      needs: { fatigue: 150, stress: 150, control: 800, bladder: 120, bowels: 80, thirst: 800, hunger: 750 },
      core: core,
      skills: skills,
      traits: [],
      attitudes: att,
      transforms: {},
      clothing: { upperWetness: 0, upperIntegrity: 100, lowerWetness: 0, lowerIntegrity: 100, spareOutfits: 2, carried: 0 },
      intake: { fluid: 0, food: 0, caffeine: 0, diuretic: 0, lastT: null, lastH: null, lastB: null, lastF: null, skip: false },
      urge: { hold: null, holds: 0, leakAt: 0, armed: true, wetAcc: 0 },
      soiled: { wet: 0, mess: false, since: null, leaks: 0, kind: null },
      status: { crime: 0, kindnessFame: 0, businessFame: 0, socialiteFame: 0 },
      flags: { warned: {}, collapse: null, accidentToday: 0, sleptFull: false, dirty: false }
    };
  }

  // ---------- warnings (fire once per crossing) ----------
  var WARN = [
    { key: 'fatigue700', test: function (n) { return n.fatigue >= 700; }, reset: function (n) { return n.fatigue < 650; }, msg: 'You are getting tired. Your eyelids feel heavy.' },
    { key: 'fatigue900', test: function (n) { return n.fatigue >= 900; }, reset: function (n) { return n.fatigue < 850; }, msg: 'You are exhausted. If you keep going you will pass out.' },
    { key: 'bladder600', test: function (n) { return n.bladder >= 600; }, reset: function (n) { return n.bladder < 550; }, msg: 'You need to find a restroom.' },
    { key: 'bladder800', test: function (n) { return n.bladder >= 800; }, reset: function (n) { return n.bladder < 750; }, msg: 'You really need a restroom. Soon.' },
    { key: 'bladder900', test: function (n) { return n.bladder >= 900; }, reset: function (n) { return n.bladder < 850; }, msg: 'You are bouncing on your heels. You cannot hold it much longer.' },
    { key: 'bowels600',  test: function (n) { return n.bowels >= 600; },  reset: function (n) { return n.bowels < 550; },  msg: 'Your stomach rumbles. You should find a restroom.' },
    { key: 'bowels850',  test: function (n) { return n.bowels >= 850; },  reset: function (n) { return n.bowels < 800; },  msg: 'Your stomach cramps. You need a restroom now.' },
    { key: 'thirst250',  test: function (n) { return n.thirst <= 250; },  reset: function (n) { return n.thirst > 300; },  msg: 'Your mouth is dry. You should drink something.' },
    { key: 'thirst100',  test: function (n) { return n.thirst <= 100; },  reset: function (n) { return n.thirst > 150; },  msg: 'You feel dizzy from thirst.' },
    { key: 'hunger250',  test: function (n) { return n.hunger <= 250; },  reset: function (n) { return n.hunger > 300; },  msg: 'Your stomach growls. You are hungry.' },
    { key: 'hunger100',  test: function (n) { return n.hunger <= 100; },  reset: function (n) { return n.hunger > 150; },  msg: 'You are weak with hunger.' },
    { key: 'stress700',  test: function (n) { return n.stress >= 700; },  reset: function (n) { return n.stress < 650; },  msg: 'Everything feels like too much right now.' }
  ];
  var repeatEvery = { bladder600: 60, bladder800: 30, bladder900: 15, bowels600: 90, bowels850: 30 }; // minutes between repeats

  function higherActive(key, w) {
    var pre = key.replace(/\d+$/, ''), lvl = +key.replace(/^\D+/, '');
    return Object.keys(w).some(function (k) { return k.indexOf(pre) === 0 && +k.replace(/^\D+/, '') > lvl; });
  }
  function checkWarnings(minutes) {
    var s = S(), n = s.needs, w = s.flags.warned;
    WARN.forEach(function (rule) {
      if (rule.test(n)) {
        var last = w[rule.key];
        if (last === undefined) { w[rule.key] = 0; note(rule.msg, 'info'); }
        else if (repeatEvery[rule.key] && !higherActive(rule.key, w)) {
          w[rule.key] = last + minutes;
          if (w[rule.key] >= repeatEvery[rule.key]) { w[rule.key] = 0; note(rule.msg, 'info'); }
        }
      } else if (rule.reset(n)) { delete w[rule.key]; }
    });
  }

  // ---------- ticking ----------
  function stressMult() { return 1 + S().needs.stress / 1000 * 0.6; }

  function onTick(minutes) {
    var s = S(), n = s.needs, c = s.clothing, sm = stressMult() * pace();
    var sleeping = !!s.flags.sleeping;
    rec(s);
    var wx = weatherNow(), hr = G.time ? G.time.hour : 12;
    var thirstW = wx === 'hot' ? 1.35 : 1;
    var fatW = (hasCold() ? 1.15 : 1) * (hasTrait('nightOwl') && (hr >= 22 || hr < 4) ? 0.85 : 1) * ((wx === 'snow' || wx === 'storm') && isOut() ? 1.1 : 1);
    var stressW = hasTrait('earlyBird') && hr >= 5 && hr < 12 ? 2 : 1;
    if (hasTrait('socialButterfly') && hereHas('public')) stressW *= 1.5;
    var poison = hasPoison();
    if (poison) thirstW *= 1.5;
    bb(); detectIntake();
    var it = s.intake, u = s.urge, t0 = nowMin() - minutes, cold = chilled(), woke = null;
    for (var m = 0; m < minutes; m++) {
      var at = t0 + m, hB = holdingFor('bladder', at) ? 0.4 : 1, hW = holdingFor('bowels', at) ? 0.4 : 1;
      var bm = (it.caffeine > 0 ? 1.25 : 1) * (it.diuretic > 0 ? 1.2 : 1) * (cold ? 1.15 : 1) * (s.soiled.wet >= 30 && isOut() ? 1.05 : 1);
      // fatigue
      if (sleeping) n.fatigue -= 2.0;
      else n.fatigue += 0.62 * sm * fatW * (hasTrait('athletic') ? 0.9 : 1);
      // thirst/hunger drain (1000 = full)
      n.thirst -= (sleeping ? 0.5 : 1.1) * thirstW * (1 + (sm - 1) * 0.5);
      n.hunger -= (sleeping ? 0.3 : 0.55) * (poison ? 0.3 : 1);
      // bladder slows when dehydrated
      var hyd = 0.25 + 0.75 * clamp(n.thirst / MAX, 0, 1);
      // drinks reach the bladder over about an hour (faster with caffeine); meals reach the bowels over a few hours
      var tr = it.fluid > 0 ? Math.min(it.fluid, it.fluid * 0.03 + 0.3) * (sleeping ? 0.5 : 1) * hB : 0; it.fluid -= tr;
      var ftr = it.food > 0 ? Math.min(it.food, it.food * 0.01 + 0.05) * (sleeping ? 0.4 : 1) * hW : 0; it.food -= ftr;
      if (it.caffeine > 0) it.caffeine--; if (it.diuretic > 0) it.diuretic--;
      n.bladder += ((sleeping ? 0.8 : 2.8) * hyd * sm * bm + tr * (it.caffeine > 0 ? 1.2 : 1)) * hB;
      n.bowels += ((sleeping ? 0.2 : 0.45) * (poison ? 3 : 1) * (0.5 + 0.5 * clamp(1 - n.hunger / MAX + 0.4, 0, 1)) * (n.stress >= 600 ? 1.2 : 1) + ftr) * hW;
      // stress eases slowly, faster when resting
      n.stress -= sleeping ? 0.5 : 0.12 * stressW;
      // control: drifts toward 800, pulled down by high stress
      var target = n.stress > 600 ? 650 : 800;
      n.control += (target - n.control) * 0.0008;
      // clothing dries
      c.upperWetness -= 0.15; c.lowerWetness -= 0.12;
      if (!sleeping) urgeStressTick(at);
      clampNeeds();
      if (sleeping) { var wk = sleepCap(s); if (wk) woke = wk; }
      else { checkLeak(at, minutes - m); checkAccident(minutes - m, at); checkCollapse(); }
      if (sleeping && n.fatigue <= 0) s.flags.sleeping = false;
    }
    if (woke) {
      s.flags.sleeping = false;
      note(woke === 'bowels' ? 'Stomach cramps wake you. You need the restroom, now.' : 'You wake up because you badly need the restroom.', 'down');
    }
    if (u.hold && u.hold.until <= nowMin()) {
      if (urgeLevel() >= 5 && !u.hold.noted) note('Your grip is slipping again. You can\'t hold it like that much longer.', 'down');
      u.hold = null;
    }
    if (n.bladder < 500 && n.bowels < 500) u.holds = 0;
    soiledTick(minutes, sleeping);
    rememberIntake();
    illnessTick(minutes, sleeping, wx, hr);
    exposureTick(minutes, sleeping);
    bodyTick(minutes, sleeping);
    // general wear
    c.upperIntegrity -= minutes * 0.001; c.lowerIntegrity -= minutes * 0.0012;
    clampNeeds();
    if (!sleeping) checkWarnings(minutes);
    updateTraits();
  }

  function isOut() { try { var h = G.world && G.world.here ? G.world.here() : null; return !!(h && h.indoor === false); } catch (e) { return false; } }
  function illnessTick(minutes, sleeping, wx, hr) {
    var s = S(), il = s.illness, r = s.records, d = G.time ? G.time.day : 0, c = s.clothing;
    if (!sleeping && hr >= 1 && hr < 4 && r.lastLate !== d) { r.lastLate = d; r.lateNights++; }
    if (!sleeping && hr >= 5 && hr < 7 && r.lastEarly !== d) { r.lastEarly = d; r.earlyRises++; }
    var wetOut = isOut() && /rain|storm|snow|drizzle/.test(wx);
    var soaked = c.upperWetness + c.lowerWetness >= 60;
    if (wetOut || soaked) il.exposure += minutes * (soaked ? 1.5 : 1) * (wx === 'snow' ? 1.5 : 1);
    else il.exposure = Math.max(0, il.exposure - minutes * 0.5);
    if (!sleeping && hr >= 20 && /alley|bar|docks/.test((here() || {}).id || '') && r.lastNightOut !== d) { r.lastNightOut = d; r.nightsOut++; attitude('nightlife', 3); }
    if (il.sore > 0) il.sore = Math.max(0, il.sore - minutes);
    if (il.food > 0) {
      il.food -= minutes * (sleeping ? 1.5 : 1);
      if (il.food <= 0) { il.food = 0; r.poisoningsBeaten++; note('Your stomach has finally settled. Food sounds good again.', 'up'); }
    }
    if (il.cold > 0) {
      il.cold -= minutes * (sleeping ? 2 : 1);
      if (il.cold <= 0) { il.cold = 0; r.coldsBeaten++; note('Your cold has cleared up. You can breathe through your nose again.', 'up'); }
    } else if (il.exposure >= 240) {
      il.exposure = 0;
      if (Math.random() < (hasTrait('resilient') ? 0.15 : 0.3)) {
        il.cold = 2 * 1440 + Math.floor(Math.random() * 1440);
        note('You have caught a head cold. Your nose is running and everything feels slower. Rest, warm drinks and medicine help.', 'down');
        if (G.appendStory) G.appendStory('<p class="flavor">A shiver runs through you, and your throat starts to feel scratchy. Being cold and wet for so long has caught up with you.</p>');
        if (G.emit) G.emit('caughtCold', {});
      }
    }
  }

  // ---------- gym training path ----------
  var GYM = [
    { id: 'cardio', label: 'Cardio on the treadmill', phys: 14, ath: 12, fat: 80, thirst: -140, min: 40, text: 'You run until the numbers on the treadmill stop mattering. Your heart pounds, and your head clears.' },
    { id: 'weights', label: 'Lift weights', phys: 24, ath: 6, fat: 115, thirst: -100, min: 50, text: 'You work through a full set of lifts. Your arms shake on the last rep, but you get it up.' },
    { id: 'yoga', label: 'Stretch and do yoga', phys: 8, ath: 4, will: 8, fat: 30, thirst: -40, min: 40, stress: -60, text: 'You hold each stretch and breathe slowly. Your body unknots one muscle at a time.' },
    { id: 'swim', label: 'Swim laps in the pool ($2)', cost: 2, phys: 18, ath: 14, fat: 95, thirst: -60, min: 45, text: 'Lap after lap in the cool water. Afterwards you float for a minute, feeling light.' }
  ];
  function gymPlan() { var w = rec().workouts; return w < 5 ? 'Beginner' : w < 15 ? 'Building up' : w < 30 ? 'Regular' : w < 60 ? 'Strong' : 'Gym legend'; }
  function gymOptions(out) {
    var n = S().needs, il = S().illness, r = rec();
    GYM.forEach(function (g) {
      var dis = n.fatigue >= 850 ? 'You are too tired to train safely.' : (g.cost && money() < g.cost) ? 'Not enough money.' : null;
      out.actions.push(opt(g.label, function () {
        if (dis) return { text: '<p>' + dis + '</p>', minutes: 1 };
        if (g.cost) addMoney(-g.cost);
        var sore = il.sore > 0 && g.id === 'weights', mult = sore ? 0.5 : 1;
        var att = attitude('exercise', 1);
        train('physique', rnd(g.phys * mult)); trainSkill('athletics', g.ath); if (g.will) train('willpower', g.will);
        chg('needs.fatigue', rnd(g.fat * (hasTrait('gymRat') ? 0.7 : 1))); chg('needs.thirst', g.thirst);
        addStress((g.stress || -35) * (2 - (att || 1))); attitude('hardWork', 1);
        var before = gymPlan(); r.workouts++;
        var extra = '';
        if (g.id === 'weights') {
          if (!hasTrait('gymRat') && today() - r.lastWeights <= 1) { il.sore = 1440; extra = ' <span class="flavor">Lifting two days running has left you sore. A rest day or yoga would help.</span>'; }
          r.lastWeights = today();
        }
        if (g.id === 'yoga') il.sore = Math.max(0, il.sore - 600);
        if (sore) extra += ' <span class="flavor">Your sore muscles hold you back today.</span>';
        if (gymPlan() !== before) note('Training level: ' + gymPlan() + '. Your routine is getting easier.', 'up');
        dollTemp('happy', 60 + g.min);
        if (g.id !== 'yoga') startScene('gym', { id: g.id });
        return { text: '<p>' + g.text + extra + '</p>', minutes: g.min };
      }, { time: g.min, disabled: !!dis, reason: dis ? (n.fatigue >= 850 ? 'Too tired' : 'Needs $' + g.cost) : null,
        hint: dis || 'Training level: ' + gymPlan() + ' (' + r.workouts + ' workouts)',
        effects: ['^+Physique', '^+Athletics'].concat(g.will ? ['^+Willpower'] : [], g.stress ? ['^−Stress'] : [], ['!+Fatigue', '!+Thirst'], g.cost ? ['!−$' + g.cost] : []) }));
    });
  }

  function maybePoison(p) {
    var il = S().illness; rec();
    if (il.food > 0 || Math.random() >= p * (hasTrait('castIron') ? 0.2 : 1)) return false;
    il.food = 600 + Math.floor(Math.random() * 900);
    note('Something you ate disagrees with you. Food poisoning: your stomach is in knots and you will need a restroom often. Water and rest help.', 'down');
    if (G.appendStory) G.appendStory('<p class="flavor">About an hour later your stomach gives an ominous lurch. That food was not right.</p>');
    if (G.emit) G.emit('foodPoisoning', {});
    return true;
  }

  function clampNeeds() {
    var n = S().needs, c = S().clothing;
    Object.keys(n).forEach(function (k) { n[k] = clamp(n[k], 0, MAX); });
    ['upperWetness', 'upperIntegrity', 'lowerWetness', 'lowerIntegrity'].forEach(function (k) { c[k] = clamp(c[k], 0, 100); });
  }

  // Accident threshold drops when control is low (1000 at full control, down to ~700).
  function accidentThreshold() {
    var ctl = S().needs.control;
    if (hasTrait('ironBladder')) return MAX;
    return MAX - rnd((MAX - ctl) * 0.3);
  }

  // Who is around to see? Returns { id, name, p (pronouns), stage } or null.
  function witness() {
    try {
      if (!window.NPCS || !NPCS.present) return null;
      var ids = NPCS.present(G.state); if (!ids || !ids.length) return null;
      var id = ids[Math.floor(Math.random() * ids.length)], n = NPCS.byId[id];
      return { id: id, name: n.name, first: n.name.replace(/^(Professor|Dr\.|Mr\.|Ms\.|Mx\.|Officer|Mayor)\s+/, '').split(' ')[0], p: NPCS.pronouns(id), stage: NPCS.stage(G.state, id).key };
    } catch (e) { return null; }
  }
  function placeKind() {
    var h = here(), id = h.id || '';
    if (id === 'dorm_room') return 'private';
    if (h.restroom && /dorm_hall/.test(id)) return 'semi';
    if (/lecture_hall|library|deans_office/.test(id)) return 'class';
    if (/cafeteria|cafe|bar|market|gym|florist|town_hall|church/.test(id)) return 'indoorPublic';
    if (h.indoor === false && /old_mill|woods|alley|campus_farm/.test(id)) return 'secluded';
    return 'outdoorPublic';
  }
  function crowded() { var h = G.time.hour; return h >= 8 && h < 21; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }



  // ---------- bladder & bowels: intake, urgency, holding it, leaks, wet/soiled clothes ----------
  // State: stats.intake {fluid, food, caffeine, diuretic, lastT/H/B/F, skip}, stats.urge {hold, holds, leakAt, armed, wetAcc},
  // stats.soiled {wet 0..100 (accident wetness still in your clothes), mess, since, leaks, kind}. All recoverable.
  function bb() {
    var s = S();
    if (!s.intake) s.intake = { fluid: 0, food: 0, caffeine: 0, diuretic: 0, lastT: null, lastH: null, lastB: null, lastF: null, skip: false };
    if (!s.urge) s.urge = { hold: null, holds: 0, leakAt: 0, armed: true, wetAcc: 0 };
    if (!s.soiled) s.soiled = { wet: 0, mess: false, since: null, leaks: 0, kind: null };
    return s;
  }
  // Points of bladder fill a drink adds (20% now, the rest over the next hour or so). caf/diu = minutes of a mild diuretic effect.
  var DRINKS = {
    water: { fl: 100 }, coffee: { fl: 90, caf: 180 }, tea: { fl: 90, caf: 90 }, milk: { fl: 70 },
    juice: { fl: 90 }, soda: { fl: 100, caf: 60 }, alcohol: { fl: 110, diu: 120 }
  };
  function drank(kind, amount) {
    var s = bb(), d = DRINKS[kind] || DRINKS.water, fl = typeof amount === 'number' ? amount : d.fl, now = fl * 0.2;
    s.needs.bladder = clamp(s.needs.bladder + now, 0, MAX);
    s.intake.fluid += fl - now;
    if (d.caf) s.intake.caffeine = Math.max(s.intake.caffeine || 0, d.caf);
    if (d.diu) s.intake.diuretic = Math.max(s.intake.diuretic || 0, d.diu);
    s.intake.skip = true;
    return fl;
  }
  // A meal reaches the bowels gradually over the next few hours.
  function ate(amount) { var s = bb(); s.intake.food += Math.max(0, +amount || 0); s.intake.skip = true; }
  // Other modules (world.js menus, npcs) change thirst/hunger directly; read those changes between ticks.
  function detectIntake() {
    var s = bb(), it = s.intake, n = s.needs;
    if (it.lastT !== null && !it.skip) {
      var dT = n.thirst - it.lastT, dB = n.bladder - it.lastB, dH = n.hunger - it.lastH, dF = n.fatigue - it.lastF;
      if (dT > 40 && dB < 10) it.fluid += dT * 0.25;        // a drink that didn't already count toward the bladder
      if (dT > 40 && dF < -30) it.caffeine = Math.max(it.caffeine || 0, 150); // tea or coffee off a menu
      if (dH > 80 && n.bowels - (it.lastBw || 0) < 5) it.food += dH * 0.1;
    }
    it.skip = false;
  }
  function rememberIntake() { var s = bb(), it = s.intake, n = s.needs; it.lastT = n.thirst; it.lastB = n.bladder; it.lastH = n.hunger; it.lastF = n.fatigue; it.lastBw = n.bowels; }
  function rainingNow() { try { if (G.world && typeof G.world.isRaining === 'function') return !!G.world.isRaining(); } catch (e) {} return /rain|storm|drizzle/.test(weatherNow()); }
  function tempNow() { try { if (G.world && typeof G.world.temp === 'function') { var t = G.world.temp(); if (typeof t === 'number') return t; } } catch (e) {} return 14; }
  function chilled() { return isOut() && (rainingNow() || tempNow() <= 8 || weatherNow() === 'snow'); }
  function urgeLevel() { var n = S().needs; return Math.max(needLevel('bladder', n.bladder), needLevel('bowels', n.bowels)); }
  function holdKind(at) { var h = bb().urge.hold; return h && h.until > (at === undefined ? nowMin() : at) ? h.kind : null; }
  function holdingFor(kind, at) { var k = holdKind(at); return !!k && (k === kind || k === 'both'); }
  // Focus: skill checks lose this many points (core stats already drop through debuffs); study/work can multiply by 1 - focusPenalty().
  function urgePenalty() { return [0, 0, 0, 0, 30, 70, 130][urgeLevel()]; }
  function focusPenalty() { return [0, 0, 0, 0.05, 0.1, 0.2, 0.35][urgeLevel()]; }
  function leakPoint() { return accidentThreshold() - (hasTrait('ironBladder') ? 40 : 70); }

  var URGE_TEXT = {
    bladder: [
      'Your bladder is empty.',
      'You don\'t need to go.',
      'You could go, if you passed a restroom.',
      'You need to go. It keeps tugging at the edge of your attention.',
      'You need to go badly. You keep shifting your weight, and sitting still is uncomfortable.',
      'You\'re desperate. The pressure is a constant ache, every step jolts, and it\'s hard to think about anything else.',
      'You are at your limit. You\'re pressing your legs together and trying not to move. It could start to leak at any moment.'
    ],
    bowels: [
      'Your bowels are empty.',
      'Your stomach is settled.',
      'You\'ll need the restroom at some point.',
      'You need to go. Your stomach gurgles now and then.',
      'You need to go badly. Cramps come in waves and you have to stop and wait for each one to pass.',
      'You\'re desperate. The cramps are sharp and close together, and you\'re clenching hard just to walk.',
      'You can barely hold it. Each cramp is a fight, and you\'re losing ground.'
    ]
  };
  function urgeText(kind) {
    var n = S().needs, t = URGE_TEXT[kind][needLevel(kind, n[kind])];
    if (holdingFor(kind)) t += ' You\'re holding on through willpower for now.';
    return t;
  }
  function clothesNames() {
    var lo = wardrobeLayer('lower'), un = wardrobeLayer('underLower');
    return { outer: lo && lo.name ? lo.name.toLowerCase() : (lo === null && WR() ? '' : 'trousers'), under: un && un.name ? un.name.toLowerCase() : (un === null && WR() ? '' : 'underwear') };
  }
  function your(n, dflt) { return 'your ' + (n || dflt); }
  // Short line for the Needs tab, self-check and banner. Empty when you're clean and dry.
  function soiledLine(short) {
    var s = bb(), so = s.soiled, f = s.flags, nm = clothesNames(), bits = [];
    if (isSoiled()) bits.push(short ? 'Soiled clothes' : 'Your ' + (nm.under || nm.outer || 'clothes') + ' are soiled. The smell is noticeable up close, and it gets harder to ignore the longer you leave it.');
    if (so.wet >= 10) bits.push(short ? (so.wet >= 40 ? 'Wet clothes (accident)' : 'Damp clothes (accident)') : (so.wet >= 40 ? 'Your ' + (nm.outer || nm.under || 'clothes') + ' are wet from the accident, cold and clinging, and the patch shows.' : 'Your ' + (nm.under || nm.outer || 'clothes') + ' are damp from a leak. It hasn\'t really shown through, but you can feel it.'));
    if (!bits.length && f.dirty) bits.push(short ? 'Needs a clean-up' : 'Your clothes have dried, but you haven\'t cleaned yourself up since the accident.');
    if (!bits.length) return '';
    if (short) return bits.join(', ');
    return bits.join(' ') + ' Clean up at a restroom (wash, rinse, dry under the hand dryer), or go home to shower and change.';
  }
  function soiledState() {
    var s = bb(), so = s.soiled;
    return { wet: Math.round(so.wet), mess: isSoiled(), dirty: !!s.flags.dirty, since: so.since, leaks: so.leaks || 0, kind: so.kind, text: soiledLine(true) };
  }
  function soiledNoticeMult() { var so = bb().soiled; return 1 + (isSoiled() ? 0.6 : 0) + (so.wet >= 40 ? 0.4 : so.wet >= 10 ? 0.15 : 0); }
  function concealMult() { try { var w = WR(); if (w && typeof w.conceal === 'function') return 1 - clamp(+w.conceal('lower') || 0, 0, 4) * 0.1; } catch (e) {} return 1; }
  function crowdNow() { try { if (G.world && typeof G.world.crowd === 'function') { var c = G.world.crowd(); if (typeof c === 'number') return clamp(c, 0, 1); } } catch (e) {} return crowded() ? 0.5 : 0.15; }
  function whoSaw() {
    var w = presentIds().length ? witness() : null;
    return { w: w, by: w ? w.id : (onCampusNow() ? 'student' : 'stranger') };
  }

  // A partial leak: some escapes before you clamp down. Wets underwear first (wardrobe soak), outer clothes if it overflows.
  var LEAK_FEEL = [
    'A hot spurt escapes before you can clamp down. You freeze, heart pounding, until it stops.',
    'Your bladder twinges and a little leaks out. You squeeze everything tight and it stops, mostly.',
    'For a horrible second you start to go. You manage to stop it, but not before you feel it warm your underwear.'
  ];
  function leak(why, rest, silent) {
    var s = bb(), n = s.needs, c = s.clothing, so = s.soiled, u = s.urge, nm = clothesNames();
    var pts = 35 + Math.round(Math.random() * 25), ml = pts * 2;
    n.bladder = clamp(n.bladder - pts, 0, MAX);
    u.leakAt = nowMin() + 25; u.armed = false;
    var r = rec(s); r.leaks = (r.leaks || 0) + 1;
    var held = wardrobeAbsorbPart('bladder', ml), html;
    if (held >= 1) {
      html = '<p class="scene">A little leaks out, but your brief catches it. Nobody can tell. It\'s a warning, though.</p>';
      addStress(8);
      if (G.emit) G.emit('leak', { kind: 'bladder', ml: ml, where: here().id, contained: true, visible: false, why: why || 'tick' });
      if (!silent && G.appendStory) G.appendStory(html);
      return { html: html, visible: false };
    }
    var left = Math.round(ml * (1 - held)), w = WR(), before = c.lowerWetness;
    if (w && typeof w.soak === 'function' && wardrobeLayer('underLower')) {
      var over = 0; try { over = w.soak('under_bottom', left); if (over > 0 && wardrobeLayer('lower')) w.soak('bottom', over); } catch (e) {}
    } else c.lowerWetness = clamp(c.lowerWetness + left / (wardrobeLayer('underLower') === null && w ? 4 : 8), 0, 100);
    var shows = c.lowerWetness - before >= 4;
    so.wet = clamp(so.wet + 10, 0, 100); so.leaks = (so.leaks || 0) + 1; if (!so.since) so.since = nowMin(); if (!so.kind) so.kind = 'leak';
    s.flags.dirty = true;
    var pub = inPublic(), lines = [why === 'queue' ? 'Waiting is too much. ' + pick(LEAK_FEEL) : why === 'hold' ? 'You try to hold on and can\'t quite. ' + pick(LEAK_FEEL) : why === 'search' ? 'Halfway there, it gets ahead of you. ' + pick(LEAK_FEEL) : pick(LEAK_FEEL)];
    lines.push(shows ? 'A dark patch the size of your palm has come through to ' + your(nm.outer, 'trousers') + '. You pull your top down over it as far as it will go.'
      : 'Your ' + (nm.under || 'underwear') + ' ' + (nm.under && /s$/.test(nm.under) ? 'are' : 'is') + ' damp now, cooling uncomfortably against your skin. It hasn\'t shown through. Yet.');
    lines.push(pick(['Next time it won\'t stop. You need a restroom now.', 'That was a warning. Find a restroom.', 'You don\'t have long. Find a toilet, soon.']));
    var st = pub ? 30 : 15; addStress(st);
    dollTemp('blush', 30 + (rest || 0));
    var seen = null;
    if (shows && pub && Math.random() < crowdNow() * 0.4 * noticeMult() * concealMult()) {
      seen = whoSaw();
      lines.push(seen.w ? seen.w.name + ' glances down at the wrong moment, then quickly looks away.' : 'Someone nearby glances at you, then away.');
      addStress(15); spotted(seen.by, 'leak', { what: 'bladder' });
    }
    html = '<p class="scene accident leak">' + lines.join(' ') + '</p>';
    if (G.emit) G.emit('leak', { kind: 'bladder', ml: left, where: here().id, visible: shows, witness: seen ? seen.by : null, why: why || 'tick' });
    if (!silent) { if (G.appendStory) G.appendStory(html); else note(lines.join(' '), 'down'); }
    return { html: html, visible: shows };
  }
  function checkLeak(at, rest) {
    var s = bb(), n = s.needs, u = s.urge, lp = leakPoint();
    if (n.bladder < lp - 100) u.armed = true;
    if (n.bladder < lp || holdingFor('bladder', at)) return;
    if (u.armed) { leak('tick', rest); return; } // the first time you hit the edge there's always a warning leak
    if ((u.leakAt || 0) > at) return;
    if (Math.random() < 0.03 + 0.05 * clamp((n.bladder - lp) / 70, 0, 1)) leak('tick', rest);
  }
  // While asleep your body wakes you before an accident.
  function sleepCap(s) {
    var n = s.needs, th = accidentThreshold() - 50, woke = null;
    if (n.bladder > th) { n.bladder = th; woke = 'bladder'; }
    if (n.bowels > th) { n.bowels = th; woke = woke ? 'both' : 'bowels'; }
    return woke;
  }
  function urgeStressTick(at) {
    var n = S().needs, add = [0, 0, 0, 0, 0.06, 0.25, 0.4][urgeLevel()];
    if (add && holdKind(at)) add *= 1.5;
    n.stress += add;
  }
  // Wet/soiled clothes: dry out slowly, keep adding stress, and wet patches can be noticed in public.
  var WET_SEEN = [
    'Someone\'s eyes drop to the dark patch on {o}, then politely away.',
    'A couple of people nearby go quiet as you pass. You keep walking.',
    'You catch someone nudging their friend and nodding in your direction.',
    'A stranger looks at your {o} for a moment too long, then pretends to read their phone.'
  ];
  function soiledTick(minutes, sleeping) {
    var s = bb(), so = s.soiled, c = s.clothing, u = s.urge;
    so.mess = isSoiled();
    if (so.wet > 0) {
      so.wet = Math.max(0, so.wet - minutes * 0.1);
      var cap = Math.max(c.lowerWetness || 0, typeof c.underLowerWetness === 'number' ? c.underLowerWetness : 0);
      so.wet = Math.min(so.wet, cap); // changed or dried clothes take the accident wetness with them
    }
    if (!so.mess && so.wet <= 0 && !s.flags.dirty) { so.since = null; so.kind = null; so.leaks = 0; }
    if (sleeping) return;
    var pub = inPublic();
    if (so.wet >= 10) s.needs.stress += minutes / 60 * (pub ? 10 : 2);
    if (so.mess && !(WR() && typeof WR().soiled === 'function')) s.needs.stress += minutes / 60 * 6; // wardrobe.js adds this itself
    if (!pub || so.wet < 20 || c.lowerWetness < 20) { u.wetAcc = 0; return; }
    u.wetAcc = (u.wetAcc || 0) + minutes;
    while (u.wetAcc >= 30) {
      u.wetAcc -= 30;
      var p = clamp(crowdNow() * 0.5 * noticeMult() * concealMult() * (rainingNow() && isOut() ? 0.3 : 1) * (c.lowerWetness >= 50 ? 1.3 : 1), 0, 0.6);
      if (Math.random() >= p) continue;
      var ws = whoSaw(), o = your(clothesNames().outer, 'trousers');
      var line = ws.w ? ws.w.name + ' notices the wet patch on ' + o + '. ' + (ws.w.stage === 'hostile' || ws.w.stage === 'cold' ? ws.w.p.Sub + ' smirk' + (ws.w.p.sub === 'they' ? '' : 's') + '.' : 'You both pretend ' + ws.w.p.sub + ' didn\'t.') : pick(WET_SEEN).replace('{o}', o);
      if (G.appendStory) G.appendStory('<p class="scene">' + line + ' Your face burns.</p>'); else note(line, 'down');
      addStress(15); dollTemp('blush', 45);
      spotted(ws.by, 'wet', { what: 'bladder' });
      break;
    }
  }

  // ---------- 'Hold it': a willpower check when a need is critical ----------
  function holdTarget() {
    var n = S().needs, b = needLevel('bladder', n.bladder) >= 5, w = needLevel('bowels', n.bowels) >= 5;
    return b && w ? 'both' : b ? 'bladder' : w ? 'bowels' : null;
  }
  function holdBase(kind) {
    var s = bb(), n = s.needs, lv = urgeLevel();
    return 250 + (lv >= 6 ? 100 : 0) + (s.urge.holds || 0) * 100 - (n.control - 800) * 0.5 + (hasTrait('ironBladder') ? -150 : 0) + (kind === 'bladder' ? 0 : 50);
  }
  function holdChance(kind) { return checkChance('willpower', holdBase(kind || holdTarget() || 'bladder')); }
  function holdOption() {
    var kind = holdTarget(), ch = holdChance(kind), u = bb().urge;
    return opt('Hold it', function () {
      var s = bb(), n = s.needs, k = holdTarget() || kind, ok = Math.random() < holdChance(k);
      s.urge.holds = (s.urge.holds || 0) + 1;
      if (ok) {
        var mins = 20 + Math.round(Math.random() * 15);
        s.urge.hold = { kind: k, until: nowMin() + 2 + mins, noted: false };
        addStress(20); train('willpower', 3);
        return { text: '<p>' + pick(['You stop, cross your legs, and breathe slowly through it. The wave passes. You\'ve bought yourself a little time, but not much.', 'You clench, count to twenty, and will it to wait. It does, for now.', 'You stand very still and concentrate until the worst of it eases. It will come back.']) + ' <span class="flavor">(About ' + mins + ' minutes before it gets bad again.)</span></p>', minutes: 2 };
      }
      addStress(35);
      if (k !== 'bowels') { var lk = leak('hold', 2, true); return { text: lk.html, minutes: 2 }; }
      n.bowels = clamp(n.bowels + 20, 0, MAX);
      return { text: '<p class="scene">You try to hold it, but a cramp doubles you over and it\'s all you can do not to lose it right there. You need a restroom now.</p>', minutes: 2 };
    }, { time: 2, icon: '😣', section: 'needs', priority: 80, check: 'Willpower: ' + difficultyFromChance(ch),
      hint: (u.holds ? 'Each time you hold it, it gets harder. ' : '') + 'Buys some time but adds stress; failing means a leak.',
      effects: ['^Buys time', '!+Stress'] });
  }

  // ---------- finding a restroom: out of order, locked, or a queue ----------
  function hashStr(t) { var h = 7; for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return Math.abs(h); }
  function outOfOrder(id) { if (!id || id === 'dorm_room') return false; var d = today(); return d >= 3 && hashStr(id + ':' + d) % 19 === 0; }
  function knownOut(id) { var k = S().flags.rrKnown; return !!(k && k[id || here().id] === today()); }
  function markOut(id) { var f = S().flags; if (!f.rrKnown || typeof f.rrKnown !== 'object') f.rrKnown = {}; for (var k in f.rrKnown) if (f.rrKnown[k] !== today()) delete f.rrKnown[k]; f.rrKnown[id] = today(); }
  // Nearest working, open restroom within a short walk (up to three hops / 20 minutes).
  function nearestRestroom() {
    try {
      var W = G.world, hid = here().id; if (!W || typeof W.neighbours !== 'function' || !W.LOCATIONS || typeof W.teleport !== 'function') return null;
      var dist = {}, queue = [hid], best = null; dist[hid] = 0;
      for (var hop = 0; hop < 3; hop++) {
        var next = [];
        queue.forEach(function (from) {
          (W.neighbours(from) || []).forEach(function (id) {
            var d = dist[from] + ((typeof W.distance === 'function' && W.distance(from, id)) || 10);
            if (d > 20 || (dist[id] !== undefined && dist[id] <= d)) return;
            dist[id] = d; next.push(id);
            var l = W.LOCATIONS[id]; if (!l || !l.restroom || outOfOrder(id)) return;
            if (l.open && typeof W.isOpen === 'function' && !W.isOpen(id)) return;
            if (!best || d < best.d) best = { id: id, d: d, name: l.name || id };
          });
        });
        queue = next;
      }
      return best;
    } catch (e) { return null; }
  }
  function lookOption() {
    var best = nearestRestroom();
    return opt('Look for a restroom', function () {
      var b = nearestRestroom(), lv = urgeLevel(), extra = '';
      if (!b) { addStress(15); return { text: '<p>You walk up and down looking for a restroom, but everything nearby is closed or out of order. You\'ll have to go further, or find somewhere discreet.</p>', minutes: 10 }; }
      if (lv >= 6 && Math.random() < 0.3) extra = leak('search', b.d + 3, true).html;
      G.world.teleport(b.id);
      return { text: '<p>' + pick(['You ask someone where the nearest toilet is and walk as fast as you can without looking like you\'re hurrying.', 'You scan every sign as you go. Every minute feels long.', 'You remember there\'s one nearby and head straight for it.']) + ' You make it to ' + b.name + '.</p>' + extra, minutes: b.d + 3 };
    }, { time: best ? best.d + 3 : 10, icon: '🚻', section: 'needs', priority: 70, hint: best ? 'Nearest: ' + best.name : 'Nothing open nearby', effects: best ? ['^Reach a restroom'] : ['!Nothing open nearby'] });
  }
  function canQueue(hid) { return hid !== 'dorm_room'; }
  function restroomHiccup(hid) {
    // Returns { text, minutes, leak } for a lock or a queue on the way in. Light, never blocking.
    if (!canQueue(hid)) return null;
    var busy = crowdNow(), r = Math.random();
    if (/cafe|market|bar|shopping_centre/.test(hid) && r < 0.15) return { text: pick(['The door is locked. A sign says "Customers: ask for the key." You ask at the counter and get handed a key on an enormous wooden spoon.', 'It\'s locked. You have to ask the staff for the code, which they recite without looking up.']) + ' ', minutes: 2 };
    if (r < 0.1 + busy * 0.25) return { text: pick(['There\'s a queue. You wait, shifting from foot to foot, pretending to read the notices on the wall.', 'Every stall is taken. You wait by the sinks and try not to think about it.', 'Someone is in there. You knock, they call "Just a minute!", and it is a very long minute.']) + ' ', minutes: 3 + Math.floor(Math.random() * 4), leak: urgeLevel() >= 6 && Math.random() < 0.4 };
    return null;
  }

  // ---------- spare clothes: carried in your bag (fallback without the wardrobe, or via Lucy's API when it exists) ----------
  function spareApi() { var w = WR(); return w && typeof w.changeIntoSpare === 'function' ? w : null; }
  function hasSpare() { var w = spareApi(); if (w) { try { return typeof w.hasSpare === 'function' ? !!w.hasSpare() : true; } catch (e) { return false; } } return !WR() && (S().clothing.carried || 0) > 0; }
  function changeIntoSpare() {
    var s = bb(), c = s.clothing, w = spareApi();
    if (w) { try { w.changeIntoSpare(); } catch (e) { return false; } }
    else { c.carried = Math.max(0, (c.carried || 0) - 1); c.lowerWetness = 0; c.lowerIntegrity = 100; c.lowerSoiled = false; c.laundry = (c.laundry || 0) + 1; }
    s.soiled.wet = 0;
    return true;
  }
  function packOption() {
    var c = S().clothing, w = WR();
    if (w && !(typeof w.packSpare === 'function')) return null;
    if (!w && (c.carried || 0) > 0) return null;
    if (!w && c.spareOutfits <= 0) return opt('Pack a spare change of clothes', function () { return { text: '', minutes: 0 }; }, { time: 2, disabled: true, reason: 'No clean clothes to pack. Do laundry first', icon: '🎒', section: 'self' });
    return opt('Pack a spare change of clothes', function () {
      if (w) { try { w.packSpare(); } catch (e) {} } else { c.carried = 1; c.spareOutfits = Math.max(0, c.spareOutfits - 1); }
      return { text: '<p>You roll up a clean pair of trousers and underwear and push them into the bottom of your bag. Just in case.</p>', minutes: 2 };
    }, { time: 2, icon: '🎒', section: 'self', effects: ['^Change in a restroom later'] });
  }

  // ---------- clean-up steps (inside the restroom scene) ----------
  function cleanupSteps(sc, list) {
    var s = bb(), c = s.clothing, so = s.soiled, f = s.flags, nm = clothesNames(), soiledNow = isSoiled();
    if (f.dirty && !sc.washed) list.push(step('Clean yourself up', function () { return cleanSelf(sc); }, { time: soiledNow ? 12 : 8, icon: '🧻', effects: ['^Clean', '^−Stress'] }));
    if ((soiledNow || so.wet >= 15) && !sc.rinsed) list.push(step('Rinse out your clothes at the sink', function () { return rinseClothes(sc); }, { time: soiledNow ? 20 : 12, icon: '🚰', effects: ['^Removes the smell', '!Clothes left wet'] }));
    if (c.lowerWetness >= 15 && (sc.dried || 0) < 3) list.push(step('Dry them under the hand dryer', function () {
      sc.dried = (sc.dried || 0) + 1;
      c.lowerWetness = clamp(c.lowerWetness - 25, 0, 100); so.wet = Math.max(0, so.wet - 25);
      try { var w = WR(); if (w && typeof w.dry === 'function') w.dry('under_bottom', 25); } catch (e) {}
      var t = pick(['You hold ' + your(nm.outer, 'trousers') + ' under the hand dryer, turning them every few seconds. It roars, and takes forever.', 'You crouch awkwardly under the dryer, angling the wet patch at the hot air. It slowly fades.', 'The dryer cuts out every thirty seconds and you keep slapping it back on. Progress, slowly.']);
      if (Math.random() < crowdNow() * 0.5) { t += ' ' + pick(['Someone comes in, sees what you\'re doing, and very kindly says nothing.', 'The door swings open. You freeze. They wash their hands and leave without a word.']); addStress(10); dollTemp('blush', 25); }
      return { text: '<p>' + t + (c.lowerWetness < 15 ? ' Dry enough. Nobody would know.' : ' Still damp.') + '</p>', minutes: 10 };
    }, { time: 10, icon: '💨', effects: ['^−Wetness'] }));
    if ((soiledNow || so.wet >= 10 || c.lowerWetness >= 30) && hasSpare() && !sc.changed) list.push(step('Change into your spare clothes', function () {
      sc.changed = true; changeIntoSpare(); f.dirty = false; chg('needs.stress', -30);
      return { text: '<p>You wriggle out of the wet things in the stall, wrap them in a plastic bag, and pull on the clean clothes from your bag. Dry, clean, and nobody would ever know. The bag goes straight in the laundry when you get home.</p>', minutes: 6 };
    }, { time: 6, icon: '👕', effects: ['^Dry, clean clothes', '^−Stress'] }));
  }
  function cleanSelf(sc) {
    var s = bb(), soiledNow = isSoiled(); if (sc) sc.washed = true;
    s.flags.dirty = false; chg('needs.stress', -15);
    return { text: '<p>' + (soiledNow ? 'You lock the stall and clean yourself up properly with toilet paper and handfuls of damp paper towels. It\'s slow, grim work, but you get it done.' : 'You lock the stall and clean up with damp paper towels. You feel more like yourself again.') + (soiledNow ? ' Your clothes still need dealing with.' : '') + '</p>', minutes: soiledNow ? 12 : 8 };
  }
  function rinseClothes(sc) {
    var s = bb(), c = s.clothing, so = s.soiled, soiledNow = isSoiled(), nm = clothesNames();
    if (sc) { sc.rinsed = true; sc.washed = true; }
    s.flags.dirty = false; c.lowerSoiled = false; so.wet = 0; so.mess = false;
    c.lowerWetness = Math.max(c.lowerWetness, soiledNow ? 60 : 45);
    var t = soiledNow ? 'You lock yourself in a stall, clean up, then scrub ' + your(nm.under, 'underwear') + ' and ' + your(nm.outer, 'trousers') + ' out at the sink with hand soap until the water runs clear. The smell is gone. They\'re soaking wet now, and they\'ll need a proper wash.'
      : 'You rinse the wet patch out at the sink with cold water and hand soap. Now it\'s just water, at least. Still wet, though.';
    if (Math.random() < crowdNow() * 0.5) { t += ' ' + pick(['Someone comes in halfway through. You keep your back to them and scrub harder.', 'The door opens and closes again. Whoever it was decided to come back later.']); addStress(10); dollTemp('blush', 30); }
    return { text: '<p>' + t + '</p>', minutes: soiledNow ? 20 : 12 };
  }

  // ---------- body notes: small, occasional lines about how you feel (between the hard warnings) ----------
  var BODY = {
    peckish: ['Your stomach gives a small, hopeful gurgle.', 'You catch yourself thinking about toast.', 'You could eat. Not urgently, but soon.'],
    dry: ['Your lips feel a little dry.', 'A glass of water would be nice right about now.'],
    weary: ['Your eyelids feel heavier than they did an hour ago.', 'You yawn so wide your jaw clicks.', 'You read the same line twice without taking it in.'],
    tense: ['Your shoulders have crept up toward your ears again.', 'You realise you\'ve been clenching your jaw.', 'A tight knot sits just under your ribs.'],
    cold: ['Your nose won\'t stop running.', 'You sneeze, and someone nearby says "bless you" without looking up.', 'Your head feels stuffed with cotton wool.'],
    poison: ['Your stomach sloshes unhappily.', 'A wave of queasiness comes and goes.'],
    sore: ['Your legs remind you about the gym with every step.', 'Reaching for something on a high shelf is a mistake. Ow.'],
    good: ['You feel good today. Rested, fed, and steady.', 'There\'s a lightness in your step you can\'t quite explain.', 'You catch yourself humming.', 'For a moment everything feels exactly as it should be.'],
    full: ['You feel pleasantly full.', 'You\'re a bit too full to move quickly.'],
    urge: ['You catch yourself jiggling your leg.', 'You check where the nearest restroom is, just in case.', 'You shift in your seat. You should go soon.'],
    gut: ['Your stomach gurgles. You\'ll need a restroom before long.', 'A dull cramp comes and goes low in your stomach.']
  };
  function bodyTick(minutes, sleeping) {
    var s = S(), n = s.needs, f = s.flags;
    if (sleeping) return;
    f.bodyAcc = (f.bodyAcc || 0) + minutes;
    if (f.bodyAcc < 180) return;
    f.bodyAcc = 0;
    if (Math.random() < 0.45) return;
    var k = null;
    if (hasPoison()) k = 'poison';
    else if (hasCold()) k = 'cold';
    else if (s.illness && s.illness.sore > 0 && Math.random() < 0.5) k = 'sore';
    else if (needLevel('bladder', n.bladder) === 3) k = 'urge';
    else if (needLevel('bowels', n.bowels) === 3) k = 'gut';
    else if (n.stress >= 400 && n.stress < 700) k = 'tense';
    else if (n.fatigue >= 450 && n.fatigue < 700) k = 'weary';
    else if (n.hunger > 250 && n.hunger <= 450) k = 'peckish';
    else if (n.thirst > 250 && n.thirst <= 400) k = 'dry';
    else if (n.hunger >= 950) k = 'full';
    else if (n.stress < 200 && n.fatigue < 400 && n.hunger > 500 && n.thirst > 500) k = 'good';
    if (k) note(pick(BODY[k]), 'flavor');
  }

  // ---------- flavor text: varied lines, tinted by time of day and weather ----------
  var FLAVOR = {
    water: ['You drink deeply. Cool and clean.', 'The water is cold enough to make your teeth ache. Worth it.', 'You gulp it down and refill before you\'ve really thought about it.', 'Plain water, and somehow exactly right.'],
    coffee: ['The coffee is strong enough to stand a spoon in. Your eyes open a little wider.', 'Bitter, hot, and doing its job. The world comes into focus.', 'You wrap both hands around the cup and let the first sip wake you up.', 'Someone has written "you got this" on the cup. You decide to believe them.'],
    shower: ['Hot water, a bar of soap, and ten minutes where nobody needs anything from you.', 'You stand under the water until the mirror fogs over completely.', 'The dorm shower takes a while to warm up, but when it does, it\'s bliss.', 'Somebody down the hall is singing in the next stall. Badly. You don\'t mind.'],
    sleepNight: ['You crawl into bed and pull the covers up to your chin.', 'The radiator ticks quietly as you drift off.', 'You\'re asleep almost before your head hits the pillow.', 'Hollowbrook goes quiet outside your window, and so do you.'],
    sleepDay: ['You draw the curtains against the daylight and crash.', 'You sleep through the noise of the dorm hallway.', 'It feels strange to sleep while the sun is up, but your body insists.'],
    nap: ['You lie down for a short nap.', 'You close your eyes "just for a minute" and wake an hour later.', 'You doze on top of the covers, one shoe still on.', 'A short, heavy nap. You wake up with a crease from the pillow on your cheek.'],
    change: ['You change into a clean outfit and toss the old one in the laundry pile.', 'Fresh clothes. You feel like a new person, or at least a cleaner one.', 'You dig out something clean and kick the old clothes under the bed for later.'],
    laundry: ['You haul your laundry down to the machines and wait it out, half-reading a textbook.', 'The dryer thumps like it\'s full of trainers. One of them probably is.', 'You fold your clothes on top of the machine while someone else waits pointedly.', 'Warm laundry straight out of the dryer is one of life\'s small joys.'],
    gym: ['You push yourself until your lungs burn. It feels good, mostly.', 'The music in your headphones carries you through the last set.', 'You catch your reflection mid-rep and decide not to look again.', 'Sweaty, sore, and weirdly proud of yourself.'],
    meditate: ['You sit quietly and let your thoughts settle.', 'You count your breaths. You lose count around twelve, and that\'s fine.', 'The noise in your head slows down, one thought at a time.'],
    groom: ['You fix your hair and pick out an outfit that actually works.', 'You spend longer in front of the mirror than you meant to, but the result is good.', 'A little effort goes a long way. You look put together for once.'],
    watch: ['You find a bench and watch the town go by, noticing who talks to whom.', 'A couple argues quietly outside the bakery, then makes up. You file it away.', 'You notice the same delivery van passing for the third time. Interesting.', 'An old man feeds the pigeons and names each one under his breath.'],
    restroom: ['You find a free stall and take care of things.', 'The hand dryer roars like a jet engine when you\'re done.', 'Someone has carved initials into the stall door. You add nothing.', 'The restroom smells of pine cleaner and good intentions.'],
    cook: ['The shared kitchen smells great for once, and a few people poke their heads in.', 'You burn your tongue on the first bite because you couldn\'t wait.', 'Somebody asks what you\'re making. You feel like a real chef for a second.']
  };
  function flavorTint() {
    var h = G.time ? G.time.hour : 12, wx = weatherNow(), out = isOut(), bits = [];
    if (out && /rain|storm/.test(wx)) bits.push(pick(['Rain drums on everything.', 'The rain hasn\'t let up.', 'Your shoes squelch a little.']));
    else if (out && wx === 'snow') bits.push(pick(['Snow drifts past.', 'Your breath fogs in the cold air.']));
    else if (out && wx === 'hot') bits.push(pick(['The heat sits heavy on the town.', 'The sun beats down.']));
    if (h >= 22 || h < 5) bits.push(pick(['It\'s late, and the world feels hushed.', 'Most of Hollowbrook is asleep.']));
    else if (h < 8) bits.push(pick(['The morning is still grey and new.', 'Early light slants through the windows.']));
    return bits.length && Math.random() < 0.5 ? ' <span class="flavor">' + bits[0] + '</span>' : '';
  }
  function flav(key) { var a = FLAVOR[key]; return a ? pick(a) + flavorTint() : ''; }

  // Accident text: how it feels, where you are, what happened to your clothes, who noticed, what to do next.
  var ACC_FEEL = {
    bladder: [
      'The pressure wins. Warmth floods out before you can stop it, spreading through your underwear and running down the inside of your legs. For a few seconds all you can do is stand there and let it happen.',
      'You clench as hard as you can, and it isn\'t enough. Once it starts it won\'t stop. You feel it soak through, hot at first, then quickly cooling.',
      'One step too many. Your bladder gives out and you wet yourself, a long rush you can\'t hold back however hard you try.'
    ],
    bowels: [
      'A cramp grips you, harder than the others, and this time you can\'t hold it back. It\'s over in seconds, and you know straight away that you\'ve messed yourself.',
      'Your stomach clenches one last time and you lose the fight. You go very still, mortified, trying to work out how bad it is. Bad.',
      'You almost make it. Almost. The cramp wins, and you feel the mess in your underwear before you\'ve even finished thinking "no".'
    ]
  };
  function placeLine(pk, busy, place) {
    if (pk === 'private') return 'At least you\'re alone in your room. You take a shaky breath and start dealing with it.';
    if (pk === 'semi') return 'It happens just a few doors short of the bathroom. ' + (busy ? 'A door opens down the corridor. You don\'t look to see who it is.' : 'The corridor is empty. Small mercies.');
    if (pk === 'class') return 'In ' + place + ', of all places. ' + (busy ? pick(['Someone two rows back goes very quiet.', 'You grab your bag and hold it in front of you as you make for the door.', 'You keep your head down and hope nobody noticed.']) : 'Thankfully the rooms are mostly empty at this hour.');
    if (pk === 'indoorPublic') return 'Right there in ' + place + '. ' + (busy ? pick(['A staff member pretends very hard not to have seen, and points you toward the restroom.', 'Conversation at the next table falters, then carries on a little too loudly.', 'You leave quickly, face burning.']) : 'It\'s quiet, and you slip out as fast as you can.');
    if (pk === 'secluded') return 'Out here, at least, there\'s nobody to see.';
    return 'In the middle of ' + place + '. ' + (busy ? pick(['A passer-by glances down, then away.', 'You walk stiffly to the nearest bench and sit, pretending nothing happened.', 'A gust of wind makes the wet fabric go cold against your legs.']) : 'It\'s dark, and there\'s nobody around.');
  }
  function accidentScene(kind, soak) {
    var pk = placeKind(), w = witness(), busy = crowded(), place = (here().name || 'here'), nm = clothesNames();
    var lines = [pick(ACC_FEEL[kind])], stress = 150, social = 0;
    lines.push(placeLine(pk, busy, place));
    if (pk === 'private') stress = 60;
    else if (pk === 'semi') stress = busy ? 140 : 90;
    else if (pk === 'class') { stress = busy ? 220 : 120; social = busy ? -15 : 0; }
    else if (pk === 'indoorPublic') { stress = busy ? 200 : 110; social = busy ? -10 : 0; }
    else if (pk === 'secluded') stress = 80;
    else { stress = busy ? 180 : 90; social = busy ? -8 : 0; }
    // the clothes
    var un = your(nm.under, 'underwear'), ou = your(nm.outer, 'trousers');
    if (kind === 'bladder') lines.push(soak >= 40 ? 'Your ' + (nm.under || 'underwear') + ' ' + (/s$/.test(nm.under || 'underwear') ? 'are' : 'is') + ' soaked through, and a dark patch has spread down the front and inside legs of ' + ou + '. Your socks are wet. Everything clings, cold and heavy, with every step.'
      : 'Most of it soaked into ' + un + ', but there\'s a damp patch showing on ' + ou + ', and you can feel it with every step.');
    else lines.push(un.charAt(0).toUpperCase() + un.slice(1) + ' ' + (/s$/.test(nm.under || 'underwear') ? 'are' : 'is') + ' soiled, and you\'re painfully aware of it every time you move. It doesn\'t show from outside, but the smell will, close up.');
    // who noticed
    var noticed = false;
    if (w && pk !== 'private') {
      noticed = true; var P = w.p;
      if (w.stage === 'hostile' || w.stage === 'cold') { lines.push(w.name + ' saw. ' + P.Sub + ' smirk' + (P.sub === 'they' ? '' : 's') + ' and turn' + (P.sub === 'they' ? '' : 's') + ' away, and you know the story will get around.'); stress += 60; social -= 10; }
      else if (w.stage === 'neutral') { lines.push(w.name + ' noticed. ' + P.Sub + ' give' + (P.sub === 'they' ? '' : 's') + ' you an awkward nod and find' + (P.sub === 'they' ? '' : 's') + ' something else to look at.'); stress += 20; }
      else { lines.push(w.first + ' is suddenly beside you. "Hey. It\'s okay. Here," ' + P.sub + ' say' + (P.sub === 'they' ? '' : 's') + ', handing you ' + pick(['a jacket to tie around your waist', 'a pack of tissues', 'a spare hoodie']) + ' and steering you somewhere quieter.'); stress -= 60; if (G.emit) G.emit('helpedAfterAccident', { npc: w.id }); }
    } else if (pk !== 'private') {
      var base = { secluded: 0.1, semi: busy ? 0.5 : 0.2, 'class': busy ? 0.85 : 0.3, indoorPublic: busy ? 0.75 : 0.3, outdoorPublic: busy ? 0.6 : 0.2 }[pk] || 0.3;
      noticed = Math.random() < clamp(base * noticeMult() * (kind === 'bladder' ? concealMult() : 1), 0, 0.95);
      if (noticed && pk === 'secluded') lines.push('Then you hear footsteps on the path, and someone sees you standing there.');
      else if (!noticed) { lines.push(pick(['Nobody seems to have noticed. You don\'t wait around to find out.', 'As far as you can tell, nobody saw. Your heart is still hammering.'])); stress -= 30; }
    }
    lines.push(kind === 'bladder' ? 'You need to get cleaned up: a restroom to wash and dry off, or home to shower and change.' : 'You need a restroom to clean up and rinse your clothes, or to get home and change, before anyone smells it.');
    return { html: '<p class="scene accident">' + lines.join(' ') + '</p>', stress: Math.max(30, stress), social: social, witness: w ? w.id : null, pk: pk, busy: busy, noticed: noticed };
  }

  function checkAccident(rest, at) {
    var s = bb(), n = s.needs, th = accidentThreshold(), kind = null;
    var thB = holdingFor('bladder', at) ? Math.min(MAX, th + 30) : th, thW = holdingFor('bowels', at) ? Math.min(MAX, th + 30) : th;
    if (n.bladder >= thB) kind = 'bladder'; else if (n.bowels >= thW) kind = 'bowels';
    if (!kind) return;
    n[kind] = 0;
    s.urge.hold = null; s.urge.holds = 0; s.urge.armed = true;
    // A worn incontinence brief (wardrobe.js) catches it first: no wet clothes, nothing to see. Smell from a soiled brief is wardrobe/npcs' job.
    var held = wardrobeAbsorbPart(kind);
    if (held >= 1) { containedAccident(kind); return; }
    if (held >= 0.8) { // the brief takes nearly all of it: a little seeps round the edges, nothing like a full accident
      containedAccident(kind);
      s.clothing.lowerWetness = clamp(s.clothing.lowerWetness + (kind === 'bladder' ? 6 : 2), 0, 100); s.flags.dirty = true;
      if (kind === 'bladder') { s.soiled.wet = clamp(s.soiled.wet + 10, 0, 100); if (!s.soiled.since) s.soiled.since = nowMin(); if (!s.soiled.kind) s.soiled.kind = 'leak'; }
      note('Your brief is nearly overwhelmed, and a little seeps out round the edges. Change it soon.', 'down');
      return;
    }
    // Ordinary underwear soaks up part of it before it reaches the outer layer; a full brief overflows the rest.
    var under = wardrobeLayer('underLower'), soak = kind === 'bladder' ? 70 : 30;
    if (held > 0) soak = Math.max(5, Math.round(soak * (1 - held)));
    else if (under && under.integrity > 0) soak = Math.round(soak * (kind === 'bladder' ? 0.75 : 0.5));
    if (lastBriefText && wearingBriefAny()) note(lastBriefText, 'down'); // partial hold or "already full and overflows"
    s.clothing.lowerWetness = clamp(s.clothing.lowerWetness + soak, 0, 100);
    s.flags.dirty = true;
    s.flags.accidentToday++;
    var r = rec(s); r.accidents = (r.accidents || 0) + 1;
    var so = s.soiled; if (!so.since) so.since = nowMin();
    if (kind === 'bladder') { so.wet = clamp(so.wet + Math.max(soak, 50), 0, 100); so.kind = so.kind === 'mess' ? 'mess' : 'wet'; } else so.kind = 'mess';
    var sc = accidentScene(kind, soak);
    if (G.appendStory) G.appendStory(sc.html); else note(sc.html, 'down');
    if (sc.pk !== 'private') dollTemp('blush', 60 + (rest || 0)); // padded to outlast the rest of this action
    n.stress = clamp(n.stress + sc.stress, 0, MAX);
    n.control = clamp(n.control - 30, 0, MAX);
    note('Stress +' + sc.stress, 'up'); note('Control -30', 'down');
    if (sc.social && sc.noticed) { s.status.socialiteFame = clamp(s.status.socialiteFame + sc.social, 0, MAX); note('Socialite fame ' + sc.social, 'down'); }
    if (kind === 'bowels') { note('Your lower clothes are soiled. Clean up and rinse them at a restroom sink, or go home and change, before people notice the smell.', 'info'); }
    else note('Your clothes are wet. Clean up and dry off at a restroom, or go home and change.', 'info');
    if (G.emit) G.emit('accident', { kind: kind, type: kind, where: here().id, witness: sc.witness, noticed: sc.noticed, amount: VOLUME[kind].amount, unit: VOLUME[kind].unit, leaked: held > 0 ? 1 - held : 1 });
    if (kind === 'bowels' && !isSoiled()) s.clothing.lowerSoiled = true; // no wardrobe item to tag
    so.mess = isSoiled();
    // Anyone who saw it: named NPCs (npcs.js adjusts their opinion), classmates (school.js lowers school reputation).
    if (sc.pk !== 'private' && sc.noticed) {
      var by = sc.witness || (onCampusNow() ? 'student' : 'stranger');
      spotted(by, 'accident', { what: kind });
    }
  }

  // ---------- incontinence briefs (worn via wardrobe.js) ----------
  function WR() { return G.wardrobe || window.Wardrobe || null; }
  // Each pee is 400 ml and each poo 0.5 lb. absorb(kind, amount, unit) may return true (all of it), false (none),
  // or a number = how much it held; the rest overflows onto your clothes. wardrobeAbsorb returns the fraction held (0..1).
  var lastBriefText = ''; // wardrobe.js lastUse(): "You used your ... diaper, filling it to N%." (+ grow line)
  var VOLUME = { bladder: { amount: 400, unit: 'ml' }, bowels: { amount: 0.5, unit: 'lb' } };
  function wardrobeAbsorbPart(kind, amount) {
    try { var w = WR(); if (!w || typeof w.absorb !== 'function') return 0;
      var v = VOLUME[kind]; if (typeof amount === 'number') v = { amount: amount, unit: v.unit };
      var r = w.absorb(kind, v.amount, v.unit);
      lastBriefText = ''; try { var u = typeof w.lastUse === 'function' ? w.lastUse() : null; if (u && u.text) lastBriefText = u.text + (u.growText ? ' ' + u.growText : ''); } catch (e2) {}
      if (r === true) return 1; if (typeof r === 'number' && r > 0) return clamp(r / v.amount, 0, 1); return 0; } catch (e) { return 0; }
  }
  function wardrobeAbsorb(kind) { return wardrobeAbsorbPart(kind) >= 1; }
  function wardrobeLayer(id) { try { var w = WR(); return w && typeof w.layer === 'function' ? w.layer(id) : null; } catch (e) { return null; } }
  function wearingBriefAny() { try { var w = WR(); return !!(w && w.wearingBrief && w.wearingBrief()); } catch (e) { return false; } }
  function wearingBrief() { try { var w = WR(); return !!(w && w.wearingBrief && w.wearingBrief() && !(w.briefFull && w.briefFull())); } catch (e) { return false; } }
  function containedAccident(kind) {
    var s = S(), n = s.needs, st = kind === 'bowels' ? 25 : 10;
    s.flags.accidentToday++;
    var r = rec(s); r.contained = (r.contained || 0) + 1;
    n.stress = clamp(n.stress + st, 0, MAX); n.control = clamp(n.control - 15, 0, MAX);
    var t = lastBriefText || 'You can\'t hold it any longer, but your brief catches it. Nobody notices.';
    if (G.appendStory) G.appendStory('<p class="scene">' + t + '</p>'); else note(t, 'info');
    note('Stress +' + st, 'up'); note('Control -15', 'down');
    if (G.emit) G.emit('accident', { kind: kind, type: kind, where: here().id, witness: null, contained: true, absorbed: true, amount: VOLUME[kind].amount, unit: VOLUME[kind].unit });
  }
  function briefOption() {
    var s = S(), n = s.needs, both = n.bowels >= 300;
    return opt(both ? 'Go in your brief' : 'Pee in your brief', function () {
      var kinds = n.bladder >= 150 ? ['bladder'] : [];
      if (both) kinds.push('bowels');
      var said = [];
      var done = kinds.filter(function (k) { var ok = wardrobeAbsorb(k); if (ok) { n[k] = 0; if (lastBriefText) said.push(lastBriefText); } return ok; });
      if (!done.length) return { text: '<p>Your brief is already full. You need a restroom, or a fresh brief.</p>', minutes: 1 };
      var r = rec(s); r.briefUsed = (r.briefUsed || 0) + 1;
      n.stress = clamp(n.stress - 15, 0, MAX);
      if (G.emit) done.forEach(function (k) { G.emit('accident', { kind: k, type: k, where: here().id, witness: null, contained: true, absorbed: true, chosen: true, amount: VOLUME[k].amount, unit: VOLUME[k].unit }); });
      return { text: '<p>' + (said.length ? said.join(' ') : 'You go discreetly.') + ' Nobody around you can tell.' + (done.indexOf('bowels') >= 0 ? ' Change soon, before anyone notices the smell.' : '') + '</p>', minutes: 2 };
    }, { time: 2, hint: 'Nobody sees, but a soiled brief can be smelled', effects: both ? ['^−Bladder', '^−Bowels', '!Smell'] : ['^−Bladder', '!Brief fills'] });
  }

  // ---------- undressed in public (wardrobe.js says what's uncovered; npcs.js/school.js handle reputation) ----------
  function exposedNow() {
    try { var w = WR(); if (!w) return false;
      if (typeof w.exposed !== 'function') { if (typeof w.exposure !== 'function') return false; var x = w.exposure() || {}; return !!(x.lower || x.upper === 'bare'); }
      var e = w.exposed();
      if (!e) return false; if (typeof e === 'object') { if (e.length !== undefined) return e.length > 0; for (var k in e) if (e[k]) return true; return false; } return true; } catch (x) { return false; }
  }
  function inPublic() {
    try { if (G.world && typeof G.world.isPublic === 'function') return !!G.world.isPublic(); } catch (e) {}
    var h = here(); if (h.restroom || /fitting/.test(h.id || '')) return false;
    return placeKind() !== 'private';
  }
  function noticeMult() { return (covering() ? 0.5 : 1) * attentionMult(); }
  function covering() { var f = S().flags; return !!(f.covering && exposedNow() && inPublic()); }
  function exposureTick(minutes, sleeping) {
    var s = S(), f = s.flags, n = s.needs;
    if (sleeping || !exposedNow() || !inPublic()) { f.covering = false; f.exposedWarned = false; return; }
    var ex = null; try { ex = WR().exposed(); } catch (e) {}
    var sev = ex && typeof ex === 'object' ? ((ex.lower === 'bare' || ex.naked) ? 1 : ex.lower === 'under' ? 0.5 : 0) + (ex.upper === 'bare' ? 0.5 : 0) : 1;
    if (!(WR() && typeof WR().exposed === 'function')) n.stress = clamp(n.stress + minutes * 0.35 * Math.max(0.5, sev) * (f.covering ? 0.5 : 1), 0, MAX); // wardrobe.js owns this stress when loaded
    var r = rec(s); r.exposedMinutes = (r.exposedMinutes || 0) + minutes;
    if (!f.exposedWarned) { f.exposedWarned = true; note('You aren\'t properly dressed, and people can see. Cover up, or get somewhere private and change.', 'down'); }
  }
  function coverOption() {
    return opt('Cover yourself as best you can', function () {
      var s = S(); dollTemp('blush', 21); s.flags.covering = true; s.needs.stress = clamp(s.needs.stress - 10, 0, MAX);
      if (G.emit) G.emit('covered', { where: here().id });
      return { text: '<p>You hold your bag in front of you and keep your arms in close. It isn\'t much, but fewer people will notice. You need proper clothes, or somewhere private, soon.</p>', minutes: 1 };
    }, { time: 1, hint: 'People notice less often, but it doesn\'t fix it' });
  }

  // ---------- being seen: relieving yourself where there's no restroom ----------
  function onCampusNow() { try { return !!(G.world && G.world.onCampus && G.world.onCampus()); } catch (e) { return false; } }
  function presentIds() { try { return (window.NPCS && NPCS.present && NPCS.present(G.state)) || []; } catch (e) { return []; } }
  function isStudentId(id) { if (id === 'students') return true; var n = window.NPCS && NPCS.byId && NPCS.byId[id]; return !!(n && n.group === 'Students'); }
  // Shared 'spotted' event: school.js turns student sightings into school reputation, npcs.js into named NPC opinion.
  // Paperdoll expressions (doll.js); harmless no-op before it loads.
  function dollTemp(name, mins) { if (G.doll && G.doll.setTemp) { try { G.doll.setTemp(name, mins); } catch (e) {} } }
  function spotted(by, kind, extra) {
    dollTemp('blush', 30); // padded: set before the action's minutes tick
    var d = { by: by, kind: kind, student: isStudentId(by), src: 'stats', where: here().id };
    if (extra) for (var k in extra) d[k] = extra[k];
    if (G.emit) G.emit('spotted', d);
  }
  // Soiled lower clothing: the worn wardrobe item's .soiled flag (wardrobe.js), or stats.clothing.lowerSoiled without a wardrobe.
  function isSoiled() {
    try { var W = G.wardrobe || window.Wardrobe; if (W && typeof W.soiled === 'function' && W.soiled()) return true; } catch (e) {}
    return !!S().clothing.lowerSoiled;
  }
  function reliefRisk() {
    var pk = placeKind(), busy = crowded(), ids = presentIds();
    var r = { secluded: 0.05, outdoorPublic: busy ? 0.35 : 0.12, indoorPublic: busy ? 0.6 : 0.3, 'class': busy ? 0.75 : 0.35, semi: 0.3, 'private': 0 }[pk];
    if (r === undefined) r = 0.3;
    // Ron's crowd() (0 = empty, 1 = packed) refines the guess when available.
    try { if (G.world && typeof G.world.crowd === 'function') { var cr = G.world.crowd(); if (typeof cr === 'number') r = r * 0.4 + clamp(cr, 0, 1) * (pk === 'secluded' ? 0.2 : 0.7); } } catch (e) {}
    r += 0.1 * ids.length;
    if (isOut() && /rain|storm|snow/.test(weatherNow())) r *= 0.7;
    r *= 1 - (S().skills.skulduggery || 0) / 2000;
    var aw = S().core.awareness; if (aw) r *= 1 - effective('awareness') / 2500; // a watchful eye picks the moment
    return clamp(r, 0.02, 0.95);
  }
  function riskWord(r) { return r < 0.12 ? 'low' : r < 0.35 ? 'some' : r < 0.6 ? 'high' : 'very high'; }
  function reliefOption() {
    var s = S(), n = s.needs, both = n.bowels >= 400, r = reliefRisk();
    return opt(both ? 'Find somewhere to go' : 'Find somewhere to pee', function () {
      var risk = reliefRisk(), out = isOut(), campus = onCampusNow();
      var spot = out ? pick(['behind a hedge', 'in a shadowy corner', 'behind a parked van', 'behind a row of bins', 'under some trees']) : pick(['in an empty back corridor', 'in a quiet stairwell', 'in a corner nobody seems to use']);
      var relief = n.bladder >= 600 || n.bowels >= 600;
      n.bladder = 0; if (both) n.bowels = 0;
      var r2 = rec(s); r2.publicRelief = (r2.publicRelief || 0) + 1;
      attitude('rulebreaking', 1);
      var lead = 'You find a spot ' + spot + ' and go as fast as you can. ';
      if (Math.random() < risk) {
        var w = presentIds().length ? witness() : null, line, v = w && w.p.sub === 'they' ? '' : 's';
        if (w) line = lead + 'You are just finishing when ' + w.name + ' comes round the corner and sees you. ' + (w.stage === 'hostile' || w.stage === 'cold' ? w.p.Sub + ' laugh' + v + ' out loud.' : w.stage === 'neutral' ? w.p.Sub + ' stop' + v + ' dead, then turn' + v + ' sharply away.' : w.p.Sub + ' wince' + v + ' and suddenly find' + v + ' ' + w.p.pos + ' phone very interesting.');
        else line = lead + (campus ? 'Halfway through, a group of students walks past. Someone says, "Oh, come on," and you hear them laughing all the way down the path.' : 'Halfway through, a passer-by stops, stares, and walks off shaking their head.');
        addStress(90);
        // On a busy town street, the passer-by is sometimes Officer Dunn on patrol.
        if (!w && !campus && out && crowded() && Math.random() < 0.25) {
          var fine = Math.min(money(), 15); if (fine) addMoney(-fine); chg('status.crime', 5);
          line += ' Unfortunately, it\'s Officer Dunn. ' + (fine ? 'You get a short lecture and a $' + fine + ' fine for public indecency.' : 'You get a short lecture and a warning, since you can\'t pay a fine.');
          spotted('dunn', 'relieved', { what: both ? 'bowels' : 'bladder', fine: fine });
        } else spotted(w ? w.id : (campus ? 'student' : 'stranger'), 'relieved', { what: both ? 'bowels' : 'bladder' });
        return { text: '<p class="scene accident">' + line + '</p>', minutes: both ? 6 : 3 };
      }
      if (relief) chg('needs.stress', -30); else addStress(10);
      return { text: '<p>' + lead + 'Nobody sees. You walk away relieved and a little guilty.</p>', minutes: both ? 6 : 3 };
    }, { time: both ? 6 : 3, hint: 'Chance of being seen: ' + riskWord(r), effects: [both ? '^−Bladder, −Bowels' : '^−Bladder', '!Risk: ' + riskWord(r)] });
  }

  function checkCollapse() {
    var s = S(), n = s.needs;
    if (s.flags.collapse) return;
    if (n.fatigue >= MAX) s.flags.collapse = 'fatigue';
    else if (n.thirst <= 0) s.flags.collapse = 'thirst';
    else if (n.hunger <= 0) s.flags.collapse = 'hunger';
    if (s.flags.collapse) {
      G.state.lock = { reason: 'collapse', allow: [] };
      var w = witness();
      s.flags.collapseCtx = { where: here().id, name: here().name, kind: placeKind(), hour: G.time.hour, witness: w };
      var warn = { fatigue: 'Your legs feel like lead and the edges of the world are going soft.', thirst: 'Your head spins and your mouth is bone dry.', hunger: 'You are shaking, light-headed and empty.' }[s.flags.collapse];
      note(warn + ' You are about to pass out.', 'down');
    }
  }

  // ---------- core stat growth & decay ----------
  function today() { return (G.time && G.time.day) || 1; }

  function train(stat, amount, opposed) {
    var c = S().core[stat]; if (!c) return;
    var gain = opposed ? -Math.abs(amount) : amount * (1 - c.value / 1400); // diminishing returns
    gain = rnd(gain);
    var before = tier(c.value);
    c.value = clamp(c.value + gain, 0, MAX);
    if (gain > 0) { c.base = clamp(c.base + rnd(gain * 0.35), 0, MAX); c.lastUsedDay = today(); }
    if (gain) note(CORE[stat].label + ' ' + (gain > 0 ? '+' : '') + gain, gain > 0 ? 'up' : 'down');
    var after = tier(c.value);
    if (after !== before) note(CORE[stat].label + ' is now ' + after + '.', gain > 0 ? 'up' : 'down');
    updateTraits();
  }

  function trainSkill(skill, amount) {
    var s = S(); if (s.skills[skill] === undefined) s.skills[skill] = 0;
    var before = tier(s.skills[skill]);
    var gain = rnd(amount * (1 - s.skills[skill] / 1400));
    s.skills[skill] = clamp(s.skills[skill] + gain, 0, MAX);
    if (gain) note((SKILLS[skill] ? SKILLS[skill].label : skill) + ' +' + gain, 'up');
    var after = tier(s.skills[skill]);
    if (after !== before) note((SKILLS[skill] ? SKILLS[skill].label : skill) + ' is now ' + after + '.', 'up');
    updateTraits();
  }

  // Each new day, unused stats slowly slide back toward their trained base.
  function onNewDay() {
    var s = S(), d = today();
    Object.keys(s.core).forEach(function (k) {
      var c = s.core[k];
      if (d - c.lastUsedDay >= 2 && c.value > c.base) c.value = Math.max(c.base, c.value - 8);
    });
    s.flags.accidentToday = 0;
    if (s.needs.fatigue > 300) s.flags.sleptFull = false;
  }

  function updateTraits() {
    var s = S();
    TRAITS.forEach(function (t) {
      var has = s.traits.indexOf(t.id) !== -1, ok = t.req(s);
      if (ok && !has) { s.traits.push(t.id); note('New trait: ' + t.label + '. ' + t.desc, 'up'); }
      else if (!ok && has) { s.traits.splice(s.traits.indexOf(t.id), 1); note('Lost trait: ' + t.label + '.', 'down'); }
    });
  }

  // Attitude shifts with repetition; returns a stress multiplier for doing the thing.
  function attitude(id, nudge) {
    var a = S().attitudes; if (a[id] === undefined) a[id] = 0;
    if (nudge) a[id] = clamp(a[id] + nudge, -100, 100);
    return 1 - a[id] / 200; // -100 => 1.5x stress, +100 => 0.5x
  }

  function addStress(amount, attitudeId) {
    var mult = attitudeId ? attitude(attitudeId) : 1;
    if (amount > 0 && hasTrait('steady')) mult *= 0.85;
    chg('needs.stress', rnd(amount * mult));
  }

  function transform(id, stage) {
    if (!TRANSFORMS[id]) return;
    var t = S().transforms, prev = t[id] || 0;
    stage = clamp(stage === undefined ? prev + 1 : stage, 0, 3);
    if (stage === prev) return;
    if (stage === 0) delete t[id]; else t[id] = stage;
    if (stage > prev) note(TRANSFORMS[id].label + ': ' + TRANSFORMS[id].stages[stage], 'info');
  }

  // ---------- options ----------
  function opt(label, run, extra) { var o = { label: label, run: run }; if (extra) for (var k in extra) o[k] = extra[k]; return o; }

  function collapseOption() {
    var s = S(), why = s.flags.collapse, cx = s.flags.collapseCtx || {}, w = cx.witness;
    var o = opt('Pass out', function () {
      var n = s.needs, lines = [], wakeAt = 'dorm_room', minutes, fee = 0;
      s.flags.collapse = null; s.flags.collapseCtx = null;
      if (G.state.lock && G.state.lock.reason === 'collapse') G.state.lock = null;
      var cause = { fatigue: 'Your eyes close on their own and the world slides away.', thirst: 'Your vision tunnels and your knees give out.', hunger: 'Your legs turn to water and you sink down.' }[why];
      lines.push(cause);
      var night = cx.hour >= 22 || cx.hour < 6, P = w && w.p, friendly = w && /friendly|friend|close/.test(w.stage);
      if (friendly) {
        lines.push('The last thing you hear is ' + w.first + ' saying your name.');
        lines.push(why === 'fatigue' ? 'You wake in your own bed with your shoes still on. A note on the desk says: "You scared me. Drink some water. -' + w.first + '"'
          : 'You come to in the campus clinic. The nurse says ' + w.first + ' brought you in and waited until you were stable.');
        if (why !== 'fatigue') { wakeAt = 'dorm_room'; fee = 10; }
        if (G.emit) G.emit('helpedAfterCollapse', { npc: w.id });
      } else if (cx.kind === 'private') {
        lines.push('You wake sprawled across your bed, stiff and groggy, with no idea how long you were out.');
      } else if (why === 'fatigue' && cx.kind === 'class') {
        lines.push('You wake with your cheek on the desk and the room empty. Someone has left a sticky note on your sleeve: "Lecture ended an hour ago."');
        wakeAt = null; n.stress = clamp(n.stress + 40, 0, MAX);
      } else if (why === 'fatigue' && (cx.kind === 'secluded' || night)) {
        lines.push('You wake cold and damp at ' + (cx.name || 'the side of the path') + ', and your pockets feel lighter than they should.');
        wakeAt = null; fee = Math.min(money(), Math.round(Math.random() * 15 + 5));
        if (G.world && G.world.isIndoors && !G.world.isIndoors()) { s.clothing.upperWetness = clamp(s.clothing.upperWetness + 20, 0, 100); s.clothing.lowerWetness = clamp(s.clothing.lowerWetness + 20, 0, 100); }
      } else if (why === 'fatigue') {
        lines.push(w ? w.name + ' is shaking your shoulder. "You can\'t sleep here." ' + P.Sub + ' help' + (P.sub === 'they' ? '' : 's') + ' you to your feet.' : 'A stranger is shaking your shoulder and asking if you need an ambulance. You mumble something and stumble home.');
      } else {
        lines.push((w ? w.name + ' calls' : 'Someone calls') + ' for help. You wake in the campus clinic with ' + (why === 'thirst' ? 'a paper cup of water pressed into your hand' : 'a granola bar on the tray beside you') + ' and a nurse frowning at you. A small visit fee goes on your account.');
        fee = 20;
      }
      if (why === 'fatigue') { n.fatigue = wakeAt ? 350 : 500; minutes = wakeAt ? 420 : 240; }
      else { n.fatigue = Math.max(0, n.fatigue - 200); n[why] = 400; minutes = 180; }
      if (fee) addMoney(-Math.min(money(), fee));
      n.stress = clamp(n.stress + 100, 0, MAX);
      if (wakeAt && G.world && G.world.teleport && here().id !== wakeAt) G.world.teleport(wakeAt);
      bb().intake.skip = true;
      Object.keys(s.flags.warned).forEach(function (k) { delete s.flags.warned[k]; });
      if (G.emit) G.emit('collapse', { cause: why, where: cx.where, witness: w ? w.id : null });
      return { text: '<p class="scene collapse">' + lines.join(' ') + '</p>', minutes: minutes };
    }, { time: why === 'fatigue' ? 420 : 180 });
    o.always = true;
    return o;
  }

  // ---------- groceries: buy at Hollowbrook Grocer (market), eat/drink anywhere, cook at home ----------
  // Stored as stats.groceries.items = { id: [dayBought, ...] } (one entry per serving).
  // Lucy's inventory can read G.groceries.list() and set G.groceries.limit = function () { return n; } for a carry limit.
  var GROCERIES = {
    water:   { label: 'Bottle of water',   unit: 'bottle',  price: 1, qty: 1, verb: 'Drink', thirst: 250, mins: 1, text: 'You twist the cap off and drain half the bottle in one go.' },
    milk:    { label: 'Pint of milk',      unit: 'glass',   price: 2, qty: 3, verb: 'Drink', thirst: 160, hunger: 50, mins: 2, spoils: 2, text: 'Cold, creamy, and exactly what you needed.' },
    bread:   { label: 'Loaf of bread',     unit: 'slice',   price: 3, qty: 6, verb: 'Eat', hunger: 90, thirst: -10, mins: 2, spoils: 5, ingredient: true, text: 'You tear off a slice and eat it plain. Not exciting, but it does the job.' },
    fruit:   { label: 'Bag of apples',     unit: 'apple',   price: 4, qty: 5, verb: 'Eat', hunger: 70, thirst: 30, bowels: 25, mins: 3, spoils: 7, text: 'Crisp and a little sour. You feel virtuous for about a minute.' },
    snacks:  { label: 'Bag of crisps',     unit: 'handful', price: 2, qty: 3, verb: 'Eat', hunger: 110, thirst: -30, mins: 2, text: 'Salty, crunchy, and gone far too fast.' },
    noodles: { label: 'Instant noodles',   unit: 'pot',     price: 1, qty: 1, verb: 'Make', hunger: 260, thirst: -20, mins: 10, needsHome: true, text: 'Boiling water, three minutes, and a sachet of something orange. Comfort in a cup.' },
    pasta:   { label: 'Pasta and sauce',   unit: 'portion', price: 5, qty: 3, ingredient: true },
    eggs:    { label: 'Half a dozen eggs', unit: 'egg',     price: 3, qty: 6, spoils: 10, ingredient: true }
  };
  var GROC_ALT = {
    water: ['Cold water, straight from the bottle. Simple and perfect.', 'You drink half, then the other half a minute later.'],
    milk: ['You pour a tall glass and drink it standing at the counter.', 'It tastes like being a kid again, in a good way.'],
    bread: ['You fold a slice in half and eat it in four bites.', 'Plain bread, slightly squashed from your bag. Still good.'],
    fruit: ['You polish the apple on your sleeve first, out of habit.', 'Juicy enough that you have to lean forward. Worth it.'],
    snacks: ['The crinkle of the bag gets a few looks. You don\'t care.', 'You promise yourself just one handful. You keep the promise, barely.'],
    noodles: ['You slurp the noodles too loudly and burn your tongue a little. Classic.', 'Three minutes of waiting feels like an eternity. The first bite makes up for it.']
  };
  function groc() { var s = S(); if (!s.groceries) s.groceries = { items: {} }; return s.groceries.items; }
  function grocCount(id) { var g = groc()[id]; return g ? g.length : 0; }
  function grocTotal() { var g = groc(), n = 0; for (var k in g) n += g[k].length; return n; }
  function grocLimit() { try { if (G.groceries && typeof G.groceries.limit === 'function') return G.groceries.limit(); } catch (e) {} return 24; }
  function grocAdd(id, n) { var g = groc(); g[id] = g[id] || []; for (var i = 0; i < n; i++) g[id].push(today()); }
  function grocTake(id) { var g = groc()[id]; if (!g || !g.length) return null; return g.shift(); } // oldest first
  function isOff(id, day) { var d = GROCERIES[id]; return !!(d && d.spoils && today() - day > d.spoils); }
  function grocName(id, n) { var d = GROCERIES[id]; return n + ' ' + d.unit + (n === 1 ? '' : (/sh$|ch$/.test(d.unit) ? 'es' : 's')); }
  function exposeGroceries() { var prev = G.groceries || {}; G.groceries = {
    CATALOG: GROCERIES, count: grocCount, total: grocTotal, add: grocAdd, take: grocTake,
    list: function () { var g = groc(); return Object.keys(g).filter(function (k) { return g[k].length; }).map(function (k) { return { id: k, label: GROCERIES[k] ? GROCERIES[k].label : k, count: g[k].length, off: g[k].filter(function (d) { return isOff(k, d); }).length }; }); },
    spoiled: function (id) { return (groc()[id] || []).filter(function (d) { return isOff(id, d); }).length; },
    limit: prev.limit
  }; }
  // Engine sections (engine.js sectionOf): label guesses misfile priced food/drink as Shop, so tag ours explicitly.
  var SECTION_RX = [
    [/pass out|collapse/i, 'needs'],
    [/meal|snack|coffee|tea|water|cook|noodles|shower|clean yourself|clean up|rinse|fresh clothes|restroom|somewhere to|brief|cover yourself|hold it/i, 'needs'],
    [/appearance|laundry|mend/i, 'self'],
    [/swim|treadmill|weights|yoga|jog|meditate|people-watch/i, 'here']
  ];
  var ICON_RX = [
    [/restroom|somewhere to/i, '🚻'], [/brief/i, '🩲'], [/cover yourself/i, '🫣'], [/water/i, '💧'], [/coffee|tea\b/i, '☕'],
    [/meal|snack|cook|noodles|eat |bread|apple|crisps|eggs|milk/i, '🍽️'], [/shower|clean yourself|rinse/i, '🚿'], [/^sleep/i, '🛏️'], [/nap/i, '💤'],
    [/medicine/i, '💊'], [/meditate/i, '🧘'], [/people-watch/i, '👀'], [/appearance/i, '💄'], [/laundry/i, '🧺'], [/mend/i, '🪡'],
    [/fresh clothes/i, '👕'], [/swim/i, '🏊'], [/jog|treadmill/i, '🏃'], [/weights/i, '🏋️'], [/yoga/i, '🧘']
  ];
  // Default effects (shown under the label by the engine): ^ good, ! bad. Options may set their own.
  var EFFECT_RX = [
    [/^Drink some water/i, ['^−Thirst', '!+Bladder']],
    [/^Take a shower/i, ['^+Hygiene', '^−Stress', '^+Beauty']],
    [/^Rinse out your soiled/i, ['^Removes the smell', '!Clothes left wet', '^Dry them after']],
    [/^Clean yourself up/i, ['^+Hygiene']],
    [/^Clean up and dry off/i, ['^Clean', '^Then rinse and dry your clothes']],
    [/^Sleep/i, ['^−Fatigue', '^−Stress']],
    [/^Nap/i, ['^−Fatigue (a little)']],
    [/^Change into fresh clothes/i, ['^Dry, clean clothes', '^−Stress']],
    [/^Do laundry/i, ['^Clean outfits', '^+Housekeeping', '!−$3']],
    [/^Mend your clothes/i, ['^+Clothing integrity', '^+Housekeeping']],
    [/^Go for a jog/i, ['^+Physique', '^+Athletics', '^−Stress', '!+Fatigue', '!+Thirst']],
    [/^Meditate/i, ['^+Willpower', '^−Stress']],
    [/^Take time on your appearance/i, ['^+Beauty', '^−Stress']],
    [/^People-watch/i, ['^+Awareness', '^−Stress']],
    [/honey-lemon tea/i, ['^Eases your cold', '^−Thirst', '^−Stress', '!−$2']],
    [/cold medicine/i, ['^Cold clears faster', '!−$6']],
    [/^Cover yourself/i, ['^Noticed less often', '^−Stress']]
  ];
  function tagSections(out) {
    // During another module's step scene (shift, date, shopping...) keep toilet options reachable so a long scene can't force an accident.
    var lk = G.state.lock, otherScene = lk && lk.reason !== 'stats-scene' && /-scene$|^world-shop$/.test(lk.reason || '');
    ['actions', 'other'].forEach(function (k) { (out[k] || []).forEach(function (o) {
      if (o && otherScene && /^(Use the restroom|Pee in your brief|Go in your brief|Cover yourself|Hold it|Rinse out your soiled|Clean up and dry off)/.test(o.label)) o.always = true;
      if (o && !o.effects) for (var e = 0; e < EFFECT_RX.length; e++) if (EFFECT_RX[e][0].test(o.label)) { o.effects = EFFECT_RX[e][1]; break; }
      if (o && !o.icon) for (var j = 0; j < ICON_RX.length; j++) if (ICON_RX[j][0].test(o.label)) { o.icon = ICON_RX[j][1]; break; }
      if (!o || o.section || o.sub === 'Groceries' || /cold medicine/i.test(o.label)) return;
      for (var i = 0; i < SECTION_RX.length; i++) if (SECTION_RX[i][0].test(o.label)) { o.section = SECTION_RX[i][1]; return; }
    }); });
  }
  function groceryOptions(out, n, home) {
    var hid = here().id;
    // Ron's basket scene (world.js) is the market's way to shop and fills the Bag via G.groceries.add; keep this list only as a fallback.
    if (hid === 'market' && !(G.world && typeof G.world.isOpen === 'function')) {
      var full = grocTotal(), lim = grocLimit();
      Object.keys(GROCERIES).forEach(function (k) {
        var d = GROCERIES[k], tooMany = full + d.qty > lim, broke = money() < d.price;
        out.actions.push(opt('Buy ' + d.label.charAt(0).toLowerCase() + d.label.slice(1) + ' ($' + d.price + ')', function () {
          addMoney(-d.price); grocAdd(k, d.qty); attitude('spending', 1);
          if (G.emit) G.emit('groceriesBought', { id: k, qty: d.qty, price: d.price });
          return { text: '<p>You pop the ' + d.label.toLowerCase() + ' in your basket and pay at the till. (' + grocName(k, d.qty) + ')</p>', minutes: 2 };
        }, { sub: 'Groceries', time: 2, disabled: tooMany || broke, reason: broke ? 'Needs $' + d.price : tooMany ? 'Your bag is full' : null, effects: ['!−$' + d.price], hint: broke ? 'Not enough money' : tooMany ? 'You can\'t carry any more groceries' : d.verb ? d.verb + ': ' + (d.hunger ? 'hunger +' + d.hunger + ' ' : '') + (d.thirst > 0 ? 'thirst +' + d.thirst : '') : 'Cooking ingredient' }));
      });
    }
    // Eat or drink what you're carrying
    Object.keys(GROCERIES).forEach(function (k) {
      var d = GROCERIES[k]; if (!d.verb || !grocCount(k)) return;
      if (d.needsHome && !home) return;
      var useful = (d.hunger && n.hunger < 900) || (d.thirst > 0 && n.thirst < 900);
      if (!useful) return;
      var lbl = d.verb === 'Make' ? 'Make a pot of instant noodles' : d.verb + ' ' + (d.verb === 'Drink' ? (k === 'milk' ? 'a glass of milk' : 'a bottle of water') : (k === 'fruit' ? 'an apple' : k === 'bread' ? 'a slice of bread' : 'some crisps'));
      out.actions.push(opt(lbl + ' (' + grocCount(k) + ' left)', function () {
        var day = grocTake(k), off = isOff(k, day);
        if (d.hunger) chg('needs.hunger', d.hunger);
        if (d.thirst) chg('needs.thirst', d.thirst);
        ate((d.hunger ? Math.round(d.hunger / 6) : 0) + (d.bowels || 0));
        if (d.thirst > 100) drank(k === 'milk' ? 'milk' : 'water', Math.round(d.thirst / 2.5));
        if (off) { maybePoison(0.5); return { text: '<p>' + (k === 'milk' ? 'One sip and you know. The milk has gone off.' : 'It tastes stale and a bit off. You finish it anyway.') + '</p>', minutes: d.mins }; }
        return { text: '<p>' + (GROC_ALT[k] && Math.random() < 0.6 ? pick(GROC_ALT[k]) : d.text) + flavorTint() + '</p>', minutes: d.mins };
      }, { sub: 'Your groceries', time: d.mins, effects: [].concat(d.hunger ? ['^−Hunger'] : [], d.thirst > 0 ? ['^−Thirst'] : d.thirst < 0 ? ['!+Thirst'] : []) }));
    });
    // Cook a proper meal from ingredients
    if ((home || hid === 'dorm_hall') && n.hunger < 800) {
      var recipe = grocCount('pasta') ? ['pasta', 1, 'pasta with sauce'] : (grocCount('eggs') >= 2 && grocCount('bread')) ? ['eggs', 2, 'eggs on toast'] : null;
      if (recipe) out.actions.push(opt('Cook ' + recipe[2], function () {
        var anyOff = false;
        for (var i = 0; i < recipe[1]; i++) { if (isOff(recipe[0], grocTake(recipe[0]))) anyOff = true; }
        if (recipe[0] === 'eggs' && isOff('bread', grocTake('bread'))) anyOff = true;
        var skill = S().skills.cooking || 0, bonus = Math.round(skill / 10);
        chg('needs.hunger', 480 + bonus); chg('needs.stress', -20); chg('needs.thirst', 20);
        ate(75); trainSkill('cooking', 8);
        if (hasTrait('homeCook')) { chg('needs.hunger', 110); chg('needs.stress', -20); }
        if (anyOff) maybePoison(0.4); else dollTemp('happy', 90);
        return { text: '<p>You cook ' + recipe[2] + ' in the shared kitchen and eat it while it\'s hot. Proper food, and cheaper than eating out. ' + flav('cook') + (anyOff ? ' One of the ingredients smelled a little past it.' : '') + '</p>', minutes: 30 };
      }, { sub: 'Your groceries', time: 30, effects: ['^−Hunger', '^−Stress', '^+Cooking'] }));
    }
  }

  // ---------- short multi-step scenes (restroom, meals, gym) ----------
  // State lives in stats.flags.scene = { kind, loc, t, ... }. While one is open we hold G.state.lock
  // (reason 'stats-scene') so only the scene's steps show; the last step is always a way out.
  function nowMin() { return (G.state.world && G.state.world.minutes) || 0; }
  function startScene(kind, data) {
    var sc = { kind: kind, loc: here().id, t: nowMin() };
    if (data) for (var k in data) sc[k] = data[k];
    S().flags.scene = sc;
    if (!G.state.lock) G.state.lock = { reason: 'stats-scene', allow: [] };
  }
  function endScene() {
    S().flags.scene = null;
    if (G.state.lock && G.state.lock.reason === 'stats-scene') G.state.lock = null;
  }
  function sceneValid() {
    var sc = S().flags.scene;
    if (sc && (sc.loc !== here().id || nowMin() - sc.t > 120 || S().flags.collapse || S().flags.sleeping)) { endScene(); sc = null; }
    if (!sc && G.state.lock && G.state.lock.reason === 'stats-scene') G.state.lock = null;
    return sc;
  }
  function step(label, run, extra) {
    var o = opt(label, run, extra); o.always = true; o.section = 'now'; return o;
  }
  function leaveStep(label, text, mins) {
    return step(label, function () { endScene(); return { text: '<p>' + text + '</p>', minutes: mins || 1 }; }, { time: mins || 1, icon: '🚪' });
  }
  function sceneOptions(sc) {
    var s = S(), n = s.needs, list = [];
    if (sc.kind === 'restroom') {
      if (n.bowels >= 300) list.push(step('Stay a bit longer', function () {
        n.bowels = 0; sc.relief = true;
        return { text: '<p>' + pick(['You take your time. Better now.', 'It takes a few minutes, but you\'re done.', 'You sit a while longer and finish up.']) + '</p>', minutes: 7 };
      }, { time: 7, icon: '🚻', effects: ['^−Bowels'] }));
      if (n.stress >= 300 && !sc.breather) list.push(step('Take a quiet minute', function () {
        sc.breather = true; chg('needs.stress', -25);
        return { text: '<p>' + pick(['You lean on the stall door and just breathe for a moment.', 'A minute to yourself, away from everyone. It helps.']) + '</p>', minutes: 3 };
      }, { time: 3, icon: '🫧', effects: ['^−Stress'] }));
      cleanupSteps(sc, list);
      list.push(step('Wash your hands and go', function () {
        endScene(); if (sc.relief) chg('needs.stress', -30);
        return { text: '<p>' + pick(['You wash your hands and head out.', 'A quick rinse at the sink and you\'re back out.', 'Hands washed, you step back out.']) + (sc.relief ? ' The relief is enormous.' : '') + '</p>', minutes: 1 };
      }, { time: 1, icon: '🚪', effects: sc.relief ? ['^−Stress'] : null }));
    } else if (sc.kind === 'cafmeal') {
      if (!sc.finished) list.push(step('Finish your plate', function () {
        sc.finished = true; dollTemp('happy', 70); chg('needs.hunger', 200); chg('needs.thirst', 60); ate(45); chg('needs.stress', -15);
        return { text: '<p>' + pick(['You clear the plate.', 'You finish every last bite.', 'You eat the rest more slowly.']) + '</p>', minutes: 10 };
      }, { time: 10, icon: '🍽️', effects: ['^−Hunger', '^−Stress'] }));
      if (!sc.drink) list.push(step('Get a glass of water', function () {
        sc.drink = true; chg('needs.thirst', 150); drank('water', 70);
        return { text: '<p>You fill a glass at the dispenser and drink it.</p>', minutes: 2 };
      }, { time: 2, icon: '💧', effects: ['^−Thirst', '!+Bladder'] }));
      list.push(leaveStep('Clear your tray and leave', sc.finished ? 'You stack your tray and head off.' : 'You leave the rest and head off.', 1));
    } else if (sc.kind === 'cook') {
      var eat = function (slow) {
        return function () {
          endScene(); dollTemp('happy', slow ? 85 : 70); var bonus = hasTrait('homeCook') ? 110 : 0;
          chg('needs.hunger', 450 + bonus); chg('needs.thirst', 40); ate(70);
          chg('needs.stress', (slow ? -35 : 0) - (bonus ? 20 : 0));
          return { text: '<p>' + (slow ? pick(['You sit down and eat slowly. It\'s nice to stop for a while.', 'You eat by the window and let your mind wander.']) : pick(['You eat at your desk. Not fancy, but filling.', 'You eat straight from the pan. Filling enough.'])) + '</p>', minutes: slow ? 25 : 10 };
        };
      };
      list.push(step('Eat at your desk', eat(false), { time: 10, icon: '🍽️', effects: ['^−Hunger'] }));
      list.push(step('Sit down and eat slowly', eat(true), { time: 25, icon: '🍽️', effects: ['^−Hunger', '^−Stress'] }));
      list.push(step('Eat a few bites and go', function () {
        endScene(); chg('needs.hunger', 150);
        return { text: '<p>You eat a few bites standing up and leave the rest.</p>', minutes: 3 };
      }, { time: 3, icon: '🚪', effects: ['^−Hunger (a little)'] }));
    } else if (sc.kind === 'gym') {
      var g = null; GYM.forEach(function (x) { if (x.id === sc.id) g = x; });
      if (g && !sc.extra && n.fatigue < 800) list.push(step('Push for one more set', function () {
        sc.extra = true; train('physique', rnd(g.phys / 2)); trainSkill('athletics', Math.ceil(g.ath / 2));
        chg('needs.fatigue', rnd(g.fat / 2 * (hasTrait('gymRat') ? 0.7 : 1))); chg('needs.thirst', rnd(g.thirst / 2));
        return { text: '<p>' + pick(['One more round. It\'s harder this time, but you finish it.', 'You push through one more set. Your legs are shaking afterwards.']) + '</p>', minutes: 15 };
      }, { time: 15, icon: '💪', effects: ['^+Physique', '^+Athletics', '!+Fatigue', '!+Thirst'] }));
      if (!sc.cool) list.push(step('Cool down and stretch', function () {
        sc.cool = true; chg('needs.stress', -20); S().illness.sore = Math.max(0, (S().illness.sore || 0) - 300);
        return { text: '<p>You walk it off and stretch until your breathing settles.</p>', minutes: 10 };
      }, { time: 10, icon: '🧘', effects: ['^−Stress', '^−Soreness'] }));
      list.push(leaveStep('Grab your things and go', 'You pick up your bag and head out.', 1));
    }
    return list;
  }

  function getOptions() {
    var s = S(), n = s.needs, c = s.clothing;
    var out = { dialogue: [], actions: [], travel: [], other: [] };
    if (s.flags.collapse) { out.actions.push(collapseOption()); return out; }
    var sc = sceneValid();
    if (sc) { out.actions = sceneOptions(sc); return out; }

    var rr = hereHas('restroom'), water = hereHas('water'), food = hereHas('food'), home = hereHas('home');
    var hid0 = here().id, broken = rr === true && knownOut(hid0);
    var canRestroom = rr === null ? true : (rr && !broken);
    bb();

    if (broken && (n.bladder >= 150 || n.bowels >= 150)) out.actions.push(opt('Use the restroom', function () { return { text: '', minutes: 0 }; }, { time: 3, disabled: true, reason: 'Out of order today' }));
    if (canRestroom && (n.bladder >= 150 || n.bowels >= 150)) {
      out.actions.push(opt('Use the restroom', function () {
        var hid = here().id, pre = '', wait = 0, leakHtml = '';
        if (rr !== null && outOfOrder(hid)) {
          markOut(hid); addStress(urgeLevel() >= 5 ? 25 : 10);
          var lk = urgeLevel() >= 6 && Math.random() < 0.3 ? leak('queue', 2, true).html : '';
          return { text: '<p>' + pick(['A sign is taped to the door: OUT OF ORDER. SORRY. The water is off and the stalls are taped shut.', 'The restroom is closed for cleaning, with a yellow sign and a bucket blocking the door. The cleaner says it\'ll be "a while".']) + ' You\'ll have to find another one.</p>' + lk, minutes: 2 };
        }
        var hic = rr !== null ? restroomHiccup(hid) : null;
        if (hic) { pre = hic.text; wait = hic.minutes; if (hic.leak) leakHtml = leak('queue', wait + 3, true).html; }
        var relief = n.bladder >= 600 || n.bowels >= 600, bowelsOnly = n.bladder < 150;
        n.bladder = 0; if (bowelsOnly) n.bowels = 0;
        if (!home) attitude('publicRestroom', 2);
        startScene('restroom', { relief: relief });
        return { text: (pre ? '<p>' + pre + '</p>' : '') + leakHtml + '<p>' + (relief ? pick(['You finally get the door shut and go. The relief is so strong your knees nearly give.', 'You make it. Just. You let out a long breath as the pressure finally eases.']) + ' ' : '') + flav('restroom') + '</p>', minutes: (bowelsOnly ? 8 : 3) + wait };
      }, { time: function () { return n.bladder < 150 ? 8 : 3; }, effects: function () { return n.bladder >= 150 ? ['^−Bladder'] : ['^−Bowels']; } }));
    }
    if ((rr === false || broken) && !home && (n.bladder >= 350 || n.bowels >= 350) && G.world && typeof G.world.teleport === 'function' && typeof G.world.neighbours === 'function') out.actions.push(lookOption());
    if ((rr === false || broken) && !home && (n.bladder >= 400 || n.bowels >= 400)) out.actions.push(reliefOption());
    var lkd = G.state.lock, otherLock = lkd && lkd.reason !== 'stats-scene';
    if (holdTarget() && !holdKind() && (!canRestroom || otherLock || (G.world && G.world.isOpen && rr && here().open && !G.world.isOpen(hid0)))) out.actions.push(holdOption());
    if (exposedNow() && inPublic() && !S().flags.covering) out.actions.push(coverOption());
    if (!home && wearingBrief() && (n.bladder >= 300 || n.bowels >= 300)) out.actions.push(briefOption());
    if (isSoiled() && canRestroom) {
      out.actions.push(opt('Rinse out your soiled clothes at the sink', function () {
        var sc0 = { kind: 'restroom', relief: false }; var r0 = rinseClothes(sc0);
        startScene('restroom', { relief: false, rinsed: true, washed: true, cleanup: true });
        return r0;
      }, { time: 20 }));
    } else if (s.soiled.wet >= 15 && canRestroom) {
      out.actions.push(opt('Clean up and dry off in the restroom', function () {
        var r0 = cleanSelf(null); startScene('restroom', { relief: false, washed: true, cleanup: true });
        return r0;
      }, { time: 8, effects: ['^Clean', '^Then rinse and dry your clothes'] }));
    } else if (s.flags.dirty && !isSoiled() && canRestroom) {
      out.actions.push(opt('Clean yourself up', function () {
        s.flags.dirty = false; c.lowerWetness = Math.max(0, c.lowerWetness - 30); s.soiled.wet = Math.max(0, s.soiled.wet - 30);
        return { text: '<p>You clean up as best you can at the sink. Your clothes are still damp, but you feel a little more human.</p>', minutes: 10 };
      }));
    }
    if ((water === null ? true : water) && n.thirst < 900) {
      out.actions.push(opt('Drink some water', function () {
        chg('needs.thirst', 300); drank('water');
        if (hasPoison()) S().illness.food = Math.max(0, S().illness.food - 90);
        return { text: '<p>' + flav('water') + '</p>', minutes: 2 };
      }, { effects: ['^−Thirst', '!+Bladder (over the next hour)'] }));
    }
    if (n.hunger < 850 && (food === null || food || home)) {
      var mealCost = home ? 2 : 4, mealBroke = money() < mealCost;
      out.actions.push(opt(home ? 'Make a cheap meal ($2)' : 'Buy a snack ($4)', function () {
        if (money() < mealCost) return { text: '<p>You don\'t have enough money.</p>', minutes: 1 };
        addMoney(-mealCost);
        if (home) {
          trainSkill('cooking', 6); startScene('cook');
          return { text: '<p>' + pick(['You cook something simple. It smells good.', 'Pasta, butter, a bit of cheese. Done.', 'You throw together what you have. It\'ll do.']) + '</p>', minutes: 20 };
        }
        chg('needs.hunger', 220); chg('needs.thirst', 40); ate(60);
        maybePoison(['market', 'bar', 'alley', 'docks'].indexOf(here().id) !== -1 ? 0.05 : 0.025);
        attitude('spending', 1);
        return { text: '<p>You grab something quick and eat it on the go.</p>', minutes: 10 };
      }, { time: home ? 20 : 10, disabled: mealBroke, reason: mealBroke ? 'Needs $' + mealCost : null,
        effects: home ? ['!−$2', '^+Cooking'] : ['^−Hunger', '!−$4'] }));
    }
    var hid = here().id;
    if (hid === 'cafeteria' && n.hunger < 850) {
      var swipes = s.flags.swipeDay === today() ? s.flags.swipes : 3;
      out.actions.push(opt(swipes > 0 ? 'Eat a meal-plan meal (' + swipes + ' swipes left today)' : 'Eat a meal-plan meal', function () {
        if (swipes <= 0) return { text: '<p>Your card is out of swipes for today.</p>', minutes: 1 };
        s.flags.swipeDay = today(); s.flags.swipes = swipes - 1;
        chg('needs.hunger', 300); chg('needs.thirst', 60); ate(60);
        startScene('cafmeal');
        var dish = ['shepherd\'s pie', 'a veggie curry', 'pasta bake', 'a turkey sandwich and soup', 'fish and chips'][Math.floor(Math.random() * 5)];
        return { text: '<p>You swipe your student card and sit down with ' + dish + '. ' + pick(['It isn\'t gourmet, but it\'s hot and free.', 'The cafeteria is loud and steamy, and the food is better than its reputation.', 'You eat with one eye on the room, listening to three conversations at once.', 'Someone at the next table is arguing about philosophy with their mouth full.']) + '</p>', minutes: 15 };
      }, { time: 15, disabled: swipes <= 0, reason: swipes <= 0 ? 'No swipes left today' : null, effects: ['^−Hunger', '^−Thirst'] }));
    }
    if ((hid === 'cafe' || hid === 'cafeteria') && n.fatigue >= 300) {
      out.actions.push(opt('Buy a coffee ($3)', function () {
        if (money() < 3) return { text: '<p>You don\'t have enough money.</p>', minutes: 1 };
        addMoney(-3); chg('needs.fatigue', -120); chg('needs.thirst', 80); drank('coffee'); n.bowels = clamp(n.bowels + 30, 0, MAX); ate(20); chg('needs.stress', 10);
        return { text: '<p>' + flav('coffee') + ' <span class="flavor">Coffee goes straight through you; you\'ll need a restroom sooner than usual.</span></p>', minutes: 10 };
      }, { time: 10, disabled: money() < 3, reason: money() < 3 ? 'Needs $3' : null, effects: ['^−Fatigue', '!++Bladder', '!−$3'] }));
    }
    if ((hid === 'dorm_hall' || hid === 'gym') && (s.flags.dirty || n.stress >= 200 || n.fatigue >= 400)) {
      out.actions.push(opt('Take a shower', function () {
        var wasDirty = s.flags.dirty || isSoiled() || s.soiled.wet >= 10;
        s.flags.dirty = false; chg('needs.stress', wasDirty ? -80 : -60); chg('needs.fatigue', -30); train('beauty', 4);
        if (!WR() && c.lowerSoiled) { c.lowerSoiled = false; c.lowerWetness = Math.max(c.lowerWetness, 50); }
        return { text: '<p>' + (wasDirty ? 'You peel off your clothes, bundle them up for the wash, and stand under the hot water until you feel clean again. The accident already feels further away. ' : '') + flav('shower') + '</p>', minutes: 15 };
      }));
    }
    if (home === true || home === null) {
      if (n.fatigue >= 250) {
        out.actions.push(opt('Sleep', function () {
          var hrs = Math.ceil(n.fatigue / 120); hrs = clamp(hrs, 2, 9);
          s.flags.sleeping = true; s.flags.sleptFull = hrs >= 7;
          chg('needs.stress', -80);
          return { text: '<p>' + flav(G.time && G.time.hour >= 7 && G.time.hour < 19 ? 'sleepDay' : 'sleepNight') + ' You sleep for about ' + hrs + ' hours.</p>', minutes: hrs * 60 };
        }, { time: function () { return clamp(Math.ceil(n.fatigue / 120), 2, 9) * 60; } }));
      } else out.actions.push(opt('Sleep', function () { return { text: '<p>You lie down, but you\'re not tired enough to sleep.</p>', minutes: 1 }; }, { time: 1, disabled: true, reason: 'Not tired enough' }));
      out.actions.push(opt('Nap for an hour', function () {
        s.flags.sleeping = true;
        return { text: '<p>' + flav('nap') + '</p>', minutes: 60 };
      }));
      var wardrobeOn = !!(G.wardrobe || window.Wardrobe);
      if (!wardrobeOn && c.spareOutfits > 0 && (c.lowerWetness > 20 || c.upperWetness > 20 || c.upperIntegrity < 50 || c.lowerIntegrity < 50 || s.flags.dirty)) {
        out.actions.push(opt('Change into fresh clothes', function () {
          var hadMess = c.lowerSoiled || s.soiled.wet >= 10;
          c.upperWetness = 0; c.lowerWetness = 0; c.upperIntegrity = 100; c.lowerIntegrity = 100; c.spareOutfits--; s.flags.dirty = false; c.lowerSoiled = false; s.soiled.wet = 0;
          chg('needs.stress', hadMess ? -40 : -20);
          return { text: '<p>' + (hadMess ? 'You strip off the wet, dirty clothes, wipe yourself down, and bag them up for the laundry. Clean, dry clothes have never felt so good. ' : '') + flav('change') + '</p>', minutes: 10 };
        }));
      }
      var pk0 = packOption(); if (pk0) out.actions.push(pk0);
      if (!wardrobeOn && c.spareOutfits < 3) {
        out.actions.push(opt('Do laundry ($3)', function () {
          if (money() < 3) return { text: '<p>You don\'t have enough for the machines.</p>', minutes: 1 };
          addMoney(-3); c.spareOutfits = 3; c.laundry = 0; trainSkill('housekeeping', 8);
          return { text: '<p>' + flav('laundry') + '</p>', minutes: 90 };
        }));
      }
      if (!wardrobeOn && (c.upperIntegrity < 80 || c.lowerIntegrity < 80)) {
        out.actions.push(opt('Mend your clothes', function () {
          var gain = 15 + S().skills.housekeeping / 40;
          c.upperIntegrity = clamp(c.upperIntegrity + gain, 0, 100); c.lowerIntegrity = clamp(c.lowerIntegrity + gain, 0, 100);
          trainSkill('housekeeping', 10);
          return { text: '<p>You stitch up the worst of the tears.</p>', minutes: 45 };
        }));
      }
    }
    if (hereHas('gym')) gymOptions(out);
    if (!hereHas('gym') && hereHas('outdoors')) {
      out.actions.push(opt('Go for a jog', function () {
        dollTemp('happy', 105); train('physique', 18); trainSkill('athletics', 10); chg('needs.fatigue', 90); chg('needs.thirst', -120); addStress(-40, 'hardWork'); attitude('hardWork', 1);
        return { text: '<p>' + flav('gym') + '</p>', minutes: 45 };
      }));
    }
    if (home === true || home === null || hereHas('quiet')) {
      out.actions.push(opt('Meditate', function () {
        train('willpower', 12); chg('needs.stress', -70);
        return { text: '<p>' + flav('meditate') + '</p>', minutes: 30 };
      }));
    }
    if (home === true || home === null) { // mirror actions only in your dorm room (Red: less clutter)
      out.actions.push(opt('Take time on your appearance', function () {
        train('beauty', 12); chg('needs.stress', -15);
        return { text: '<p>' + flav('groom') + '</p>', minutes: 30 };
      }));
    }
    if (hereHas('public')) {
      out.actions.push(opt('People-watch for a while', function () {
        attitude('crowds', 2);
        train('awareness', 12); chg('needs.stress', -10);
        return { text: '<p>' + flav('watch') + '</p>', minutes: 30 };
      }));
    }
    if (hasCold()) {
      var il = S().illness;
      if (hereHas('food') || here().id === 'cafe' || here().id === 'cafeteria') out.actions.push(opt('Sip a hot honey-lemon tea ($2)', function () {
        if (money() < 2) return { text: '<p>You count your change. Not enough for tea.</p>', minutes: 1 };
        addMoney(-2); il.cold = Math.max(0, il.cold - 240); chg('needs.thirst', 200); drank('tea'); chg('needs.stress', -40);
        return { text: '<p>The tea is too hot at first, then exactly right. The steam clears your head a little. <span class="flavor">(Thirst up, stress down, your cold eases a bit.)</span></p>', minutes: 20 };
      }, { time: 20 }));
      if (here().id === 'market') out.actions.push(opt('Buy cold medicine ($6)', function () {
        if (money() < 6) return { text: '<p>The cold medicine costs $6, and you don\'t have it.</p>', minutes: 2 };
        addMoney(-6); il.cold = Math.floor(il.cold / 2);
        return { text: '<p>You pick up a box of cold tablets and take one with water at the counter. Within the hour things feel a little less foggy. <span class="flavor">(Your cold will clear about twice as fast.)</span></p>', minutes: 10 };
      }));
    }
    groceryOptions(out, n, home);
    // the mirror self-check now lives in Lucy's 'Look in a mirror' (creation.js), which can call G.stats.selfDescription()
    tagSections(out);
    return out;
  }

  // ---------- descriptions ----------
  function needWord(k, v) {
    var inv = (k === 'thirst' || k === 'hunger' || k === 'control');
    var lvl = inv ? (v > 750 ? 0 : v > 500 ? 1 : v > 250 ? 2 : 3) : (v < 250 ? 0 : v < 500 ? 1 : v < 750 ? 2 : 3);
    var words = {
      fatigue: ['Rested', 'A little tired', 'Tired', 'Exhausted'],
      stress:  ['Calm', 'A bit tense', 'Stressed', 'Overwhelmed'],
      control: ['Composed', 'Steady', 'Shaky', 'Barely holding on'],
      bladder: ['Fine', 'Could go', 'Need to go', 'Desperate'],
      bowels:  ['Fine', 'Could go', 'Need to go', 'Urgent'],
      thirst:  ['Hydrated', 'A little thirsty', 'Thirsty', 'Parched'],
      hunger:  ['Full', 'Peckish', 'Hungry', 'Starving']
    };
    return words[k][lvl];
  }

  function selfDescription() {
    var n = S().needs, parts = [];
    Object.keys(NEEDS_INFO).forEach(function (k) { parts.push('<b>' + NEEDS_INFO[k].label + ':</b> ' + needWord(k, n[k])); });
    var d = debuffs();
    return '<p>You take a moment to check in with yourself.</p><p>' + parts.join('<br>') + '</p>' +
      (hasPoison() ? '<p>Your stomach is still upset from food poisoning. Keep drinking water and rest; it should pass within a day.</p>' : '') +
      (hasCold() ? '<p>You have a head cold. It should clear in about ' + Math.max(1, Math.round(S().illness.cold / 1440)) + ' day(s), sooner with rest.</p>' : '') +
      (needLevel('bladder', n.bladder) >= 3 ? '<p>' + urgeText('bladder') + '</p>' : '') +
      (needLevel('bowels', n.bowels) >= 3 ? '<p>' + urgeText('bowels') + '</p>' : '') +
      (soiledLine() ? '<p>' + soiledLine() + '</p>' : '') +
      hairLine() +
      (d.length ? '<p>Affecting you: ' + d.map(function (x) { return x.label; }).join(', ') + '.</p>' : '<p>Nothing is dragging you down right now.</p>');
  }

  function hairLine() { try { var h = window.Salon && Salon.hairNote ? Salon.hairNote() : ''; return h ? '<p>' + h + '</p>' : ''; } catch (e) { return ''; } }
  function wetWord(v) { return v < 5 ? 'Dry' : v < 30 ? 'Damp' : v < 65 ? 'Wet' : 'Soaked'; }
  function integWord(v) { return v > 85 ? 'Like new' : v > 60 ? 'Worn' : v > 35 ? 'Frayed' : v > 15 ? 'Torn' : 'Falling apart'; }
  function fameWord(v) { return v < 50 ? 'Unknown' : v < 200 ? 'Recognised by a few' : v < 450 ? 'Known around campus' : v < 750 ? 'Well known in town' : 'Famous in Hollowbrook'; }
  function crimeWord(v) { return v < 25 ? 'Clean record' : v < 150 ? 'A few suspicions' : v < 400 ? 'Known to the police' : v < 700 ? 'Wanted for questioning' : 'Notorious'; }

  // ---------- side panel & character menu ----------
  function panelHTML() {
    var n = S().needs, rows = ['<div class="stat-row"><b>Money</b> $' + money().toFixed(2) + '</div>'];
    Object.keys(NEEDS_INFO).forEach(function (k) {
      var inv = (k === 'thirst' || k === 'hunger' || k === 'control');
      rows.push('<div class="stat-row" title="' + NEEDS_INFO[k].flavor + '"><b>' + NEEDS_INFO[k].label + '</b> ' + rnd(n[k]) + '/1000 <i>' + needWord(k, n[k]) + '</i>' + bar(n[k], MAX, inv) + '</div>');
    });
    var d = debuffs();
    if (d.length) rows.push('<div class="stat-row debuffs">' + d.map(function (x) { return '<span class="debuff">' + x.label + '</span>'; }).join(' ') + '</div>');
    return rows.join('');
  }

  function tabCharacteristics() {
    var s = S(), h = ['<h3>Characteristics</h3><p class="flavor">Who you are becoming. Stats grow with use and slowly slip back when neglected.</p>'];
    var db = debuffs();
    h.push('<p class="flavor">' + (db.length ? 'Right now you are held back by: ' + db.map(function (x) { return x.label; }).join(', ') + '.' : 'Nothing is holding you back right now.') + '</p>');
    Object.keys(CORE).forEach(function (k) {
      var v = s.core[k].value, e = effective(k), f = CORE[k].flavor[clamp(Math.floor(tierIdx(e) / 2.2), 0, 4)];
      h.push('<div class="char-row"><b>' + CORE[k].label + '</b> ' + tierHTML(e) + (e !== v ? ' <small>(base ' + tier(v) + ')</small>' : '') + bar(e, MAX, true) + '<p class="flavor">' + f + '</p></div>');
    });
    h.push('<h4>Skills</h4>');
    Object.keys(s.skills).forEach(function (k) {
      h.push('<div class="char-row"><b>' + (SKILLS[k] ? SKILLS[k].label : k) + '</b> ' + tierHTML(s.skills[k]) + bar(s.skills[k], MAX, true) + (SKILLS[k] ? '<p class="flavor">' + SKILLS[k].flavor + '</p>' : '') + '</div>');
    });
    h.push('<h4>Traits</h4>');
    TRAITS.forEach(function (t) {
      var on = s.traits.indexOf(t.id) !== -1;
      h.push('<div class="trait ' + (on ? 'unlocked' : 'locked') + '"><b>' + (on ? '' : '🔒 ') + t.label + '</b>: ' + t.desc +
        (on ? '' : '<p class="flavor">How to unlock: ' + t.hint + ' ' + progressHint(t.id) + '</p>') + '</div>');
    });
    h.push('<h4>Attitudes</h4>');
    Object.keys(ATTITUDES).forEach(function (k) {
      var a = s.attitudes[k], A = ATTITUDES[k];
      var w = a <= -60 ? A.low : a >= 60 ? A.high : a < -15 ? 'Uneasy' : a > 15 ? 'Fairly comfortable' : 'Neutral';
      h.push('<div class="char-row"><b>' + A.label + '</b>: ' + w + '</div>');
    });
    var tk = Object.keys(s.transforms);
    if (tk.length) {
      h.push('<h4>Changes</h4>');
      tk.forEach(function (k) { h.push('<div class="trait"><b>' + TRANSFORMS[k].label + '</b> (stage ' + s.transforms[k] + '): ' + TRANSFORMS[k].stages[s.transforms[k]] + '</div>'); });
    }
    return h.join('');
  }

  function progressHint(id) {
    var s = S(), map = { charming: 'beauty', athletic: 'physique', steady: 'willpower', sharpEyed: 'awareness' };
    if (map[id]) return '(Now ' + tier(s.core[map[id]].value) + '.)';
    if (id === 'ironBladder') return '(Now ' + rnd(s.needs.control) + '.)';
    if (id === 'lightFingers') return '(Now ' + tier(s.skills.skulduggery) + '.)';
    var r = rec();
    if (id === 'nightOwl') return '(' + r.lateNights + '/5 nights.)';
    if (id === 'earlyBird') return '(' + r.earlyRises + '/5 mornings.)';
    if (id === 'resilient') return '(' + r.coldsBeaten + '/1 colds.)';
    if (id === 'gymRat') return '(' + r.workouts + '/20 workouts.)';
    if (id === 'castIron') return '(' + r.poisoningsBeaten + '/1.)';
    if (id === 'homeCook') return '(Now ' + tier(S().skills.cooking || 0) + '.)';
    if (id === 'socialButterfly') return '(Now ' + rnd(S().status.socialiteFame) + '/200.)';
    if (id === 'goodSamaritan') return '(Now ' + rnd(S().status.kindnessFame) + '/200.)';
    if (id === 'streetwise') return '(' + r.nightsOut + '/15 evenings.)';
    if (id === 'greenThumb') return '(Now ' + tier(s.skills.tending) + '.)';
    return '';
  }

  function tabStatus() {
    var s = S(), st = s.status, ss = null;
    try { ss = G.school && G.school.schoolStatus ? G.school.schoolStatus() : null; } catch (e) {}
    var delinq = ss ? ss.delinquency : 0;
    var delWord = delinq < 50 ? 'Model student' : delinq < 200 ? 'A few marks' : delinq < 500 ? 'On the dean\'s radar' : delinq < 800 ? 'Academic probation' : 'Facing expulsion';
    var grades = ss && ss.grades && ss.grades.length ? '<ul class="grades">' + ss.grades.map(function (g) { return '<li>' + g.subject + ': ' + g.letter + ' (' + g.pct + '%)</li>'; }).join('') + '</ul>' : '';
    return '<h3>Status</h3><p class="flavor">How the town and the college see you.</p>' +
      '<div class="char-row"><b>School status</b>: ' + (ss ? ss.standing + ', average ' + ss.gpaLetter + ', attendance ' + ss.attendance : 'Enrolled at Hollowbrook College') + grades + '</div>' +
      '<div class="char-row"><b>School delinquency</b>: ' + delWord + bar(delinq, MAX) + (ss ? '<p class="flavor">' + ss.flavor.delinquency + '</p>' : '') + '</div>' +
      '<div class="char-row"><b>Crime</b>: ' + crimeWord(st.crime) + bar(st.crime, MAX) + (ss ? '<p class="flavor">' + ss.flavor.crime + '</p>' : '') + '</div>' +
      '<div class="char-row"><b>Kindness fame</b>: ' + fameWord(st.kindnessFame) + '<p class="flavor">Known for helping people.</p></div>' +
      '<div class="char-row"><b>Business fame</b>: ' + fameWord(st.businessFame) + '<p class="flavor">Known as someone who gets work done.</p></div>' +
      '<div class="char-row"><b>Socialite fame</b>: ' + fameWord(st.socialiteFame) + '<p class="flavor">Known at parties and around town.</p></div>';
  }

  function tabClothing() {
    var c = S().clothing;
    return '<h3>Clothing</h3><p class="flavor">What you\'re wearing and how it\'s holding up. Wet or damaged clothes make people look at you differently.</p>' +
      '<div class="char-row"><b>Upper wetness</b>: ' + wetWord(c.upperWetness) + bar(c.upperWetness, 100) + '</div>' +
      '<div class="char-row"><b>Upper integrity</b>: ' + integWord(c.upperIntegrity) + bar(c.upperIntegrity, 100, true) + '</div>' +
      '<div class="char-row"><b>Lower wetness</b>: ' + wetWord(c.lowerWetness) + bar(c.lowerWetness, 100) + '</div>' +
      '<div class="char-row"><b>Lower integrity</b>: ' + integWord(c.lowerIntegrity) + bar(c.lowerIntegrity, 100, true) + '</div>' +
      (soiledLine() ? '<div class="char-row"><b>Lower clothing</b>: ' + soiledLine(true) + '<p class="flavor">' + soiledLine() + '</p></div>' : '') +
      ((c.carried || 0) > 0 ? '<div class="char-row"><b>In your bag</b>: a spare change of clothes</div>' : '') +
      '<div class="char-row"><b>Clean outfits at home</b>: ' + c.spareOutfits + '</div>';
  }

  function tabNeeds() {
    var s = bb(), n = s.needs, it = s.intake, h = ['<h3>Needs</h3><p class="flavor">How your body is doing right now.</p>'];
    Object.keys(NEEDS_INFO).forEach(function (k) {
      var inv = (k === 'thirst' || k === 'hunger' || k === 'control');
      h.push('<div class="char-row"><b>' + NEEDS_INFO[k].label + '</b>: ' + needWords(k) + bar(n[k], MAX, inv) + '</div>');
    });
    h.push('<h4>Restroom</h4><p>' + urgeText('bladder') + '</p><p>' + urgeText('bowels') + '</p>');
    var notes = [];
    if (it.caffeine > 0) notes.push('Caffeine is still working through you, so your bladder is filling faster than usual.');
    else if (it.diuretic > 0) notes.push('The drinks are going straight through you.');
    if (it.fluid > 60) notes.push('You\'ve had a fair bit to drink recently. You\'ll feel it within the hour.');
    if (it.food > 60) notes.push('Your last meal is still settling. You\'ll need the restroom in a few hours.');
    if (chilled()) notes.push('The cold and wet make you need to go more often.');
    if (n.stress >= 600) notes.push('Stress is churning your stomach.');
    if (urgeLevel() >= 4) notes.push('It\'s hard to concentrate: skill checks are harder until you go.');
    if (s.urge.holds) notes.push('Holding it in again will be harder (' + s.urge.holds + ' time' + (s.urge.holds > 1 ? 's' : '') + ' so far).');
    if (notes.length) h.push('<p class="flavor">' + notes.join(' ') + '</p>');
    var sl = soiledLine();
    h.push('<h4>Clothes</h4><p>' + (sl || 'Clean and dry.') + '</p>');
    if ((s.clothing.carried || 0) > 0) h.push('<p class="flavor">You have a spare change of clothes in your bag.</p>');
    return h.join('');
  }
  function bannerHtml() {
    try {
      if (!G.state || !G.state.stats || !G.state.stats.needs) return null;
      var s = bb(), bits = [], sl = soiledLine(true);
      if (sl) bits.push('🫣 ' + sl);
      var hk = holdKind(); if (hk) bits.push('😣 Holding it (about ' + Math.max(1, Math.round(s.urge.hold.until - nowMin())) + ' min)');
      return bits.length ? '<span class="bb-banner">' + bits.join(' · ') + '</span>' : null;
    } catch (e) { return null; }
  }

  // ---------- public API for other modules ----------
  var api = {
    TIERS: TIERS, tier: tier, tierIdx: tierIdx,
    effective: effective,             // effective core stat after debuffs/traits/transforms
    check: function (stat, base) { // skill/stat check: returns true/false (same odds difficulty() describes)
      return Math.random() < checkChance(stat, base || 500);
    },
    // UI helpers: needWords(id, value?) -> phrase, needLevel -> 0 (fine)..6 (critical); difficulty(stat, base?) -> 'Simple'..'Very Hard'
    needWords: needWords, needLevel: needLevel, NEED_WORDS: NEED_WORDS,
    difficulty: difficulty, difficultyInfo: difficultyInfo, difficultyFromChance: difficultyFromChance, chance: checkChance,
    tierHTML: tierHTML, tierColor: tierColor,
    train: train, trainSkill: trainSkill, attitude: attitude, addStress: addStress,
    transform: transform, hasTrait: hasTrait, debuffs: debuffs,
    fame: function (kind, d) { chg('status.' + kind + 'Fame', d); },
    crime: function (d) { chg('status.crime', d); },
    soiled: isSoiled,
    // bladder & bowels: drank(kind, points?) kind water|coffee|tea|milk|juice|soda|alcohol; ate(points); urgency(kind) -> {level, text, holding};
    // soiledState() -> {wet, mess, dirty, since, leaks, kind, text}; focusPenalty() 0..0.35; urgePenalty() points off skill checks;
    // holding() -> 'bladder'|'bowels'|'both'|null; mustGo() true at the last level; soiledNoticeMult() 1..2 for wet/soiled notice odds;
    // restroomOutOfOrder(id?) for today; urgeText(kind) for status text.
    drank: drank, ate: ate, soiledState: soiledState, focusPenalty: focusPenalty, urgePenalty: urgePenalty,
    urgency: function (kind) { var n = S().needs; kind = kind || (n.bladder >= n.bowels ? 'bladder' : 'bowels'); return { kind: kind, level: needLevel(kind, n[kind]), text: urgeText(kind), holding: holdingFor(kind) }; },
    urgeText: urgeText, holding: function () { return holdKind(); }, mustGo: function () { return urgeLevel() >= 6; },
    soiledNoticeMult: soiledNoticeMult, restroomOutOfOrder: function (id) { return outOfOrder(id || here().id); },
    // undressed in public: covering() is true after "Cover yourself"; multiply notice chances by noticeMult() (0.5 while covering)
    VOLUME: VOLUME,
    exposed: function () { return exposedNow() && inPublic(); }, covering: covering, noticeMult: noticeMult,
    // creation hooks
    bodySize: bodySize, sizeMod: sizeMod, carryMult: carryMult, attentionMult: attentionMult, background: backgroundId,
    BACKGROUNDS: BACKGROUNDS, BG_SUMMARY: BG_SUMMARY, SIZE_SUMMARY: SIZE_SUMMARY, applyBackground: applyBackground,
    physicalChance: function (p) { return clamp((+p || 0) + sizeMod() / MAX, 0, 1); },
    money: money, addMoney: addMoney,
    panelHTML: panelHTML,
    tabs: { Characteristics: tabCharacteristics, Needs: tabNeeds, Status: tabStatus, Clothing: tabClothing },
    selfDescription: selfDescription
  };

  function boot() {
    if (!window.G || !G.register) return setTimeout(boot, 20);
    G.stats = api;
    G.difficulty = difficulty;
    exposeGroceries();
    G.register({
      id: 'stats',
      init: function (state) {
        var fresh = freshState();
        if (!state.stats) state.stats = fresh;
        else Object.keys(fresh).forEach(function (k) { if (state.stats[k] === undefined) state.stats[k] = fresh[k]; });
        if (G.on && !G._statsHooked) {
          G._statsHooked = true;
          G.on('newDay', onNewDay);
          if (G.addBanner) G.addBanner(bannerHtml);
          G.on('creationDone', function () {
            var w = (G.state.creation && G.state.creation.world) || {};
            if (typeof w.startMoney === 'number') G.state.money = w.startMoney;
            applyBackground();
          });
        }
        if (G.addTab) {
          G.addTab({ id: 'characteristics', label: 'Characteristics', order: 10, render: tabCharacteristics });
          G.addTab({ id: 'needs', label: 'Needs', order: 15, render: tabNeeds });
          G.addTab({ id: 'status', label: 'Status', order: 20, render: tabStatus });
          G.addTab({ id: 'clothing', label: 'Clothing', order: 30, render: tabClothing });
        }
        if (G.limits) ['skills', 'status'].forEach(function (grp) {
          Object.keys(state.stats[grp]).forEach(function (k) { G.limits['stats.' + grp + '.' + k] = [0, MAX]; });
        });
        if (G.labels) {
          Object.keys(SKILLS).forEach(function (k) { G.labels['stats.skills.' + k] = SKILLS[k].label; });
          G.labels['stats.status.kindnessFame'] = 'Kindness fame'; G.labels['stats.status.businessFame'] = 'Business fame';
          G.labels['stats.status.socialiteFame'] = 'Socialite fame'; G.labels['stats.status.crime'] = 'Crime';
        }
        updateTraits();
      },
      onTick: function (minutes) { onTick(minutes); },
      getOptions: function () { return getOptions(); },
      menuTabs: api.tabs
    });
  }
  boot();
})();
