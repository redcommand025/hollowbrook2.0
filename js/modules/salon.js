/* salon.js - Snip & Curl hair salon + hair growth (owner: Lucy)
 * Location: hair_salon (defined by Ron in world.js, Shopping Centre, 9-18).
 * Owns G.state.hair: { length (cm), natural (colour id), dyed (bool), dyeDays, mode }
 * Reads/writes G.state.creation.player.hairStyle / hairColor, so the pixel sprite and descriptions update.
 * Hair grows about 1 cm a game week. Short cuts grow out into longer
 * styles on their own; dye grows out from the roots and is gone once the dyed length is cut or grown off.
 * Public: window.Salon = { STYLES, lengthWord(), hairNote(), grow(days) }
 * Events: emits 'hairChanged' {what: 'cut'|'dye'|'grow'|'style', style, color}.
 */
(function () {
  'use strict';
  var SALON = 'hair_salon', GROW = 1 / 7;   // about 1 cm a game week

  // ideal = length right after the cut; min = length needed; next/at = what it grows out into, and when
  var STYLES = {
    buzzed:   { label: 'buzz cut',        ideal: 1,  min: 0,  next: 'short',    at: 3 },
    short:    { label: 'short crop',      ideal: 5,  min: 2,  next: 'messy',    at: 9 },
    messy:    { label: 'messy shag',      ideal: 9,  min: 4,  next: 'shoulder', at: 18 },
    bob:      { label: 'chin-length bob', ideal: 14, min: 9,  next: 'shoulder', at: 21 },
    curly:    { label: 'curly perm',      ideal: 15, min: 6 },
    shoulder: { label: 'shoulder-length cut', ideal: 25, min: 18, next: 'long', at: 33 },
    long:     { label: 'long layers',     ideal: 40, min: 30 },
    ponytail: { label: 'ponytail',        ideal: 28, min: 20, tied: true },
    braid:    { label: 'braid',           ideal: 35, min: 25, tied: true }
  };
  var NATURAL = ['black', 'brown', 'chestnut', 'blonde', 'ginger', 'auburn', 'grey'];

  function G_() { return window.G; }
  function P() { var s = G_().state; return (s.creation && s.creation.player) || null; }
  function money() { return Number(G_().state.money) || 0; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function hereId() { var g = G_(); return g.world && g.world.hereId ? g.world.hereId() : (g.state.world || {}).location; }
  function hereTags() { var l = G_().world && G_().world.here ? G_().world.here() : null; return (l && l.tags) || []; }
  function isOpen(id) { return G_().world && G_().world.isOpen ? G_().world.isOpen(id) : true; }
  function opt(label, run, extra) { var o = { label: label, run: run }; if (extra) for (var k in extra) o[k] = extra[k]; return o; }
  function colours() { return (window.Creation && Creation.OPTIONS.hairColor) || NATURAL.map(function (c) { return [c, c]; }); }
  function colourName(id) { var c = colours().filter(function (x) { return x[0] === id; })[0]; return c ? c[1].toLowerCase() : id; }
  function train(n) { var g = G_(); if (g.stats && g.stats.train) try { g.stats.train('beauty', n); } catch (e) {} }

  function H() {
    var s = G_().state, p = P();
    if (!s.hair) {
      var st = p && STYLES[p.hairStyle] ? p.hairStyle : 'shoulder', col = p ? p.hairColor : 'brown';
      var dyed = NATURAL.indexOf(col) < 0;
      s.hair = { length: STYLES[st].ideal, natural: dyed ? 'brown' : col, dyed: dyed, dyeDays: dyed ? 10 : 0, mode: null };
    }
    return s.hair;
  }
  function emit(what) { var p = P(); if (G_().emit) G_().emit('hairChanged', { what: what, style: p && p.hairStyle, color: p && p.hairColor }); }
  function roots() { var h = H(); return h.dyed ? h.dyeDays * GROW : 0; }

  var BANDS = [[2, 'buzzed', 'cropped close to the scalp'], [7, 'short', 'short'], [13, 'ear', 'ear-length'], [19, 'chin', 'chin-length'],
    [30, 'shoulder', 'shoulder-length'], [50, 'midback', 'mid-back length'], [999, 'waist', 'waist-length']];
  function bandOf(cm) { cm = cm == null ? H().length : cm; for (var i = 0; i < BANDS.length; i++) if (cm < BANDS[i][0]) return BANDS[i]; return BANDS[BANDS.length - 1]; }
  function lengthWord(cm) { return bandOf(cm)[2]; }
  function daysSinceCut() { var h = H(); return (G_().time ? G_().time.day : 0) - (h.lastCut == null ? (G_().time ? G_().time.day : 0) : h.lastCut); }
  // scruffy: grown well past the cut, or six-plus weeks since a trim on a short style
  function scruffy() { var h = H(), p = P(), st = p && STYLES[p.hairStyle]; if (!st || st.tied || p.hairStyle === 'long') return false; return h.length > st.ideal + 3 || (st.ideal < 20 && daysSinceCut() > 42); }
  function rootsShowing() { return H().dyed && roots() >= 3; }
  function faded() { return H().dyed && H().dyeDays > 35; }
  function hairNote() {
    var h = H(), p = P(), st = p && STYLES[p.hairStyle], out = 'Your hair is ' + lengthWord() + ' (about ' + Math.round(h.length) + ' cm).';
    if (MK()) out += ' ' + makeupNote();
    if (scruffy()) out += ' The ' + st.label + ' has gone scruffy and could use a trim.';
    if (faded()) out += ' The dye has faded a few shades.';
    if (rootsShowing()) out += ' About ' + Math.round(roots()) + ' cm of ' + colourName(h.natural) + ' roots are showing.';
    return out;
  }

  // cutting removes the dyed ends first; once only new growth is left, the dye is gone
  function cutTo(cm) {
    var h = H(), p = P(); h.length = cm; h.lastCut = G_().time ? G_().time.day : 0;
    if (h.dyed && h.length <= roots()) { h.dyed = false; h.dyeDays = 0; p.hairColor = h.natural; return true; }
    return false;
  }

  function grow(days) {
    var h = H(), p = P(); if (!p) return;
    h.length = Math.min(90, h.length + GROW * (days || 1));
    if (h.dyed) h.dyeDays += (days || 1);
    var st = STYLES[p.hairStyle];
    if (st && st.next && h.length >= st.at) {
      p.hairStyle = st.next;
      G_().notify('Your ' + st.label + ' has grown out. Your hair is ' + lengthWord() + ' now.', 'info', 'hair-grow');
      emit('grow');
    }
    if (h.dyed && roots() >= h.length * 0.6) {
      h.dyed = false; h.dyeDays = 0; p.hairColor = h.natural;
      G_().notify('The last of the dye has faded out. Your hair is back to its natural ' + colourName(h.natural) + '.', 'info', 'hair-dye');
      emit('dye');
    } else if (h.dyed && roots() >= 3 && roots() - GROW * (days || 1) < 3) G_().notify('Your roots are starting to show.', 'info', 'hair-roots');
    if (scruffy() && !h.scruffyTold) { h.scruffyTold = true; G_().notify('Your hair is looking a bit scruffy. A trim would sort it out.', 'info', 'hair-scruffy'); }
  }

  /* ---------- makeup ---------- */
  var LOOKS = {
    natural: { label: 'a natural look', style: 1, lip: null, eye: null, blush: '#e3a3a0', desc: 'Concealer, a touch of mascara, tinted balm. You, but well rested.' },
    bold_lip:{ label: 'a bold red lip', style: 2, lip: '#b3202d', eye: null, desc: 'Clean skin, sharp liner, and a red lip that means business.' },
    smoky:   { label: 'smoky eyes', style: 2, lip: '#a8676a', eye: '#2c2430', desc: 'Smudged charcoal liner and shadow. Mysterious, slightly sleepy.' },
    glam:    { label: 'full glam', style: 3, lip: '#c2405a', eye: '#4b2f45', blush: '#e48f95', salon: true, desc: 'Contour, lashes, highlighter you can see from space. Professionally done.' }
  };
  function nowH() { var t = G_().time || {}; return (t.day || 0) * 24 + (t.hour || 0); }
  function MK() { var h = H(); return h.makeup && h.makeup.until > nowH() ? h.makeup : null; }
  function smudged() {
    var m = MK(); if (!m) return false;
    var st = G_().state.stats || {}, c = st.clothing || {}, n = st.needs || {};
    if ((c.upperWetness || 0) > 50 || (n.stress || 0) > 750) m.smudged = true;
    return !!m.smudged;
  }
  function applyLook(id, hours) { var h = H(); h.makeup = { look: id, until: nowH() + (hours || 12), smudged: false }; emit('makeup'); }
  function makeupNote() {
    var m = MK(); if (!m) return '';
    return 'You\'re wearing ' + LOOKS[m.look].label + (smudged() ? ', though it has smudged and could use a touch-up.' : '.');
  }
  function makeupOptions(out) {
    var h = H(), m = MK();
    if (h.mode === 'makeup') {
      Object.keys(LOOKS).forEach(function (id) {
        var L = LOOKS[id]; if (L.salon) return;
        out.other.push(opt('Do ' + L.label, function () { h.mode = null; applyLook(id, 12); if (G_().stats && G_().stats.train) G_().stats.train('beauty', 2);
          return { text: '<p>' + esc(L.desc) + '</p>', minutes: id === 'natural' ? 10 : 20 }; }, { time: id === 'natural' ? 10 : 20 }));
      });
      out.other.push(opt('Put the makeup bag away', function () { h.mode = null; return { text: '<p>Maybe later.</p>', minutes: 0 }; }));
      return true;
    }
    if (h.makeupKit) out.other.push(opt(m ? (smudged() ? 'Touch up your makeup' : 'Redo your makeup') : 'Put on makeup', function () { h.mode = 'makeup'; return { text: '<p>You unzip the makeup bag and lean toward the mirror.</p>', minutes: 1 }; }));
    if (m) out.other.push(opt('Take off your makeup', function () { h.makeup = null; emit('makeup'); return { text: '<p>A cotton pad, some micellar water, and your face is your own again.</p>', minutes: 5 }; }));
    return false;
  }

  function logMoney() {}   // the engine logs spending by location, so nothing to do here
  function stylistLine() {
    var lines = ['"Lovely thick hair, you\'re lucky," the stylist says, snipping away.',
      'The stylist hums along to the radio and tells you about her sister\'s wedding.',
      '"Chin up, love. No, a bit less. Perfect."',
      'The stylist spins you round to face the mirror with a little flourish.',
      'The stylist asks if you\'re a student up at the college, then tells you which professors she cut for back in the day.',
      '"Hold still, there\'s a tricky bit at the back." You hold very still.',
      'A hairdryer roars at the next chair. The stylist raises her voice to finish a story about a runaway goat on Mill Lane.',
      'The stylist recommends three conditioners, a café, and a podcast about lighthouses, in that order.',
      '"You\'d be amazed what people ask for," she says. "Last week someone brought in a photo of their dog."',
      'The radio switches to the local weather. The stylist rolls her eyes at the forecast.',
      'The little bell over the door jingles as a regular comes in for her standing appointment.',
      'The stylist works in comfortable silence, combing, sectioning, snipping.'];
    var i = Math.floor(Math.random() * lines.length); if (i === stylistLine.last) i = (i + 1) % lines.length; stylistLine.last = i;
    return lines[i];
  }

  function salonOptions(out) {
    var h = H(), p = P(), cur = STYLES[p.hairStyle] || STYLES.shoulder;
    function back() { return opt('Never mind', function () { h.mode = null; return { text: '<p>You settle back in the waiting chair.</p>', minutes: 1 }; }); }

    if (h.mode === 'cut') {
      Object.keys(STYLES).forEach(function (id) {
        var s = STYLES[id]; if (s.tied || id === p.hairStyle) return;
        var price = id === 'curly' ? 45 : 25, enough = h.length >= s.min;
        out.actions.push(opt('Ask for a ' + s.label + ' ($' + price + ')', function () {
          if (money() < price) return { text: '<p>You check your wallet and pretend you were only asking.</p>', minutes: 1 };
          G_().change('money', -price); logMoney('spend', 'Hair salon', price); h.mode = null;
          var lostDye = cutTo(Math.min(h.length, s.ideal)); p.hairStyle = id; h.scruffyTold = false;
          G_().change('stats.needs.stress', -10); train(id === 'curly' ? 8 : 6); emit('cut');
          return { text: '<p>' + esc(stylistLine()) + '</p><p>' + (id === 'curly' ? 'An hour of rollers and a sharp chemical smell later, you have bouncy curls.' : 'Snip by snip, a ' + esc(s.label) + ' takes shape.') +
            (lostDye ? ' The last of the dyed ends land on the floor.' : '') + '</p><p>' + esc(hairNote()) + '</p>', minutes: id === 'curly' ? 90 : 45 };
        }, { time: id === 'curly' ? 90 : 45, disabled: !enough || money() < price, hint: enough ? 'Ends up ' + lengthWord(Math.min(h.length, s.ideal)) + '.' : 'Your hair is too short for this. Grow it out or get extensions.' }));
      });
      out.actions.push(back()); return;
    }
    if (h.mode === 'contacts') {
      var CON = [['ice', 'ice blue'], ['rose', 'rose'], ['gold', 'gold'], ['violet', 'violet'], ['emerald', 'emerald'], ['sky', 'sky blue']];
      var curC = p.contacts && p.contacts.color;
      CON.forEach(function (c) {
        if (c[0] === curC) return;
        out.actions.push(opt('Wear ' + c[1] + ' lenses ($6)', function () {
          if (money() < 6) return { text: '<p>Not today.</p>', minutes: 0 };
          G_().change('money', -6); logMoney('spend', 'Hair salon', 6); h.mode = null; G_().doll.applyContacts(c[0], 24);
          return { text: '<p>' + ['A few blinks, a tissue, and there it is: your eyes are ' + c[1] + ' now.', 'The stylist steadies your chin while you blink them in. In the mirror your eyes catch the light, ' + c[1] + ' and a little startling.'][Math.floor(Math.random() * 2)] + '</p><p class="hint">Day lenses: they come out on their own after 24 hours.</p>', minutes: 5 };
        }, { time: 5, disabled: money() < 6, effects: ['!−$6', '^' + c[1].charAt(0).toUpperCase() + c[1].slice(1) + ' eyes for a day'] }));
      });
      if (curC) out.actions.push(opt('Take out your lenses', function () { h.mode = null; G_().doll.applyContacts(null); return { text: '<p>You pop the lenses out and blink. Your own eyes look back at you.</p>', minutes: 2 }; }, { time: 2 }));
      out.actions.push(back()); return;
    }
    if (h.mode === 'dye') {
      colours().forEach(function (c) {
        if (c[0] === p.hairColor) return;
        var natural = c[0] === h.natural, price = natural ? 30 : 40;
        out.actions.push(opt(natural ? 'Go back to your natural ' + c[1].toLowerCase() + ' ($30)' : 'Dye it ' + c[1].toLowerCase() + ' ($40)', function () {
          if (money() < price) return { text: '<p>Dye is not cheap. Maybe next week.</p>', minutes: 1 };
          G_().change('money', -price); logMoney('spend', 'Hair salon', price); h.mode = null; p.hairColor = c[0];
          if (natural) { h.dyed = false; h.dyeDays = 0; } else { h.dyed = true; h.dyeDays = 0; }
          G_().change('stats.needs.stress', -8); train(5); emit('dye');
          return { text: '<p>Foils, a timer, and a long wait under the heat lamp with a celebrity magazine from three summers ago. When the towel comes off, your hair is ' + esc(c[1].toLowerCase()) + '.</p>' +
            (natural ? '' : '<p class="hint">Dye grows out: roots start to show after a couple of weeks.</p>'), minutes: 90 };
        }, { disabled: money() < price }));
      });
      out.actions.push(back()); return;
    }

    var grown = !cur.tied && (h.length > cur.ideal + 1 || scruffy());
    out.actions.push(opt('Ask for a trim ($12)', function () {
      if (money() < 12) return { text: '<p>Not even enough for a trim.</p>', minutes: 1 };
      G_().change('money', -12); logMoney('spend', 'Hair salon', 12); var lost = cutTo(Math.min(h.length, cur.ideal)); h.scruffyTold = false;
      G_().change('stats.needs.stress', -8); train(3); emit('cut');
      return { text: '<p>' + esc(stylistLine()) + '</p><p>A neat tidy-up that keeps your ' + esc(cur.label) + ' looking sharp.' + (lost ? ' The dyed ends are gone.' : '') + '</p>', minutes: 30 };
    }, { time: 30, disabled: !grown || money() < 12, reason: !grown ? 'Your cut still looks fresh' : '', hint: grown ? 'Tidies your current cut.' : 'Your cut still looks fresh.' }));
    out.actions.push(opt('Get a new haircut', function () { h.mode = 'cut'; return { text: '<p>The stylist hands you a dog-eared binder of styles. "Shorter is easy," she says. "Longer takes patience, or extensions."</p><p>' + esc(hairNote()) + '</p>', minutes: 2 }; }));
    if (G_().doll) {
      out.actions.push(opt('Try coloured contact lenses ($6)', function () { h.mode = 'contacts'; return { text: '<p>' + ['The stylist sets out a little tray of lens cases, each one a different colour.', 'A small mirror and a tray of day lenses. "Just for fun," the stylist says. "They last a day."'][Math.floor(Math.random() * 2)] + '</p>', minutes: 1 }; }, { time: 1, icon: '👁️', effects: ['Lasts a day'] }));
      out.actions.push(opt('Book a spray tan ($18)', function () {
        if (money() < 18) return { text: '<p>Not today.</p>', minutes: 0 };
        G_().change('money', -18); logMoney('spend', 'Hair salon', 18);
        var p2 = P(), lines = p2 && p2.tanLines ? JSON.parse(JSON.stringify(p2.tanLines)) : null;
        G_().doll.tan(15); if (p2 && lines) p2.tanLines = lines;   // booth tan is even: no new tan lines
        G_().change('stats.needs.stress', -5);
        return { text: '<p>You change into a paper robe in the booth out back. A cool mist, a hum, and a few minutes of standing very still. You come out a shade more golden, evenly, with no tan lines.</p>', minutes: 20 };
      }, { time: 20, disabled: money() < 18, effects: ['!−$18', '^Even tan', '^−Stress'] }));
    }
    if (h.dyed && (rootsShowing() || faded())) out.actions.push(opt('Touch up your roots and tone ($25)', function () {
      if (money() < 25) return { text: '<p>Maybe next week.</p>', minutes: 0 };
      G_().change('money', -25); logMoney('spend', 'Hair salon', 25); h.dyeDays = 0; G_().change('stats.needs.stress', -5); train(4); emit('dye');
      return { text: '<p>' + esc(stylistLine()) + '</p><p>A brush of colour along the parting and a gloss to bring back the shine. Your ' + esc(colourName(p.hairColor)) + ' looks freshly done again.</p>', minutes: 60 };
    }, { time: 60, disabled: money() < 25, effects: ['!−$25', '^Fresh colour', '^No roots'] }));
    out.actions.push(opt('Look at hair colours', function () { h.mode = 'dye'; return { text: '<p>' + ['A fan of swatches, from honest browns to a blue the stylist calls "mermaid".', 'The stylist fans out a ring of dyed hair samples. "Bold is fun," she says, "but brown forgives you."', 'A laminated colour chart, a little faded at the edges where people keep pointing at the reds.'][Math.floor(Math.random() * 3)] + '</p>', minutes: 2 }; }));
    out.actions.push(opt('Get clip-in extensions ($70)', function () {
      if (money() < 70) return { text: '<p>Seventy dollars is a lot of instant noodles.</p>', minutes: 1 };
      G_().change('money', -70); logMoney('spend', 'Hair salon', 70); h.length = Math.min(90, h.length + 20); train(4); emit('cut');
      if (STYLES[p.hairStyle].next && h.length >= STYLES[p.hairStyle].at) p.hairStyle = h.length >= 33 ? 'long' : 'shoulder';
      return { text: '<p>Two hours, a lot of careful blending, and suddenly there is a lot more of you. ' + esc(hairNote()) + '</p>', minutes: 120 };
    }, { time: 120, disabled: money() < 70 || h.length >= 60, hint: 'Adds about 20 cm of length.' }));
    out.actions.push(opt('Get a professional makeover ($20)', function () {
      if (money() < 20) return { text: '<p>Maybe for a special occasion.</p>', minutes: 1 };
      G_().change('money', -20); logMoney('spend', 'Hair salon', 20); applyLook('glam', 14); train(5); G_().change('stats.needs.stress', -10);
      return { text: '<p>The stylist tilts your chin to the light and gets to work with a dozen brushes. ' + esc(LOOKS.glam.desc) + '</p>', minutes: 45 };
    }, { time: 45, disabled: money() < 20 }));
    if (!h.makeupKit) out.actions.push(opt('Buy a makeup kit ($25)', function () {
      if (money() < 25) return { text: '<p>Not today.</p>', minutes: 1 };
      G_().change('money', -25); logMoney('spend', 'Hair salon', 25); h.makeupKit = true;
      return { text: '<p>A zip bag of the basics: concealer, mascara, liner, a few lipsticks and a palette. You can do your own makeup at any mirror now.</p>', minutes: 3 };
    }, { time: 3, disabled: money() < 25, hint: 'Do your own makeup at home or at any mirror.' }));
    out.actions.push(opt('Wash and blow-dry ($15)', function () {
      if (money() < 15) return { text: '<p>You can wash it at home for free.</p>', minutes: 1 };
      G_().change('money', -15); logMoney('spend', 'Hair salon', 15); G_().change('stats.needs.stress', -10);
      var s = G_().state.stats; if (s && s.flags) s.flags.dirty = false; h.treat = false; startWash();
      return { text: '<p>You lean back over the basin. Warm water, a scalp massage that nearly puts you to sleep, and a towel wrapped round your head.</p>', minutes: 15 };
    }, { time: 15, disabled: money() < 15, effects: ['!−$15', '^−Stress', '^Clean hair'] }));
  }

  // Wash scene: holds G.state.lock (reason 'salon-scene') so only its steps show; ends on leaving, closing, sleep or after 2h.
  function nowT() { return (G.time && G.time.total) || 0; }
  function startWash() { var h = H(); h.mode = 'wash'; h.washT = nowT(); if (!G_().state.lock) G_().state.lock = { reason: 'salon-scene', allow: [] }; }
  function endWash() { var h = H(); if (h.mode === 'wash') h.mode = null; var st = G_().state; if (st.lock && st.lock.reason === 'salon-scene') st.lock = null; }
  function washValid(atSalon) {
    var h = H(), f = (G_().state.stats || {}).flags || {};
    if (h.mode === 'wash' && (!atSalon || nowT() - (h.washT || 0) > 120 || f.sleeping || f.collapse)) endWash();
    if (h.mode !== 'wash') { var st = G_().state; if (st.lock && st.lock.reason === 'salon-scene') st.lock = null; }
  }
  function washStep(label, run, extra) { var o = opt(label, run, extra); o.always = true; o.section = 'now'; return o; }
  function washOptions(out) {
    var h = H();
    out.actions.push(washStep('Get the blow-dry', function () {
      endWash(); G_().change('stats.needs.stress', -15); train(3);
      return { text: '<p>' + esc(stylistLine()) + '</p><p>A round brush, a lot of heat, and real volume. You walk out feeling expensive.</p>', minutes: 25 };
    }, { time: 25, effects: ['^−Stress', '^Styled hair'] }));
    if (!h.treat) out.actions.push(washStep('Add a deep-conditioning treatment ($8)', function () {
      if (money() < 8) return { text: '<p>Maybe next time.</p>', minutes: 0 };
      G_().change('money', -8); logMoney('spend', 'Hair salon', 8); h.treat = true; G_().change('stats.needs.stress', -5);
      return { text: '<p>A cool, mint-scented mask and ten quiet minutes under a warm towel.</p>', minutes: 15 };
    }, { time: 15, disabled: money() < 8, reason: money() < 8 ? 'Needs $8' : '', effects: ['!−$8', '^−Stress'] }));
    out.actions.push(washStep('Leave with damp hair', function () { endWash(); return { text: '<p>You thank the stylist, towel your hair one last time and head out with it still damp.</p>', minutes: 1 }; }, { time: 1, icon: '🚪' }));
  }
  function styleOptions(out) {
    var h = H(), p = P(), cur = STYLES[p.hairStyle];
    function downStyle() { return h.length >= 33 ? 'long' : h.length >= 18 ? 'shoulder' : h.length >= 9 ? 'bob' : 'short'; }
    if (h.mode === 'style') {
      if (p.hairStyle !== 'ponytail' && h.length >= 20) out.other.push(opt('Tie it up in a ponytail', function () { h.mode = null; h.down = p.hairStyle; p.hairStyle = 'ponytail'; emit('style'); return { text: '<p>A hair tie from your wrist, two twists, done.</p>', minutes: 2 }; }));
      if (p.hairStyle !== 'braid' && h.length >= 25) out.other.push(opt('Braid it', function () { h.mode = null; h.down = cur.tied ? h.down : p.hairStyle; p.hairStyle = 'braid'; emit('style'); return { text: '<p>Your fingers remember the pattern. It\'s a little lopsided, but it will hold all day.</p>', minutes: 8 }; }));
      if (cur.tied) out.other.push(opt('Wear it down', function () { h.mode = null; var d = h.down && STYLES[h.down] && !STYLES[h.down].tied && h.length >= STYLES[h.down].min ? h.down : downStyle(); p.hairStyle = d; emit('style'); return { text: '<p>You shake your hair loose.</p>', minutes: 1 }; }));
      out.other.push(opt('Leave it as it is', function () { h.mode = null; return { text: '<p>' + esc(hairNote()) + '</p>', minutes: 0 }; }));
      return;
    }
    if (h.length >= 20) out.other.push(opt('Restyle your hair', function () { h.mode = 'style'; return { text: '<p>You check your reflection. ' + esc(hairNote()) + '</p>', minutes: 1 }; }));
  }

  var mod = {
    id: 'salon',
    init: function () {},
    getOptions: function (state) {
      var out = { dialogue: [], actions: [], travel: [], other: [] };
      if (!state.creation || !state.creation.done || !P()) return out;
      var h = H(), hid = hereId(), tags = hereTags();
      var atSalon = hid === SALON && isOpen(SALON), mirror = tags.indexOf('home') >= 0;   // mirror actions only in your dorm room
      if ((h.mode === 'cut' || h.mode === 'dye' || h.mode === 'contacts') && !atSalon) h.mode = null;
      if ((h.mode === 'style' || h.mode === 'makeup') && !mirror) h.mode = null;
      washValid(atSalon);
      if (h.mode === 'wash') { washOptions(out); return out; }
      if (h.mode === 'makeup') { makeupOptions(out); return out; }
      if (mirror && !h.makeupKit) out.other.push(opt('Put on makeup', function () { return { text: '', minutes: 0 }; }, { disabled: true, reason: 'Needs a makeup kit from the salon', time: 10 }));
      if (hid === SALON && !isOpen(SALON)) out.actions.push(opt('Book a haircut', function () { return { text: '', minutes: 0 }; }, { disabled: true, reason: 'Closed. Open 9am to 6pm', section: 'shop' }));
      if (atSalon && h.mode !== 'style') salonOptions(out);
      if (mirror && h.mode !== 'cut' && h.mode !== 'dye' && h.mode !== 'contacts') { styleOptions(out); if (h.mode !== 'style') makeupOptions(out); }
      return out;
    }
  };

  function boot() {
    var g = G_();
    if (!g || !g.register) return setTimeout(boot, 20);
    if (g.world && g.world.addLocation) g.world.addLocation(SALON, {
      name: 'Snip & Curl Salon', district: 'Shopping Centre', indoor: true, open: [9, 18], tags: ['mirror', 'public'],
      desc: 'Three chairs, a wall of mirrors, a shelf of dye swatches in every shade, and a radio tuned to golden oldies.'
    }, [['shopping_centre', 1]]);
  var ICON = function (o) { var l = o.label || ''; return /makeup|makeover/i.test(l) ? '💄' : /colour|dye/i.test(l) ? '🎨' : /ponytail|Braid|down|Restyle|Leave it/.test(l) ? '💇' : /Never mind|Put the makeup bag/.test(l) ? '↩️' : /Wash/.test(l) ? '🚿' : '✂️'; };
  (function (gofn, pick) { mod.getOptions = function (state) { var out = gofn.apply(this, arguments); if (out) ['actions', 'other', 'dialogue'].forEach(function (k) { (out[k] || []).forEach(function (o) { if (o && !o.section) o.section = pick(o, state); if (o && !o.icon) o.icon = ICON(o); var mm = /\(\$(\d+)\)/.exec(o.label || ''); if (mm && !o.effects) o.effects = ['!−$' + mm[1]].concat(/makeover/i.test(o.label) ? ['^+Style', '^−Stress'] : /trim/i.test(o.label) ? ['^Neat hair'] : []); if (o.disabled && !o.reason && mm && money() < +mm[1]) o.reason = 'Needs $' + mm[1]; }); }); return out; }; })(mod.getOptions, function (o, st) { return /\(\$\d+\)|binder|colours|haircut|Never mind/.test(o.label || '') ? 'shop' : 'self'; });
    g.register(mod);
    if (g.on) {
      g.on('start', function () { if (P()) H(); });
      g.on('newDay', function () { try { if (G_().state.creation && G_().state.creation.done && P()) grow(1); } catch (e) {} });
    }
  }

  var api = { length: function () { return P() ? H().length : 0; }, band: function () { return P() ? bandOf()[1] : 'shoulder'; },
    lengthWord: function (cm) { return lengthWord(cm); }, scruffy: function () { return !!P() && scruffy(); },
    rootsShowing: function () { return !!P() && rootsShowing(); }, faded: function () { return !!P() && faded(); },
    dyed: function () { return !!P() && H().dyed; }, natural: function () { return P() ? H().natural : null; },
    daysSinceCut: function () { return P() ? daysSinceCut() : 0; }, note: function () { return P() ? hairNote() : ''; }, STYLES: STYLES };
  if (window.G) window.G.salon = api;
  api.makeup = function () { var m = P() && MK(); return m ? m.look : null; };
  api.smudged = function () { return !!P() && smudged(); };
  window.Salon = { LOOKS: LOOKS, makeupLook: function () { var m = P() && MK(); return m ? Object.assign({ id: m.look, smudged: smudged() }, LOOKS[m.look]) : null; },
    makeupStyle: function () { var m = P() && MK(); return m ? LOOKS[m.look].style - (smudged() ? 1 : 0) : 0; },
    makeupNote: function () { return P() ? makeupNote() : ''; }, STYLES: STYLES, lengthWord: function (cm) { return lengthWord(cm); }, hairNote: function () { return P() ? hairNote() : ''; }, grow: grow, module: mod };
  boot();
})();
