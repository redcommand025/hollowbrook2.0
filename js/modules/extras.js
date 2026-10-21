/* extras.js: end-of-day summary, "wait until" shortcuts, settings, achievements.  Owner: Jenny
 * Owns G.state.extras. Settings live in localStorage (not the save) so they apply across saves.
 */
(function () {
  'use strict';
  var G = window.G, SET_KEY = 'hollowbrook_settings_v1';

  /* ---------- settings ---------- */
  var DEFAULTS = { textSize: 16, daySummary: true, numberHints: true, clock24: true, tempUnit: 'C', lineHeight: 'normal', readableFont: false,
    reducedMotion: false, icons: true, needDisplay: 'words', changeStyle: 'pips' };
  var CHOICES = { tempUnit: ['C', 'F'], lineHeight: ['normal', 'relaxed'], needDisplay: ['words', 'numbers'], changeStyle: ['pips', 'numbers'] };
  var settings = Object.assign({}, DEFAULTS);
  try { Object.assign(settings, JSON.parse(G.store.get(SET_KEY) || '{}')); } catch (e) {}
  Object.keys(CHOICES).forEach(function (k) { if (CHOICES[k].indexOf(settings[k]) < 0) settings[k] = DEFAULTS[k]; });
  function setClass(name, on) { var r = document.documentElement; if (!r) return; if (on) r.classList.add(name); else r.classList.remove(name); }
  function applySettings() {
    document.documentElement.style.setProperty('--text-size', settings.textSize + 'px'); document.body && (document.body.style.fontSize = settings.textSize + 'px');
    setClass('hb-relaxed', settings.lineHeight === 'relaxed');
    setClass('hb-readable', !!settings.readableFont);
    setClass('hb-reduced-motion', !!settings.reducedMotion);
    setClass('hb-noicons', settings.icons === false);
  }
  function saveSettings() { G.store.set(SET_KEY, JSON.stringify(settings)); applySettings(); }
  G.settings = settings;
  applySettings();

  /* Clock and temperature helpers: everyone should format through these so the player's settings apply. */
  function pad2(n) { n = Math.floor(Math.abs(Number(n) || 0)); return (n < 10 ? '0' : '') + n; }
  G.fmtClock = function (h, m) {
    h = ((Math.floor(Number(h) || 0) % 24) + 24) % 24; m = Math.floor(Number(m) || 0) % 60;
    if (settings.clock24 !== false) return pad2(h) + ':' + pad2(m);
    return ((h % 12) || 12) + ':' + pad2(m) + (h < 12 ? ' am' : ' pm');
  };
  G.fmtTemp = function (c) {
    c = Number(c); if (!isFinite(c)) return '';
    return settings.tempUnit === 'F' ? Math.round(c * 9 / 5 + 32) + '\u00b0F' : Math.round(c) + '\u00b0C';
  };

  function btns(key, vals) {
    return vals.map(function (p) {
      var v = p[0], cur = settings[key], on = typeof cur === 'boolean' ? (cur ? '1' : '0') === v : String(cur) === v;
      return '<button data-set="' + key + '" data-v="' + v + '"' + (on ? ' class="on"' : '') + '>' + p[1] + '</button>';
    }).join(' ');
  }
  var ONOFF = [['1', 'On'], ['0', 'Off']];
  function openSettings() {
    var pace = (G.state.creation && G.state.creation.world && G.state.creation.world.needsPace) || 'normal';
    var h = '<button class="x" data-ov="close">×</button><h2>Settings</h2><p class="flavor">Small adjustments for a comfortable read.</p>';
    h += '<h3>Reading</h3>';
    h += '<p><b>Text size</b><br>' + [14, 16, 18, 20, 22].map(function (s) { return '<button data-set="textSize" data-v="' + s + '"' + (settings.textSize === s ? ' class="on"' : '') + '>' + s + '</button>'; }).join(' ') + '</p>';
    h += '<p><b>Line spacing</b><br>' + btns('lineHeight', [['normal', 'Normal'], ['relaxed', 'Relaxed']]) + '</p>';
    h += '<p><b>Readable font</b> <span class="flavor">(plain sans-serif with wider spacing)</span><br>' + btns('readableFont', ONOFF) + '</p>';
    h += '<p><b>Reduce motion</b><br>' + btns('reducedMotion', ONOFF) + '</p>';
    h += '<h3>Display</h3>';
    h += '<p><b>Needs shown as</b><br>' + btns('needDisplay', [['words', 'Words'], ['numbers', 'Numbers']]) + '</p>';
    h += '<p><b>Stat changes shown as</b> <span class="flavor">(money is always shown in dollars)</span><br>' + btns('changeStyle', [['pips', 'Pips (+ ++ +++)'], ['numbers', 'Numbers']]) + '</p>';
    h += '<p><b>Clock</b><br>' + btns('clock24', [['1', '24-hour (' + pad2(17) + ':30)'], ['0', '12-hour (5:30 pm)']]) + '</p>';
    h += '<p><b>Temperature</b><br>' + btns('tempUnit', [['C', '\u00b0C'], ['F', '\u00b0F']]) + '</p>';
    h += '<p><b>Icons on choices</b><br>' + btns('icons', ONOFF) + '</p>';
    h += '<p><b>Number-key hints on choices</b><br>' + btns('numberHints', ONOFF) + '</p>';
    h += '<h3>Game</h3>';
    h += '<p><b>Needs pace</b> <span class="flavor">(how quickly hunger, thirst, bladder and the rest build up; saved with this game)</span><br>' +
      ['gentle', 'normal', 'harsh'].map(function (p) { return '<button data-set="needsPace" data-v="' + p + '"' + (pace === p ? ' class="on"' : '') + '>' + p.charAt(0).toUpperCase() + p.slice(1) + '</button>'; }).join(' ') + '</p>';
    h += '<p><b>End-of-day summary</b><br>' + btns('daySummary', ONOFF) + '</p>';
    var o = document.getElementById('overlay'); if (!o) { o = document.createElement('div'); o.id = 'overlay'; document.body.appendChild(o); }
    o.className = ''; o.innerHTML = '<div class="sheet">' + h + '</div>'; o.hidden = false;
  }
  G.openSettings = openSettings;

  document.addEventListener('click', function (e) {
    if (e.target.id === 'btn-settings') return openSettings();
    var b = e.target.closest && e.target.closest('[data-set]'); if (!b) return;
    var k = b.dataset.set, v = b.dataset.v;
    if (k === 'textSize') settings.textSize = +v;
    else if (k === 'needsPace') { if (G.state.creation) { G.state.creation.world = G.state.creation.world || {}; G.state.creation.world.needsPace = v; G.save(true); } }
    else if (CHOICES[k]) { if (CHOICES[k].indexOf(v) >= 0) settings[k] = v; }
    else settings[k] = v === '1';
    saveSettings(); openSettings(); G.render();
  });

  /* ---------- tips ---------- */
  var TIPS = [
    'Press the number keys 1 to 9 to pick a choice without reaching for the mouse.',
    'The Journal tab in the Character menu has your class timetable and every open favour.',
    'Cooking your own meals at home costs far less than eating out every day.',
    'A jacket keeps the worst of the rain off the clothes underneath.',
    'If this browser cannot keep saves, use Saves, then Download save, before you close the tab.',
    'Classes start at 09:00 and 13:00 on weekdays. Skipping them raises delinquency.',
    'Use the restroom before a long class or shift, not after.',
    'Thirst and hunger creep down all day. A bottle of water is cheap insurance.',
    'Fatigue past 700 makes everything harder. An early night pays off the next morning.',
    'Townsfolk keep schedules, so check back at a different hour if someone is not around.',
    'The Stats tab shows where your money and hours went this week.',
    'Check the forecast in your room before heading out for the day.',
    'Wet clothes chill you and raise stress. Change into something dry when you can.',
    'Tags like "Hard" next to a choice show how likely it is to go your way.',
    'Groceries go off eventually. Buy what you will cook this week.',
    'Waiting until a set time is a quick way to skip ahead, but your needs keep building.'
  ];
  G.TIPS = TIPS;
  G.randomTip = function () { return TIPS[Math.floor(Math.random() * TIPS.length)]; };

  /* ---------- end-of-day summary ---------- */
  function snapshot() {
    var s = G.state, st = s.stats || {}, core = st.core || {}, sk = st.skills || {};
    var snap = { money: Number(s.money) || 0, core: {}, skills: {}, met: 0, rep: 0 };
    Object.keys(core).forEach(function (k) { snap.core[k] = Number(core[k] && core[k].value) || 0; });
    Object.keys(sk).forEach(function (k) { snap.skills[k] = Number(sk[k]) || 0; });
    var rel = s.npcs && s.npcs.rel; if (rel) Object.keys(rel).forEach(function (id) { if (rel[id].met) snap.met++; snap.rep += rel[id].rep || 0; });
    return snap;
  }
  function summaryHtml(a, b, day) {
    var lines = [], diff = b.money - a.money;
    if (diff) lines.push((diff > 0 ? 'You came out $' + diff.toFixed(2) + ' ahead.' : 'You spent $' + (-diff).toFixed(2) + ' more than you earned.'));
    var grew = Object.keys(b.core).filter(function (k) { return b.core[k] - (a.core[k] || 0) >= 3; });
    if (grew.length) lines.push('You felt your ' + grew.join(', ') + ' improve.');
    var sk = Object.keys(b.skills).filter(function (k) { return b.skills[k] - (a.skills[k] || 0) >= 3; });
    if (sk.length) lines.push('Practice paid off in ' + sk.map(function (k) { return k.replace(/([A-Z])/g, ' $1').toLowerCase(); }).join(', ') + '.');
    if (b.met > a.met) lines.push('You met ' + (b.met - a.met) + ' new ' + (b.met - a.met === 1 ? 'person' : 'people') + '.');
    if (b.rep - a.rep >= 5) lines.push('People around town seem to like you a little more.');
    else if (b.rep - a.rep <= -5) lines.push('A few people think a little less of you today.');
    if (!lines.length) lines.push('A quiet day. Sometimes that is enough.');
    return '<div class="daysum"><b>Looking back on day ' + day + ':</b> ' + lines.join(' ') + '<div class="tip"><b>Tip:</b> ' + G.esc(G.randomTip()) + '</div></div>';
  }

  /* ---------- achievements ---------- */
  var ACH = [
    { id: 'firstDay', name: 'First Day Jitters', desc: 'Make it through your first day in Hollowbrook.', test: function (s) { return s.world && s.world.day >= 2; } },
    { id: 'week', name: 'Settling In', desc: 'Live in Hollowbrook for a full week.', test: function (s) { return s.world && s.world.day >= 8; } },
    { id: 'term', name: 'A Whole Season', desc: 'See a full season through.', test: function (s) { return s.world && s.world.day >= 29; } },
    { id: 'explorer', name: 'Local Knowledge', desc: 'Visit every place on the town map.', test: function (s) {
        if (!s.world || !G.world || !G.world.LOCATIONS) return false; var all = Object.keys(G.world.LOCATIONS); return all.every(function (k) { return s.world.visited[k]; }); } },
    { id: 'saver', name: 'Rainy Day Fund', desc: 'Have $500 in your pocket at once.', test: function (s) { return (Number(s.money) || 0) >= 500; } },
    { id: 'social', name: 'Familiar Face', desc: 'Meet ten named townsfolk.', test: function (s) { var r = s.npcs && s.npcs.rel; return !!r && Object.keys(r).filter(function (k) { return r[k].met; }).length >= 10; } },
    { id: 'friend', name: 'Someone in Your Corner', desc: 'Become close friends with anyone.', test: function (s) { var r = s.npcs && s.npcs.rel; return !!r && Object.keys(r).some(function (k) { return r[k].rep >= 70; }); } },
    { id: 'dating', name: 'Butterflies', desc: 'Start dating someone.', test: function (s) { var r = s.npcs && s.npcs.rel; return !!r && Object.keys(r).some(function (k) { return r[k].romance >= 3; }); } },
    { id: 'pet', name: 'Not Alone Anymore', desc: 'Adopt a companion.', test: function (s) { return !!(G.pets && G.pets.list && G.pets.list().length); } },
    { id: 'cozy', name: 'Home Sweet Dorm', desc: 'Raise your room\'s comfort to 10.', test: function () { return !!(G.dorm && G.state.dorm && G.dorm.comfort() >= 10); } },
    { id: 'skillB', name: 'Getting Good', desc: 'Reach rank B in any skill or characteristic.', test: function (s) {
        if (!G.stats || !G.stats.tierIdx || !s.stats) return false; var vals = [];
        Object.keys(s.stats.core || {}).forEach(function (k) { vals.push(s.stats.core[k].value); });
        Object.keys(s.stats.skills || {}).forEach(function (k) { vals.push(s.stats.skills[k]); });
        return vals.some(function (v) { return G.stats.tierIdx(v) >= 6; }); } },
    { id: 'skillS', name: 'Mastery', desc: 'Reach rank S in anything.', test: function (s) {
        if (!G.stats || !G.stats.tierIdx || !s.stats) return false; var vals = [];
        Object.keys(s.stats.core || {}).forEach(function (k) { vals.push(s.stats.core[k].value); });
        Object.keys(s.stats.skills || {}).forEach(function (k) { vals.push(s.stats.skills[k]); });
        return vals.some(function (v) { return G.stats.tierIdx(v) >= 10; }); } },
    { id: 'storm', name: 'Weathered It', desc: 'Be outdoors during a storm.', test: function (s) { return s.world && s.world.weather === 'storm' && G.world && !G.world.isIndoors(); } },
    { id: 'night', name: 'Night Owl', desc: 'Still be awake and out of your room at 3 in the morning.', test: function (s) { return G.time.hour === 3 && s.world && s.world.location !== 'dorm_room'; } },
    { id: 'clean', name: 'Model Student', desc: 'Go a full week with zero delinquency.', test: function (s) { var sc = s.stats && s.stats.status; return s.world && s.world.day >= 8 && sc && !(sc.delinquency > 0); } }
  ];
  function X() { return G.state.extras; }
  function checkAch() {
    var x = X(); if (!x) return;
    ACH.forEach(function (a) {
      if (x.ach[a.id]) return;
      var ok = false; try { ok = a.test(G.state); } catch (e) { ok = false; }
      if (ok) { x.ach[a.id] = G.state.world ? G.state.world.day : 1; G.notify('Achievement: ' + a.name, 'info'); G.emit('achievement', a); }
    });
  }

  /* ---------- wait-until shortcuts ---------- */
  var MARKS = [[7, 'early morning (07:00)'], [9, 'the morning class (09:00)'], [12, 'midday (12:00)'], [13, 'the afternoon class (13:00)'], [17, 'evening (17:00)'], [20, 'nightfall (20:00)']];
  function minutesUntil(h) { var now = G.time.hour * 60 + G.time.minute, t = h * 60; return t > now ? t - now : 1440 - now + t; }

  var mod = {
    id: 'extras',
    init: function (state) {
      if (!state.extras) state.extras = { ach: {}, snap: null, snapDay: null, pendingSummary: null };
      applySettings();
    },
    onTick: function () {
      var x = X(), day = G.state.world ? G.state.world.day : 1;
      if (!x.snap) { x.snap = snapshot(); x.snapDay = day; }
      if (day !== x.snapDay) {
        var now = snapshot();
        if (settings.daySummary) x.pendingSummary = summaryHtml(x.snap, now, x.snapDay);
        x.snap = now; x.snapDay = day;
      }
      checkAch();
    },
    getOptions: function (state) {
      var out = { dialogue: [], actions: [], travel: [], other: [] };
      if (state.lock) return out;
      var n = (state.stats && state.stats.needs) || {};
      var risky = n.bladder >= 750 || n.fatigue >= 850 || n.thirst <= 150 || n.hunger <= 150;
      MARKS.map(function (m) { return [m, minutesUntil(m[0])]; })
        .filter(function (p) { return p[1] >= 45 && p[1] <= 720; })
        .sort(function (a, b) { return a[1] - b[1]; }).slice(0, 2)
        .forEach(function (p) {
          out.other.push({ label: 'Wait until ' + p[0][1], hint: risky ? 'Your body is already complaining. Waiting this long is a gamble.' : '',
            run: function () {
              // Wait in 30-minute steps so needs, warnings and events can interrupt naturally.
              var total = p[1], step = 30, done = 0;
              while (done + step < total) { G.tick(step); done += step; var nn = G.state.stats && G.state.stats.needs; if (G.state.lock || (nn && (nn.bladder >= 900 || nn.fatigue >= 950))) break; }
              var left = G.state.lock ? 0 : total - done;
              return { text: '<p>You let the time pass' + (G.state.lock ? ', until your body decides otherwise.' : ', watching the light change.') + '</p>', minutes: left };
            } });
        });
      return out;
    }
  };

  G.on('action', function () {
    var x = X(); if (!x || !x.pendingSummary) return;
    G.appendStory(x.pendingSummary); x.pendingSummary = null;
  });

  G.addTab({ id: 'achievements', label: 'Achievements', order: 60, render: function () {
    var x = X(), got = ACH.filter(function (a) { return x.ach[a.id]; }).length;
    return '<h3>Achievements</h3><p class="flavor">Little milestones from your time in Hollowbrook. ' + got + ' of ' + ACH.length + ' earned.</p><ul class="ach">' +
      ACH.map(function (a) { var d = x.ach[a.id]; return '<li class="' + (d ? 'got' : '') + '"><b>' + (d ? a.name : '???') + '</b> · ' + a.desc + (d ? ' <span class="flavor">(day ' + d + ')</span>' : '') + '</li>'; }).join('') + '</ul>';
  } });

  G.extras = { ACHIEVEMENTS: ACH, checkAchievements: checkAch, openSettings: openSettings };
  G.register(mod);
})();
