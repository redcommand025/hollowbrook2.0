/* engine.js: core loop, state, rendering, save/load.  Owner: Jenny
 * Load order in index.html: engine.js first, then every module. Modules call G.register(mod) on load.
 * Option shape: { label, run(state) -> { text, minutes } , disabled?: bool, hint?: string, effects?, reason? } (see CONTRACT.md)
 */
(function () {
  'use strict';
  var SAVE_KEY = 'hollowbrook_save_v1';
  /* Safe storage: some browsers (private mode, in-app/webview, strict privacy) throw on localStorage. Fall back to memory. */
  /* Small polyfills so older phone and console browsers can run the game. */
  if (typeof Object.assign !== 'function') Object.assign = function (t) { for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; if (s) for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) t[k] = s[k]; } return t; };
  if (!Array.prototype.includes) Array.prototype.includes = function (v) { return this.indexOf(v) !== -1 || (v !== v && this.some(function (x) { return x !== x; })); };
  if (!Array.prototype.find) Array.prototype.find = function (f, t) { for (var i = 0; i < this.length; i++) if (f.call(t, this[i], i, this)) return this[i]; };
  if (!Array.prototype.findIndex) Array.prototype.findIndex = function (f, t) { for (var i = 0; i < this.length; i++) if (f.call(t, this[i], i, this)) return i; return -1; };
  if (!String.prototype.includes) String.prototype.includes = function (s, p) { return this.indexOf(s, p || 0) !== -1; };
  if (!Element.prototype.matches) Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
  if (!Element.prototype.closest) Element.prototype.closest = function (sel) { var el = this; while (el && el.nodeType === 1) { if (el.matches(sel)) return el; el = el.parentElement; } return null; };
  // Show script errors on screen so players can report them.
  window.addEventListener('error', function (e) {
    try {
      // Ignore errors from the browser itself or extensions (no file, or not one of our scripts), e.g. window.onSsModeChange.
      var f = String(e.filename || '');
      if (!f || f.indexOf('/js/') < 0 || /onSsModeChange/.test(e.message || '')) return;
      var bar = document.getElementById('errbar');
      if (!bar) { bar = document.createElement('div'); bar.id = 'errbar'; bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:5000;background:#5a1d1d;color:#fff;font:12px system-ui;padding:6px 10px;white-space:pre-wrap'; document.body.appendChild(bar); }
      bar.textContent = 'Something broke: ' + e.message + ' (' + String(e.filename || '').split('/').pop().split('?')[0] + ':' + e.lineno + ':' + (e.colno || 0) + ') [' + G.version + ']. Please tell the developers.';
    } catch (x) {}
  });
  var memStore = {};
  var store = {
    fallback: false, // true once real storage has failed and saves only live in memory (gone when the tab closes)
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { store.fallback = true; return memStore.hasOwnProperty(k) ? memStore[k] : null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { store.fallback = true; memStore[k] = String(v); } },
    remove: function (k) { try { window.localStorage.removeItem(k); } catch (e) { store.fallback = true; delete memStore[k]; } }
  };
  try { window.localStorage.setItem('hb_probe', '1'); window.localStorage.removeItem('hb_probe'); } catch (e) { store.fallback = true; }

  var mods = [], handlers = {}, tabs = [], pendingNotes = [], started = false;

  var G = window.G = {
    store: store,
    version: 'v26.10.19.6',
    state: {},
    time: { day: 1, hour: 7, minute: 30, weekday: 'Monday', clock: '07:30' },
    limits: {},          // path -> [min, max]; modules may add their own
    labels: {},          // path -> friendly name for notifications
    modules: mods
  };

  /* ---------- events ---------- */
  G.on = function (ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); };
  G.emit = function (ev, data) { (handlers[ev] || []).slice().forEach(function (fn) { try { fn(data, G.state); } catch (e) { console.error(ev, e); } }); };

  /* ---------- modules ---------- */
  G.register = function (mod) {
    if (!mod || !mod.id) return console.error('Module missing id', mod);
    if (mods.some(function (m) { return m.id === mod.id; })) return;
    mods.push(mod);
  };
  G.module = function (id) { return mods.filter(function (m) { return m.id === id; })[0]; };

  /* Character menu tabs. Modules add tabs: G.addTab({ id, label, order, render(state) -> html }) */
  G.addTab = function (tab) { tabs = tabs.filter(function (t) { return t.id !== tab.id; }); tabs.push(tab); tabs.sort(function (a, b) { return (a.order || 50) - (b.order || 50); }); };

  /* ---------- state paths ---------- */
  function getPath(path) { return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, G.state); }
  function setPath(path, val) {
    var keys = path.split('.'), o = G.state;
    for (var i = 0; i < keys.length - 1; i++) { if (o[keys[i]] == null) o[keys[i]] = {}; o = o[keys[i]]; }
    o[keys[keys.length - 1]] = val;
  }
  G.get = getPath;
  G.set = setPath;

  function limitFor(path) {
    if (G.limits[path]) return G.limits[path];
    if (path.indexOf('stats.needs.') === 0) return [0, 1000];
    if (path.indexOf('stats.clothing.') === 0) return [0, 100];
    if (path === 'money') return [0, Infinity];
    return [-Infinity, Infinity];
  }
  function prettyName(path) {
    if (G.labels[path]) return G.labels[path];
    var last = path.split('.').pop().replace(/([A-Z])/g, ' $1');
    return last.charAt(0).toUpperCase() + last.slice(1);
  }

  /* G.change(path, delta, opts) -> actual delta applied. opts.silent skips the notice. */
  G.change = function (path, delta, opts) {
    opts = opts || {};
    var cur = Number(getPath(path)) || 0, lim = limitFor(path);
    var next = Math.max(lim[0], Math.min(lim[1], cur + delta));
    var real = next - cur;
    setPath(path, next);
    if (path === 'money' && real && !opts.noLog) autoMoney(real);
    if (real && !opts.silent) {
      var name = prettyName(path);
      var shown = path === 'money' ? (real > 0 ? '+$' : '-$') + Math.abs(real).toFixed(2).replace(/\.00$/, '') : (real > 0 ? '+' : '') + Math.round(real);
      G.notify(name + ' ' + shown, real > 0 ? 'up' : 'down', path, true);
    }
    G.emit('change', { path: path, delta: real, value: next });
    return real;
  };

  /* ---------- ledger: G.log(kind, key, amount) ---------- */
  /* kind 'earn' | 'spend' (dollars) | 'hours' (hours). Stored per week in G.state.ledger.weeks[week]; the last 8 weeks are kept. */
  var LEDGER_KINDS = { earn: 1, spend: 1, hours: 1 };
  function weekOf(day) { day = Number(day) || 1; return Math.floor((day - 1) / 7) + 1; }
  G.weekOf = weekOf;
  function ledgerWeek(w) {
    var L = G.state.ledger; if (!L || typeof L !== 'object' || !L.weeks) L = G.state.ledger = { weeks: {} };
    var k = String(w);
    if (!L.weeks[k]) {
      L.weeks[k] = { earn: {}, spend: {}, hours: {}, totals: { earn: 0, spend: 0, hours: 0 } };
      Object.keys(L.weeks).forEach(function (o) { if (+o <= w - 8) delete L.weeks[o]; });
    }
    return L.weeks[k];
  }
  G.ledgerWeek = function (w) { var L = G.state.ledger; return (L && L.weeks && L.weeks[String(w)]) || null; };
  var actLog = null; // per-action bookkeeping so explicit G.log calls win over the engine's automatic guesses
  function logRaw(kind, key, amount) {
    if (!LEDGER_KINDS[kind]) return;
    amount = Number(amount); if (!amount || !isFinite(amount)) return;
    key = String(key || 'Other');
    var wk = ledgerWeek(weekOf(G.time && G.time.day));
    var q = kind === 'hours' ? 10000 : 100;
    wk[kind][key] = Math.round(((wk[kind][key] || 0) + amount) * q) / q;
    wk.totals[kind] = Math.round(((wk.totals[kind] || 0) + amount) * q) / q;
  }
  G.log = function (kind, key, amount) {
    try { if (actLog) actLog.explicit[kind] = true; logRaw(kind, key, amount); } catch (e) { console.error('G.log', e); }
  };
  function placeName() { try { return (G.world && G.world.location && (G.world.location() || {}).name) || 'Around town'; } catch (e) { return 'Around town'; } }
  function autoMoney(real) {
    var kind = real < 0 ? 'spend' : 'earn', place = placeName();
    try {
      if (actLog) { var b = actLog[kind]; b[place] = (b[place] || 0) + Math.abs(real); }
      else logRaw(kind, place, Math.abs(real));
    } catch (e) {}
  }
  var ACTIVITY = { now: 'Class and work', needs: 'Looking after yourself', here: 'Out and about', people: 'Socialising', shop: 'Shopping', self: 'Getting ready', travel: 'Travel' };
  function activityOf(o, k) {
    if (o.activity) return String(o.activity);
    var l = String(o.label || '').replace(/<[^>]+>/g, '');
    if (/^wait\b/i.test(l)) return 'Waiting';
    if (/\b(sleep|nap)\b/i.test(l)) return 'Sleep';
    if (/\bstudy|homework|revise\b/i.test(l)) return 'Study';
    return ACTIVITY[sectionOf(o, k || 'actions')] || 'Out and about';
  }
  function flushActLog(opt, k, mins) {
    var a = actLog; actLog = null; if (!a) return;
    try {
      if (!a.explicit.spend) Object.keys(a.spend).forEach(function (p) { logRaw('spend', p, a.spend[p]); });
      if (!a.explicit.earn) Object.keys(a.earn).forEach(function (p) { logRaw('earn', p, a.earn[p]); });
      if (!a.explicit.hours && mins > 0) logRaw('hours', activityOf(opt, k), mins / 60);
    } catch (e) { console.error('ledger', e); }
  }

  /* Stats tab: this week and last week from the ledger. */
  function money2(v) { return '$' + (Number(v) || 0).toFixed(2); }
  function hrs(v) { v = Number(v) || 0; var m = Math.round(v * 60); return Math.floor(m / 60) + 'h ' + (m % 60 < 10 ? '0' : '') + (m % 60) + 'm'; }
  function ledgerTable(title, obj, fmt, total) {
    var keys = Object.keys(obj || {}).filter(function (k) { return obj[k]; }).sort(function (a, b) { return obj[b] - obj[a]; });
    var h = '<table class="ledger"><tr><th colspan="2">' + title + '</th></tr>';
    if (!keys.length) h += '<tr><td colspan="2" class="flavor">Nothing yet.</td></tr>';
    keys.forEach(function (k) { h += '<tr><td>' + esc(k) + '</td><td class="num">' + fmt(obj[k]) + '</td></tr>'; });
    if (keys.length) h += '<tr class="tot"><td>Total</td><td class="num">' + fmt(total) + '</td></tr>';
    return h + '</table>';
  }
  function ledgerWeekHtml(label, w, wk) {
    if (!wk) return '<h4>' + label + ' (week ' + w + ')</h4><p class="flavor">No records for this week.</p>';
    var t = wk.totals || {}, net = (t.earn || 0) - (t.spend || 0);
    return '<h4>' + label + ' (week ' + w + ')</h4><p>Earned <b>' + money2(t.earn) + '</b> · spent <b>' + money2(t.spend) + '</b> · net <b class="' + (net >= 0 ? 'up' : 'down') + '">' + (net < 0 ? '-' : '') + money2(Math.abs(net)) + '</b> · ' + hrs(t.hours) + ' logged</p>' +
      '<div class="ledgers">' + ledgerTable('Earnings by source', wk.earn, money2, t.earn) + ledgerTable('Spending by place', wk.spend, money2, t.spend) + ledgerTable('Hours by activity', wk.hours, hrs, t.hours) + '</div>';
  }
  G.addTab({ id: 'ledger', label: 'Stats', order: 65, render: function () {
    var w = weekOf(G.time && G.time.day);
    return '<h3>Stats</h3><p class="flavor">Where your money and hours went. Weeks run Monday to Sunday.</p>' +
      ledgerWeekHtml('This week', w, G.ledgerWeek(w)) + (w > 1 ? ledgerWeekHtml('Last week', w - 1, G.ledgerWeek(w - 1)) : '');
  } });

  /* ---------- story + notices ---------- */
  G.notify = function (msg, kind, key, eng) {
    if (key) { // merge repeated changes to the same stat in one turn
      var prev = pendingNotes.filter(function (n) { return n.key === key; })[0];
      if (prev && key !== 'text') { prev.sum = (prev.sum || 0); }
    }
    pendingNotes.push({ msg: msg, kind: kind || 'info', key: key, eng: !!eng });
    if (!busy) renderNotes();
  };
  var busy = false, storyHtml = '';
  G.story = function (html) { storyHtml = html; el('story').innerHTML = html; };
  G.appendStory = function (html) { storyHtml += html; el('story').innerHTML = storyHtml; };

  function renderNotes() {
    var box = el('notices');
    // collapse numeric notices on the same path into one line
    var merged = [], byKey = {};
    pendingNotes.forEach(function (n) {
      var m = n.key && n.key !== 'text' && /[+-]\$?[\d.]+$/.exec(n.msg);
      if (m && byKey[n.key]) {
        var a = byKey[n.key]; a.total += parseFloat(n.msg.slice(m.index).replace('$', ''));
        a.kind = a.total >= 0 ? 'up' : 'down';
        var isMoney = n.key === 'money';
        a.msg = prettyName(n.key) + ' ' + (a.total >= 0 ? '+' : '-') + (isMoney ? '$' : '') + Math.abs(isMoney ? +a.total.toFixed(2) : Math.round(a.total));
      } else {
        var c = { msg: n.msg, kind: n.kind, key: n.key, eng: n.eng, total: m ? parseFloat(n.msg.slice(m.index).replace('$', '')) : 0 };
        if (m) byKey[n.key] = c; merged.push(c);
      }
    });
    box.innerHTML = merged.filter(function (n) { return !n.key || n.total !== 0 || !/[+-]/.test(n.msg); })
      .map(function (n) { return '<div class="note ' + n.kind + '">' + noteText(n) + '</div>'; }).join('');
  }
  /* Stat-change pips: only for numeric notices the engine itself formatted (G.change), never for money or module free text. */
  function pips(total) {
    var a = Math.abs(total), c = total >= 0 ? '+' : '\u2212';
    return a <= 15 ? c : a <= 40 ? c + c : c + c + c;
  }
  G.pips = pips;
  function noteText(n) {
    var style = (G.settings && G.settings.changeStyle) || 'pips';
    if (style !== 'pips' || !n.eng || n.key === 'money' || !n.total) return n.msg;
    return prettyName(n.key) + ' <span class="pips" title="' + (n.total > 0 ? '+' : '') + Math.round(n.total) + '">' + pips(n.total) + '</span>';
  }

  /* ---------- turn loop ---------- */
  G.tick = function (minutes) {
    minutes = Math.max(0, minutes | 0);
    // world first (it owns the clock), then everyone else
    var ordered = mods.slice().sort(function (a, b) { return (a.id === 'world' ? -1 : 0) - (b.id === 'world' ? -1 : 0); });
    ordered.forEach(function (m) { if (m.onTick) { try { m.onTick(minutes, G.state); } catch (e) { console.error(m.id + '.onTick', e); } } });
    G.emit('tick', { minutes: minutes });
  };

  G.act = function (opt, meta) {
    if (!opt || opt.disabled) return;
    busy = true; pendingNotes = [];
    var t0 = typeof G.time.total === 'number' ? G.time.total : null;
    actLog = { spend: {}, earn: {}, explicit: {} };
    var res;
    try { res = opt.run(G.state) || {}; } catch (e) { console.error(e); res = { text: '<p><i>Something went wrong with that action.</i></p>', minutes: 0 }; }
    G.story(res.text || '');
    G.tick(res.minutes || 0);
    var spent = t0 !== null && typeof G.time.total === 'number' ? G.time.total - t0 : (res.minutes || 0);
    flushActLog(opt, meta && meta.k, spent);
    G.emit('action', { option: opt, result: res });
    busy = false;
    renderNotes();
    G.save(true);
    render();
  };

  /* Any module can trigger a forced scene (e.g. passing out): returns to normal next turn. */
  G.interrupt = function (res) { G.story(res.text || ''); if (res.minutes) G.tick(res.minutes); render(); };

  /* ---------- rendering ---------- */
  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  G.esc = esc;
  /* Action duration label, format (h:mm). Options declare `time: minutes` and the engine appends it. */
  G.fmtTime = function (m) { m = Math.max(0, Math.round(m)); return '(' + Math.floor(m / 60) + ':' + (m % 60 < 10 ? '0' : '') + (m % 60) + ')'; };

  /* Fallback when an option doesn't declare `time`: if its run() source returns exactly one literal minutes value, use it. */
  var timeCache = typeof WeakMap === 'function' ? new WeakMap() : null;
  function guessTime(o) {
    if (o.time === false || typeof o.run !== 'function') return null;
    if (timeCache && timeCache.has(o.run)) return timeCache.get(o.run);
    var src = String(o.run), re = /minutes\s*:\s*([^,}\s]+)/g, m, vals = {}, n = 0, ok = true;
    while ((m = re.exec(src))) { if (!/^\d+$/.test(m[1])) { ok = false; break; } if (!vals[m[1]]) { vals[m[1]] = 1; n++; } }
    var t = ok && n === 1 ? +Object.keys(vals)[0] : null;
    if (t === 0) t = null;
    if (timeCache) timeCache.set(o.run, t);
    return t;
  }

  function collectOptions() {
    var all = { dialogue: [], actions: [], travel: [], other: [] };
    mods.forEach(function (m) {
      if (!m.getOptions) return;
      var o; try { o = m.getOptions(G.state) || {}; } catch (e) { console.error(m.id + '.getOptions', e); return; }
      ['dialogue', 'actions', 'travel', 'other'].forEach(function (k) { (o[k] || []).forEach(function (x) { if (x) all[k].push(x); }); });
    });
    // Modules can block travel/actions (e.g. in class, passed out) via G.state.lock = { reason, allow: ['actions'] }
    var lock = G.state.lock;
    if (lock) ['dialogue', 'actions', 'travel', 'other'].forEach(function (k) {
      if ((lock.allow || []).indexOf(k) < 0) all[k] = all[k].filter(function (x) { return x.always; });
    });
    return all;
  }


  /* Priority sections for options. Modules may set o.section to one of these ids; otherwise it is guessed from the label. */
  var SECTIONS = [['now', 'Right now'], ['needs', 'Needs'], ['here', 'Here'], ['people', 'People'], ['shop', 'Shop'], ['self', 'Getting ready'], ['travel', 'Travel']];
  G.SECTIONS = SECTIONS;
  var RX = {
    now: /\b(attend|go to class|join (the )?class|lecture|seminar|exam|start (your |a )?shift|clock in|work (a|your) shift|ask for work|sit (the|your) test|catch the bus)\b/i,
    needs: /\b(pee|poo|toilet|restroom stall|use the (restroom|bathroom|toilet)|somewhere to (pee|go)|in your brief|cover yourself|hide|throw away ruined|rinse out|change (into|your) (brief|diaper|clothes)|sleep|nap|eat |drink |wake up|get dressed|put your clothes)\b/i,
    shop: /\b(buy|browse (the )?(racks|shelves|aisles|menu|stock)|sell|shop|checkout|queue at|order|pay for|aisle|rack)\b|\(\$\d/i,
    self: /\b(mirror|forecast|wardrobe|journal|phone|your bag|inventory|makeup|restyle|laundry|mend|sew|check yourself|your room|decorate)\b/i
  };
  var SUBSEC = { 'Groceries': 'shop', 'Aisles': 'shop', 'Your groceries': 'needs', 'Go to': 'travel', 'Travel to': 'travel' };
  function sectionOf(o, k) {
    if (o.section) return o.section === 'top' ? 'now' : o.section;
    if (o.priority === 'top' || o.urgent || o.pin || (typeof o.priority === 'number' && o.priority >= 90)) return 'now';
    if (k === 'travel') return 'travel';
    if (k === 'dialogue') return 'people';
    if (o.sub && SUBSEC[o.sub]) return SUBSEC[o.sub];
    var l = String(o.label || '').replace(/<[^>]+>/g, '');
    if (/\b(lift|pickpocket|shoplift|steal|pocket)\b/i.test(l)) return 'here';
    if (RX.now.test(l)) return 'now';
    if (RX.needs.test(l)) return 'needs';
    if (RX.shop.test(l)) return 'shop';
    if (RX.self.test(l)) return 'self';
    if (/^(talk|chat|ask|flirt|hang out|text|call|greet|give|hug|kiss|date)\b/i.test(l)) return 'people';
    return 'here';
  }
  function dormOnly(o) {
    if (o.anywhere) return false;
    var l = String(o.label || '');
    return /\bmirror\b|reflection|forecast/i.test(l) && !/fitting room|salon/i.test(l);
  }
  function inDorm() {
    var loc = (G.state.world && G.state.world.location) || '';
    return /^dorm_room$|^home_/.test(loc);
  }
  var current = {};
  /* Persistent banners: modules register fn() -> html or null; shown above the story every render. */
  var banners = [];
  G.addBanner = function (fn) { banners.push(fn); };
  // G.addPanel(fn): fn(state) returns HTML placed at the top of the side panel on every render (doll.js uses it for the paperdoll)
  var panelAdds = [];
  G.addPanel = function (fn) { if (typeof fn === 'function') panelAdds.push(fn); };
  function renderBanners() {
    var b = el('banners'); if (!b) return;
    var out = '';
    banners.forEach(function (fn) { try { var h = fn(); if (h) out += '<div class="banner">' + h + '</div>'; } catch (e) { console.error(e); } });
    b.innerHTML = out; b.hidden = !out;
  }
  /* Option `check`: a string or function(state) -> e.g. 'Skulduggery: Hard'. Shown after the time as span.chk.chk-<difficulty>. */
  function checkOf(o) {
    var c = o.check; if (!c) return '';
    if (typeof c === 'function') { try { c = c(G.state); } catch (e) { return ''; } }
    return c ? String(c).replace(/<[^>]+>/g, '') : '';
  }
  function checkClass(txt) {
    var w = String(txt).toLowerCase().replace(/[^a-z]/g, '');
    var L = ['veryhard', 'challenging', 'reasonable', 'simple', 'easy', 'hard'];
    for (var i = 0; i < L.length; i++) if (w.slice(-L[i].length) === L[i]) return 'chk-' + L[i];
    return 'chk-other';
  }
  G.checkClass = checkClass;
  /* ---------- option previews, locks, collapsible sections (v26.10.19.1) ---------- */
  var SET_KEY = 'hollowbrook_settings_v1'; // same key extras.js uses, so G.settings persists in one place
  function settingsObj() {
    if (!G.settings) { var s0 = {}; try { s0 = JSON.parse(store.get(SET_KEY) || '{}') || {}; } catch (e) { s0 = {}; } G.settings = s0; }
    return G.settings;
  }
  function persistSettings() { try { store.set(SET_KEY, JSON.stringify(settingsObj())); } catch (e) { console.error('settings', e); } }
  function stripTags(s) { return String(s == null ? '' : s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, ''); }
  function valOf(v) { if (typeof v === 'function') { try { return v(G.state); } catch (e) { console.error('option field', e); return null; } } return v; }
  var TIME_TOKEN = /^\(?\d+:\d\d\)?$|^~?\d+(\.\d+)?\s*(h|hr|hrs|hours?|m|min|mins|minutes?)(\s+\d+\s*(m|min|mins|minutes?))?$/i;
  /* Option `effects`: string | [strings] | function(state) -> either. Tokens split on '·' or '|'. '!' prefix = bad (red), '^' = good (green). */
  function effectTokens(o, timeShown) {
    var v = valOf(o.effects); if (v == null || v === false || v === '') return [];
    var raw = Object.prototype.toString.call(v) === '[object Array]' ? v : [v], out = [];
    raw.forEach(function (x) {
      if (x == null || x === false) return;
      stripTags(x).split(/\s*[\u00b7|]\s*/).forEach(function (t) {
        t = t.replace(/^\s+|\s+$/g, ''); if (!t) return;
        var tone = '';
        if (t.charAt(0) === '!') { tone = 'bad'; t = t.slice(1); } else if (t.charAt(0) === '^') { tone = 'good'; t = t.slice(1); }
        t = t.replace(/^\s+/, ''); if (!t) return;
        if (timeShown && TIME_TOKEN.test(t)) return; // the engine already shows the time
        var c0 = t.charAt(0), dir = '';
        if (c0 === '+') dir = 'up';
        else if (c0 === '-' || c0 === '\u2212' || c0 === '\u2013') { dir = 'down'; t = '\u2212' + t.slice(1); }
        out.push({ text: t, dir: dir, tone: tone });
      });
    });
    return out;
  }
  G.effectTokens = effectTokens;
  function effectsHtml(toks) {
    if (!toks.length) return '';
    return ' <span class="fx">' + toks.map(function (t) {
      return '<span class="fx-tok' + (t.dir ? ' fx-' + t.dir : '') + (t.tone ? ' fx-' + t.tone : '') + '">' + esc(t.text) + '</span>';
    }).join('<span class="fx-sep" aria-hidden="true"> \u00b7 </span>') + '</span>';
  }
  /* Option `reason`: string | function(state). Shown under a disabled option. */
  function reasonOf(o) { var r = valOf(o.reason); r = r == null || r === false ? '' : stripTags(r); return r.replace(/^\uD83D\uDD12\s*/, ''); }
  G.reasonOf = reasonOf;
  function collapsedMap() { var s = settingsObj(); if (!s.collapsed || typeof s.collapsed !== 'object') s.collapsed = {}; return s.collapsed; }
  function isCollapsed(id) { if (id === 'now' || !G.settings || !G.settings.collapsed) return false; return !!G.settings.collapsed[id]; }
  G.isSectionCollapsed = isCollapsed;
  G.toggleSection = function (id, on) {
    if (!id || id === 'now') return false;
    var c = collapsedMap(); on = on === undefined ? !c[id] : !!on;
    if (on) c[id] = true; else delete c[id];
    persistSettings(); render(); return on;
  };
  G.expandAllSections = function () { settingsObj().collapsed = {}; persistSettings(); render(); };

  function render() {
    if (!started) return;
    renderBanners();
    current = collectOptions();
    var S = G.settings || {};
    var html = '', visibleN = 0, hints = S.numberHints !== false, icons = S.icons !== false, showFx = S.showEffects !== false, showLocked = S.showLocked !== false;
    var buckets = {}; SECTIONS.forEach(function (sec) { buckets[sec[0]] = []; });
    ['dialogue', 'actions', 'other', 'travel'].forEach(function (k) {
      current[k].forEach(function (o, i) {
        if (dormOnly(o) && !inDorm()) return;
        if (o.disabled && !showLocked) return;
        var sec = sectionOf(o, k); (buckets[sec] || buckets.here).push({ o: o, k: k, i: i });
      });
    });
    SECTIONS.forEach(function (sec) {
      var list = buckets[sec[0]]; if (!list.length) return;
      list = list.map(function (it, n) { it.n = n; return it; }).sort(function (a, b) { var pa = typeof a.o.priority === 'number' ? a.o.priority : 0, pb = typeof b.o.priority === 'number' ? b.o.priority : 0; return pb - pa || a.n - b.n; });
      var sid = sec[0], canFold = sid !== 'now', folded = canFold && isCollapsed(sid);
      html += '<section class="optgroup sec-' + sid + (folded ? ' collapsed' : '') + '">';
      if (canFold) {
        html += '<h3><button type="button" class="sec-tog" data-sec="' + sid + '" aria-expanded="' + (folded ? 'false' : 'true') + '" aria-controls="opts-' + sid + '">' +
          '<span class="sec-name">' + sec[1] + '</span>' + (folded ? ' <span class="sec-n">(' + list.length + ')</span>' : '') +
          ' <span class="caret" aria-hidden="true">' + (folded ? '\u25b8' : '\u25be') + '</span></button></h3>';
      } else html += '<h3>' + sec[1] + ':</h3>';
      if (folded) { html += '<div id="opts-' + sid + '" hidden></div></section>'; return; } // collapsed: not rendered, so number keys skip it
      html += '<div id="opts-' + sid + '" class="optbody"><ul>';
      var lastSub = null;
      list.forEach(function (it) {
        var o = it.o, k = it.k, i = it.i;
        if (o.sub && o.sub !== lastSub) { html += '</ul><h4 class="optsub">' + esc(o.sub) + ':</h4><ul>'; lastSub = o.sub; }
        var lbl = o.label, tv = [o.time, o.mins, o.minutes].filter(function (v) { return v !== undefined && v !== null; })[0], tm = null;
        if (typeof tv === 'function') { try { tv = tv(G.state); } catch (e) { tv = null; } }
        tm = typeof tv === 'number' ? tv : guessTime(o);
        var timeShown = /\(\d+:\d\d\)/.test(String(lbl));
        if (tm !== null && tm > 0 && !timeShown) { lbl += ' <span class="tm">' + G.fmtTime(tm) + '</span>'; timeShown = true; }
        var ck = checkOf(o); if (ck) lbl += ' <span class="chk ' + checkClass(ck) + '">' + esc(ck) + '</span>';
        if (showFx && o.effects != null) lbl += effectsHtml(effectTokens(o, timeShown));
        if (o.icon && icons) lbl = '<span class="ico" aria-hidden="true">' + esc(o.icon) + '</span>' + lbl;
        var why = o.disabled ? reasonOf(o) : '';
        if (why) {
          // locked: greyed out, not clickable, reason underneath
          html += '<li class="locked"><a href="#" class="opt disabled locked" aria-disabled="true" tabindex="-1" data-g="' + k + '" data-i="' + i + '"' +
            (o.hint ? ' title="' + esc(o.hint) + '"' : '') + '>' + lbl + '</a><span class="why"><span class="ico-lock" aria-hidden="true">\uD83D\uDD12 </span>' + esc(why) + '</span></li>';
          return;
        }
        html += '<li><a href="#" class="opt' + (o.disabled ? ' disabled' : '') + '" data-g="' + k + '" data-i="' + i + '"' +
          (o.hint ? ' title="' + esc(o.hint) + '"' : '') + '>' + (hints && !o.disabled && visibleN < 9 ? '<span class="num">' + (visibleN + 1) + '</span>' : '') + lbl + '</a></li>';
        if (!o.disabled) visibleN++;
      });
      html += '</ul></div></section>';
    });
    el('options').innerHTML = html;
    renderPanel();
  }
  G.render = render;

  var NEEDS = [
    ['fatigue', 'Fatigue', 700], ['stress', 'Stress', 700], ['control', 'Control', null],
    ['bladder', 'Bladder', 600], ['bowels', 'Bowels', 600], ['thirst', 'Thirst', null], ['hunger', 'Hunger', null]
  ];
  var LOW_BAD = { thirst: 1, hunger: 1, control: 1 };
  /* Need words + 0..6 level. Uses Jimmy's G.stats.needWords / needLevel when present (string or {text, level}); otherwise a plain fallback. */
  function needInfo(id, v) {
    var lv = null, txt = '';
    try {
      if (G.stats && typeof G.stats.needLevel === 'function') { var l = Number(G.stats.needLevel(id, v)); if (isFinite(l)) lv = l; }
      if (G.stats && typeof G.stats.needWords === 'function') {
        var w = G.stats.needWords(id, v);
        if (w && typeof w === 'object') { txt = w.text != null ? String(w.text) : ''; if (lv === null && isFinite(Number(w.level))) lv = Number(w.level); }
        else if (w != null) txt = String(w);
      }
    } catch (e) { txt = ''; }
    if (lv === null) { var bad = LOW_BAD[id] ? 1000 - v : v; lv = Math.floor(Math.max(0, Math.min(1000, bad)) / 1000 * 7); }
    lv = Math.max(0, Math.min(6, Math.round(lv)));
    return { text: txt, level: lv, value: v };
  }
  G.needInfo = needInfo;
  function clockStr(t) {
    if (typeof G.fmtClock === 'function' && typeof t.hour === 'number') { try { return G.fmtClock(t.hour, t.minute || 0); } catch (e) {} }
    return t.clock || '';
  }
  function renderMobileBar(n, t) {
    var bar = el('mbar');
    if (!bar) {
      var app = el('app'); if (!app) return;
      bar = document.createElement('div'); bar.id = 'mbar'; bar.setAttribute('role', 'button'); bar.setAttribute('tabindex', '0');
      bar.setAttribute('aria-controls', 'panel'); bar.setAttribute('aria-expanded', 'false');
      app.insertBefore(bar, app.firstChild);
    }
    var words = !G.settings || G.settings.needDisplay !== 'numbers';
    var rows = NEEDS.map(function (row) { var v = Math.round(Number(n[row[0]]) || 0); var ni = needInfo(row[0], v); ni.name = row[1]; ni.id = row[0]; return ni; })
      .filter(function (r) { return r.level >= 2; }).sort(function (a, b) { return b.level - a.level; }).slice(0, 3);
    var h = '<span class="mb-time">' + esc(clockStr(t)) + '</span><span class="mb-money">$' + (Number(G.state.money) || 0).toFixed(2) + '</span><span class="mb-needs">';
    h += rows.length ? rows.map(function (r) { return '<span class="mb-need lvl' + r.level + '">' + r.name + ': ' + esc(words && r.text ? r.text : String(r.value)) + '</span>'; }).join('') : '<span class="mb-need lvl0">Feeling fine</span>';
    h += '</span><span class="mb-tog" aria-hidden="true">\u2630</span>';
    bar.innerHTML = h;
  }
  function renderPanel() {
    var s = G.state, n = (s.stats && s.stats.needs) || {}, t = G.time;
    var who = (s.creation && s.creation.player && s.creation.player.name) || 'You';
    var loc = (G.world && G.world.location) ? (G.world.location() || {}).name || '' : '';
    var words = !G.settings || G.settings.needDisplay !== 'numbers';
    var h = '';
    panelAdds.forEach(function (fn) { try { var ph = fn(G.state); if (ph) h += ph; } catch (e) { console.warn('panel hook', e); } });   // e.g. the paperdoll (doll.js)
    h += '<div class="who">' + esc(who) + '</div>';
    h += '<div class="clock">' + (t.weekday || '') + ', Day ' + t.day + ' · ' + esc(clockStr(t)) + (t.season ? ' · ' + t.season : '') + '</div>';
    if (loc) h += '<div class="loc">' + esc(loc) + '</div>';
    h += '<div class="money">$' + (Number(s.money) || 0).toFixed(2) + '</div>';
    NEEDS.forEach(function (row) {
      var v = Math.round(Number(n[row[0]]) || 0), pct = Math.max(0, Math.min(100, v / 10));
      // thirst, hunger, control: low is bad. others: high is bad.
      var lowBad = !!LOW_BAD[row[0]];
      var bad = lowBad ? v < 250 : (row[2] && v >= row[2]);
      var ni = needInfo(row[0], v);
      if (words && ni.text) {
        h += '<div class="need words lvl' + ni.level + (ni.level >= 5 ? ' warn' : '') + '" title="' + row[1] + ' ' + v + ' / 1000"><span>' + row[1] + ': <span class="nw">' + esc(ni.text) + '</span></span>' +
          '<div class="bar"><div class="lvl' + ni.level + '" style="width:' + pct + '%"></div></div></div>';
      } else {
        h += '<div class="need lvl' + ni.level + (bad ? ' warn' : '') + '" title="' + row[1] + ' ' + v + ' / 1000"><span>' + row[1] + '</span><span class="val">' + v + '</span>' +
          '<div class="bar"><div class="lvl' + ni.level + '" style="width:' + pct + '%"></div></div></div>';
      }
    });
    h += '<button id="btn-char">Character</button>';
    h += '<div class="sysbtns"><button id="btn-saves">Saves</button><button id="btn-help">How to play</button><button id="btn-settings">Settings</button></div>';
    el('panel').innerHTML = h;
    try { renderMobileBar(n, t); } catch (e) { console.error('mbar', e); }
  }

  function openCharMenu(tabId) {
    var m = el('charmenu');
    if (!tabs.length) { el('charbody').innerHTML = '<p>Nothing to show yet.</p>'; m.hidden = false; return; }
    tabId = tabId || tabs[0].id;
    el('chartabs').innerHTML = tabs.map(function (t) { return '<button data-tab="' + t.id + '" class="' + (t.id === tabId ? 'on' : '') + '">' + t.label + '</button>'; }).join('');
    var tab = tabs.filter(function (t) { return t.id === tabId; })[0];
    var body; try { body = tab.render(G.state); } catch (e) { console.error(e); body = '<p>This tab failed to load.</p>'; }
    el('charbody').innerHTML = body;
    m.hidden = false;
  }
  G.openCharMenu = openCharMenu;

  /* ---------- save / load: autosave + 3 slots ---------- */
  var SLOT_KEY = function (n) { return SAVE_KEY + '_slot' + n; };
  function readSave(key) { try { var r = store.get(key); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  function saveSummary(st) {
    if (!st) return '<span class="flavor">Empty</span>';
    var p = (st.creation && st.creation.player) || {}, w = st.world || {};
    var when = st._savedAt ? new Date(st._savedAt).toLocaleString() : '';
    return esc(p.name || 'Unnamed') + ' · Day ' + (w.day || 1) + ' · $' + (Number(st.money) || 0).toFixed(0) + (when ? ' <span class="flavor">(' + when + ')</span>' : '');
  }
  G.save = function (quiet) {
    try { G.state._savedAt = Date.now(); store.set(SAVE_KEY, JSON.stringify(G.state)); if (!quiet) G.notify('Game saved.', 'info'); } catch (e) { console.error(e); }
  };
  G.saveSlot = function (n) {
    G.state._savedAt = Date.now(); store.set(SLOT_KEY(n), JSON.stringify(G.state)); G.notify('Saved to slot ' + n + '.', 'info'); openSaves();
  };
  function resume(st, msg) {
    G.state = st; initModules(); started = true;
    var cr0 = el('sol-creation'); if (cr0) cr0.remove();
    closeOverlay(); el('charmenu').hidden = true;
    pendingNotes = []; renderNotes();
    G.story(msg || '<p>You pick up where you left off.</p>'); render();
  }
  G.loadSlot = function (n) { var st = readSave(n === 0 ? SAVE_KEY : SLOT_KEY(n)); if (st) resume(st); };
  G.load = function () { var st = readSave(SAVE_KEY); if (!st) { G.notify('No save found.', 'info'); return false; } resume(st); return true; };
  G.newGame = function () {
    if (started && !confirm('Start a new game? Your autosave will be replaced (save slots are kept).')) return;
    store.remove(SAVE_KEY); location.reload();
  };

  /* ---------- overlays: title, saves, how to play ---------- */
  function overlay(html) {
    var o = el('overlay'); if (!o) { o = document.createElement('div'); o.id = 'overlay'; document.body.appendChild(o); }
    o.innerHTML = '<div class="sheet">' + html + '</div>'; o.hidden = false;
  }
  function closeOverlay() { var o = el('overlay'); if (o) o.hidden = true; }
  G.closeOverlay = closeOverlay;

  function openSaves() {
    var h = '<button class="x" data-ov="close">×</button><h2>Saves</h2><p class="flavor">Your notebook of moments. The game also autosaves after every action.</p><table class="saves">';
    h += '<tr><td>Autosave</td><td>' + saveSummary(readSave(SAVE_KEY)) + '</td><td>' + (readSave(SAVE_KEY) ? '<button data-ov="load" data-n="0">Load</button>' : '') + '</td><td></td></tr>';
    for (var n = 1; n <= 3; n++) {
      var st = readSave(SLOT_KEY(n));
      h += '<tr><td>Slot ' + n + '</td><td>' + saveSummary(st) + '</td><td>' + (st ? '<button data-ov="load" data-n="' + n + '">Load</button>' : '') + '</td><td>' +
        (started ? '<button data-ov="save" data-n="' + n + '">Save here</button>' : '') + (st ? ' <button data-ov="del" data-n="' + n + '">Delete</button>' : '') + '</td></tr>';
    }
    h += '</table>';
    h += saveReminder();
    h += '<h3>Save files</h3><p class="flavor small0">Keep a copy outside the browser, or move your game to another device.</p><p class="savefile">' +
      ((started || readSave(SAVE_KEY)) ? '<button data-ov="export">Download save (.json)</button> <button data-ov="showjson">Show save text</button> ' : '') +
      '<button data-ov="importfile">Load from file</button> <button data-ov="paste">Paste save text</button>' +
      '<input type="file" id="savefile-in" accept=".json,application/json,text/plain" hidden></p><div id="savejson"></div>';
    if (started) h += '<p><button data-ov="new">Start a new game</button></p>';
    overlay(h);
  }
  G.openSaves = openSaves;

  /* ---------- save files: export / import ---------- */
  function exportDay() { return (G.state && G.state._exportDay) || 0; }
  function saveReminder() {
    if (store.fallback) return '<p class="savewarn">This browser is not letting the game keep saves, so your progress disappears when the tab closes. Use <b>Download save</b> (or <b>Show save text</b> and copy it somewhere) to keep it.</p>';
    if (started && (G.time.day || 1) - (exportDay() || 1) >= 3) return '<p class="savenote">It has been a few days since you downloaded a backup. A save file keeps your game safe if the browser clears its storage.</p>';
    return '';
  }
  function exportState() { return started ? G.state : readSave(SAVE_KEY); }
  function exportName(st) {
    var p = (st.creation && st.creation.player && st.creation.player.name) || 'save', d = (st.world && st.world.day) || 1;
    return 'hollowbrook-' + String(p).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-day' + d + '.json';
  }
  function markExported() { if (started) { G.state._exportDay = G.time.day || 1; G.save(true); } }
  function showSaveText(st) {
    var box = el('savejson'); if (!box) return;
    box.innerHTML = '<p class="flavor">Copy all of this text and keep it somewhere safe. Paste it back with <b>Paste save text</b>.</p><textarea id="savejson-out" readonly rows="6"></textarea>';
    var ta = el('savejson-out'); ta.value = JSON.stringify(st); try { ta.focus(); ta.select(); } catch (e) {}
  }
  G.exportSave = function () {
    var st = exportState(); if (!st) { G.notify('Nothing to save yet.', 'info'); return false; }
    if (started) st._savedAt = Date.now();
    var json = JSON.stringify(st), ok = false;
    try {
      if (typeof Blob === 'function' && window.URL && URL.createObjectURL) {
        var url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        var a = document.createElement('a');
        if ('download' in a) {
          a.href = url; a.download = exportName(st); a.style.display = 'none'; document.body.appendChild(a); a.click();
          setTimeout(function () { try { URL.revokeObjectURL(url); a.remove(); } catch (e) {} }, 1500);
          ok = true;
        }
      }
    } catch (e) { ok = false; }
    if (!ok) showSaveText(st);
    markExported();
    return ok;
  };
  function validSave(st) { return !!(st && typeof st === 'object' && !Array.isArray(st) && (st.creation || st.world || st.stats)); }
  G.importSave = function (text) {
    var st; try { st = JSON.parse(String(text || '').replace(/^\uFEFF/, '').trim()); } catch (e) { st = null; }
    if (!validSave(st)) { alert('That does not look like a Hollowbrook save.'); return false; }
    var p = (st.creation && st.creation.player && st.creation.player.name) || 'Unnamed', d = (st.world && st.world.day) || 1;
    if (!confirm('Load ' + p + ', day ' + d + ' from this save?' + (started ? ' Anything since your last save in this session will be lost.' : ''))) return false;
    st._exportDay = (st.world && st.world.day) || 1;
    store.set(SAVE_KEY, JSON.stringify(st));
    resume(st, '<p>You pick up where you left off.</p>');
    return true;
  };
  function readFileInput(inp) {
    var f = inp.files && inp.files[0]; if (!f) return;
    if (typeof FileReader !== 'function') { alert('This browser cannot read files. Use Paste save text instead.'); return; }
    var r = new FileReader();
    r.onload = function () { G.importSave(r.result); inp.value = ''; };
    r.onerror = function () { alert('Could not read that file.'); };
    r.readAsText(f);
  }
  function showPaste() {
    var box = el('savejson'); if (!box) return;
    box.innerHTML = '<p class="flavor">Paste the save text below.</p><textarea id="savejson-in" rows="6"></textarea><p><button data-ov="loadpaste">Load pasted save</button></p>';
    try { el('savejson-in').focus(); } catch (e) {}
  }

  var HELP = [
    ['The basics', 'The story text at the top describes what just happened. Below it are your choices, sorted into Dialogue, Actions, Travel and Other. Click one, or press its number key (1 to 9). Every choice takes some time, and the clock in the side panel moves on.'],
    ['Your needs', 'Fatigue, Stress, Bladder and Bowels are bad when they are high. Thirst, Hunger and Control are bad when they are low. At 700 fatigue you start to feel tired, and at 1000 you pass out. A bladder past 600 nags at you; at 1000 you will have an accident. Eat, drink, rest and use restrooms to stay on top of things.'],
    ['Characteristics', 'Beauty, Physique, Willpower and Awareness grow as you use them and slowly fade if you neglect them. Skills are ranked F, F+, D, D+, C, C+, B, B+, A, A+ and S. Open the Character menu in the side panel to see them.'],
    ['College', 'Classes run on weekdays at 09:00 and 13:00. Attend, study and pass exams to keep your standing; skipping class raises delinquency.'],
    ['People', 'Hollowbrook\'s named residents keep their own schedules, so where you find them depends on the day and the hour. Kindness and time spent raise their opinion of you. Anyone can be romanced, but most will want you to finish something meaningful with them before you date.'],
    ['Money and trouble', 'Part-time work, farming and selling produce earn honest money. Skulduggery earns faster money but raises your crime rating, and getting caught has consequences.'],
    ['Journal', 'Forgot what someone asked of you? The Journal tab in the Character menu keeps a summary of every quest.']
  ];
  function openHelp() {
    overlay('<button class="x" data-ov="close">×</button><h2>How to Play</h2>' + HELP.map(function (x) { return '<h3>' + x[0] + '</h3><p>' + x[1] + '</p>'; }).join(''));
  }
  G.openHelp = openHelp;

  function titleTip() {
    var t = ''; try { t = typeof G.randomTip === 'function' ? G.randomTip() : ''; } catch (e) { t = ''; }
    return t ? '<p class="tip"><b>Tip:</b> ' + esc(t) + '</p>' : '';
  }
  function openTitle() {
    var auto = readSave(SAVE_KEY), hasAuto = auto && auto.creation && auto.creation.done;
    overlay('<div class="title"><h1>Hollowbrook</h1><p class="flavor">A quiet college town, a rainy autumn, and a year that is entirely yours.</p>' +
      (hasAuto ? '<button data-ov="continue">Continue <span class="flavor">(' + saveSummary(auto) + ')</span></button>' : '') +
      '<button data-ov="begin">New game</button><button data-ov="saves">Load a save</button><button data-ov="help">How to play</button>' +
      titleTip() +
      '<p class="flavor small">All characters are adults (18+). ' + G.version + '</p></div>');
    el('overlay').classList.add('titlemode');
  }

  function freshState() {
    return { money: 40, lock: null, stats: { needs: { fatigue: 0, stress: 100, control: 800, bladder: 150, bowels: 100, thirst: 800, hunger: 750 }, clothing: { upperWetness: 0, upperIntegrity: 100, lowerWetness: 0, lowerIntegrity: 100 } } };
  }
  function initModules() { mods.forEach(function (m) { if (m.init) { try { m.init(G.state); } catch (e) { console.error(m.id + '.init', e); } } }); }

  /* Called by creation.js when the player finishes the creation screen. */
  G.start = function () {
    if (started) return;
    started = true;
    G.emit('start', G.state);
    var intro = '<p>Monday morning. ' + (G.time.season || 'Autumn') + ' light leaks around the thin curtains of your dorm room in Ashford Hall, and somewhere down the corridor a kettle is shrieking. Your first day at Hollowbrook College starts today.</p>';
    G.story(intro);
    pendingNotes = []; renderNotes(); render(); G.save(true);
  };

  /* Engine display settings, added to the Settings sheet extras.js builds (Display group). data-set buttons go through extras.js's own handler. */
  function onoff(key, on, off) {
    var cur = settingsObj()[key] !== false;
    return '<button data-set="' + key + '" data-v="1"' + (cur ? ' class="on"' : '') + '>' + on + '</button> <button data-set="' + key + '" data-v="0"' + (!cur ? ' class="on"' : '') + '>' + off + '</button>';
  }
  function injectSettings() {
    var o = el('overlay'); if (!o || o.hidden) return;
    var h2 = o.querySelector('.sheet h2'); if (!h2 || !/^\s*Settings\s*$/.test(h2.textContent)) return;
    var old = o.querySelector('.hb-engset'); if (old) old.parentNode.removeChild(old);
    var nC = Object.keys(collapsedMap()).filter(function (k) { return G.settings.collapsed[k]; }).length;
    var box = document.createElement('div'); box.className = 'hb-engset';
    box.innerHTML = '<p><b>Effect previews on choices</b> <span class="flavor">(e.g. +Fatigue \u00b7 \u2212$12)</span><br>' + onoff('showEffects', 'On', 'Off') + '</p>' +
      '<p><b>Locked choices</b> <span class="flavor">(greyed out, with the reason)</span><br>' + onoff('showLocked', 'Show', 'Hide') + '</p>' +
      '<p><b>Choice sections</b> <span class="flavor">(click a heading to fold it; ' + (nC ? nC + ' folded' : 'none folded') + ')</span><br><button data-hb="expandall"' + (nC ? '' : ' disabled') + '>Expand all sections</button></p>';
    var hs = o.querySelectorAll('.sheet h3'), game = null;
    for (var i = 0; i < hs.length; i++) if (/^\s*Game\s*$/.test(hs[i].textContent)) { game = hs[i]; break; }
    if (game) game.parentNode.insertBefore(box, game); else o.querySelector('.sheet').appendChild(box);
  }
  G.injectEngineSettings = injectSettings;

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    document.body.addEventListener('click', function (e) {
      var tg = e.target.closest('.sec-tog');
      if (tg) { e.preventDefault(); var sid = tg.getAttribute('data-sec'); G.toggleSection(sid); var nb = document.querySelector('#options .sec-tog[data-sec="' + sid + '"]'); if (nb) try { nb.focus(); } catch (x) {} return; }
      var a = e.target.closest('.opt');
      if (a) { e.preventDefault(); var o = current[a.dataset.g][+a.dataset.i]; G.act(o, { k: a.dataset.g }); return; }
      if (e.target.closest('#mbar')) { document.body.classList.toggle('panel-open'); var mb = el('mbar'); if (mb) mb.setAttribute('aria-expanded', document.body.classList.contains('panel-open') ? 'true' : 'false'); return; }
      if (e.target.id === 'btn-char') return openCharMenu();
      if (e.target.closest('#chartabs') && e.target.dataset.tab) return openCharMenu(e.target.dataset.tab);
      if (e.target.id === 'charclose' || e.target.id === 'charmenu') { el('charmenu').hidden = true; return; }
      if (e.target.id === 'btn-saves') return openSaves();
      if (e.target.id === 'btn-help') return openHelp();
      var ov = e.target.closest('[data-ov]');
      if (ov) {
        var act = ov.dataset.ov, n = +ov.dataset.n;
        el('overlay').classList.remove('titlemode');
        if (act === 'close') { started ? closeOverlay() : openTitle(); }
        else if (act === 'continue') G.load();
        else if (act === 'begin') { closeOverlay(); store.remove(SAVE_KEY); if (!G.module('creation')) G.start(); }
        else if (act === 'saves') openSaves();
        else if (act === 'help') openHelp();
        else if (act === 'load') G.loadSlot(n);
        else if (act === 'save') G.saveSlot(n);
        else if (act === 'del') { if (confirm('Delete slot ' + n + '?')) { store.remove(SLOT_KEY(n)); openSaves(); } }
        else if (act === 'new') G.newGame();
        else if (act === 'export') G.exportSave();
        else if (act === 'showjson') { var sj = exportState(); if (sj) { showSaveText(sj); markExported(); } }
        else if (act === 'importfile') { var fi = el('savefile-in'); if (fi) fi.click(); }
        else if (act === 'paste') showPaste();
        else if (act === 'loadpaste') { var pi = el('savejson-in'); if (pi) G.importSave(pi.value); }
        return;
      }
    });
    // Runs after extras.js's document listener has (re)built the Settings sheet.
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-hb="expandall"]')) G.expandAllSections();
      injectSettings();
    });
    if (typeof G.openSettings === 'function') { var openSet0 = G.openSettings; G.openSettings = function () { var r = openSet0.apply(this, arguments); injectSettings(); return r; }; }
    settingsObj();
    document.body.addEventListener('change', function (e) { if (e.target && e.target.id === 'savefile-in') readFileInput(e.target); });
    document.addEventListener('keydown', function (e) {
      if (e.target && e.target.id === 'mbar' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.target.click(); return; }
      if (e.key === 'Escape') { el('charmenu').hidden = true; if (started) closeOverlay(); }
      var n = parseInt(e.key, 10); // number keys pick the nth visible option
      var ovl = el('overlay'), menuOpen = !el('charmenu').hidden || (ovl && !ovl.hidden);
      if (started && !menuOpen && n >= 1 && n <= 9 && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
        var links = document.querySelectorAll('#options .opt:not(.disabled)'); if (links[n - 1]) links[n - 1].click();
      }
    });

    // Fresh state behind the title screen; creation.js opens underneath, the title sits on top.
    G.state = freshState(); initModules();
    openTitle();
  });
})();
