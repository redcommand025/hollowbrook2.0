/* creation.js - world & character creation (owner: Lucy)
 * Owns G.state.creation. Shows a full-screen overlay before play starts.
 *
 * Shape written to G.state.creation:
 * {
 *   done: bool,
 *   player: { name, age, pronouns, gender (male|female|neither), anatomy (clothing fit only, locked after start),
 *             appearance, bodySize (small|average|large, permanent), height, build,
 *             skin, hairColor, hairStyle, eyeColor, freckles, background (waif|nerd|athlete|delinquent|beautiful), backgroundLegacy },
 *   npcOverrides: { <npcId>: { gender, appearance } },   // names never editable
 *   world: { startSeason, needsPace, startMoney, npcGender: {male, female, neither} (percent, sums to 100) }
 * }
 * Reads the named-NPC roster from window.NNPC_ROSTER (array of
 * {id, name, category, gender, appearance, blurb}) published by npcs.js.
 * On finish: emits G.emit('creationDone', state.creation) and calls G.start() if present.
 * Public helpers: Creation.open(), Creation.paperdollSVG(player), Creation.describe(player),
 *                 Creation.npcLook(id) -> {gender, appearance} with overrides applied.
 */
(function () {
  'use strict';

  var OPT = {
    pronouns:   ['she/her', 'he/him', 'they/them'],
    gender:     [['female', 'Female'], ['male', 'Male'], ['neither', 'Neither']],
    bodySize:   [['small', 'Small (harder)'], ['average', 'Average'], ['large', 'Large (easier)']],
    anatomy:    [['penis', 'Penis'], ['vagina', 'Vagina'], ['both', 'Both']],
    appearance: [['female', 'Feminine'], ['male', 'Masculine'], ['androgynous', 'Androgynous']],
    height:     [['short', 'Short'], ['average', 'Average'], ['tall', 'Tall']],
    build:      [['slight', 'Slight'], ['slim', 'Slim'], ['average', 'Average'], ['athletic', 'Athletic'], ['curvy', 'Curvy'], ['heavyset', 'Heavyset']],
    skin:       [['porcelain', 'Porcelain', '#f6dcc9'], ['fair', 'Fair', '#eec4a4'], ['olive', 'Olive', '#d1a07a'], ['tan', 'Tan', '#b9825a'], ['brown', 'Brown', '#8d5a3b'], ['deep', 'Deep', '#5c3826']],
    hairColor:  [['black', 'Black', '#1c1a1a'], ['brown', 'Brown', '#5a3a22'], ['chestnut', 'Chestnut', '#7b3f1d'], ['blonde', 'Blonde', '#d8b45c'], ['ginger', 'Ginger', '#b5521f'], ['auburn', 'Auburn', '#8a2f1f'], ['platinum', 'Platinum', '#e8e2cf'], ['grey', 'Grey', '#9a9a9a'], ['dyed blue', 'Dyed blue', '#3b5fbf'], ['dyed pink', 'Dyed pink', '#d9709f'], ['dyed purple', 'Dyed purple', '#7a4fa8'], ['dyed green', 'Dyed green', '#3f8f5a'], ['dyed red', 'Dyed cherry red', '#b0242f'], ['dyed silver', 'Dyed silver', '#c4c8d0']],
    hairStyle:  [['buzzed', 'Buzzed'], ['short', 'Short'], ['messy', 'Messy'], ['bob', 'Bob'], ['shoulder', 'Shoulder-length'], ['long', 'Long'], ['ponytail', 'Ponytail'], ['braid', 'Braid'], ['curly', 'Curly']],
    eyeColor:   [['brown', 'Brown', '#5b3a1e'], ['hazel', 'Hazel', '#8e7340'], ['green', 'Green', '#3f7a4a'], ['blue', 'Blue', '#3f6fae'], ['grey', 'Grey', '#7d8790'], ['amber', 'Amber', '#c08a2b']],
    // [id, name, blurb, start money, trade-offs (+ good, - bad), recommended]
    background: [
      ['waif', 'Waif', 'You arrive with a duffel bag and no particular reputation. Nothing to live up to, nothing to live down.', 120, ['+ Balanced stats', '+ Steady starting cash', '- Nothing stands out yet'], true],
      ['nerd', 'Nerd', 'Top of every class you ever took, and everyone at Hollowbrook seems to know it.', 100, ['+ Good grades', '+ Teachers like you', '- Low student status'], false],
      ['athlete', 'Athlete', 'Recruited for the pool and the track. Coursework was always the thing you did between practices.', 100, ['+ High physique', '+ Strong swimmer', '- Bad grades'], false],
      ['delinquent', 'Delinquent', 'Your name gets around, and not because of the honour roll.', 80, ['+ High student status', '- High delinquency (crime)', '- Less starting cash'], false],
      ['beautiful', 'Beautiful', 'Heads turn when you walk in. That opens doors, and it makes it hard to blend in.', 50, ['+ Big Beauty boost', '+ Big Charm boost', '- Very little starting cash', '- More attention and stress'], false]
    ],
    startSeason: [['autumn', 'Autumn (term starts)'], ['winter', 'Winter'], ['spring', 'Spring'], ['summer', 'Summer']],
    needsPace:   [['gentle', 'Gentle: needs build slowly'], ['normal', 'Normal'], ['harsh', 'Harsh: needs build quickly']]
  };

  var DEFAULT_PLAYER = {
    name: '', age: 19, pronouns: 'they/them', gender: 'neither', anatomy: 'vagina', appearance: 'androgynous', bodySize: 'average',
    height: 'average', build: 'average', skin: 'fair', hairColor: 'brown', hairStyle: 'shoulder',
    eyeColor: 'hazel', freckles: false, background: 'waif'
  };

  var FIRST_NAMES = ['Alex', 'Robin', 'Sam', 'Jules', 'Casey', 'Morgan', 'Riley', 'Quinn', 'Avery', 'Eden', 'Sasha', 'Noel', 'Rowan', 'Kit', 'Ash'];

  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function find(list, v) { for (var i = 0; i < list.length; i++) if (list[i][0] === v) return list[i]; return list[0]; }
  function find2(list, v) { for (var i = 0; i < list.length; i++) if (list[i][0] === v) return list[i]; return null; }
  var LEGACY_BG = { scholarship: 'nerd', local: 'waif', farmhand: 'athlete', streetwise: 'delinquent', comfortable: 'waif' };
  var PRONOUNS = { female: 'she/her', male: 'he/him', neither: 'they/them' };
  function pronounsFor(g) { return PRONOUNS[g] || 'they/them'; }
  function curPlayer() { var g = G(); return g && g.state && g.state.creation ? g.state.creation.player : null; }
  function bodySizeMod(p) { p = p || curPlayer(); var b = p && p.bodySize; return b === 'small' ? -1 : b === 'large' ? 1 : 0; }
  function rollNpcGender() {
    var g = G(), w = g && g.state && g.state.creation && g.state.creation.world, ng = (w && w.npcGender) || { male: 45, female: 45, neither: 10 };
    var tot = (ng.male || 0) + (ng.female || 0) + (ng.neither || 0), r = Math.random() * (tot || 1);
    if (!tot) return pick(['male', 'female']);
    if (r < ng.female) return 'female'; if (r < ng.female + ng.male) return 'male'; return 'neither';
  }
  function setNpcRatio(c, neither, femaleShare) {
    neither = Math.max(0, Math.min(50, Math.round(neither))); femaleShare = Math.max(0, Math.min(100, Math.round(femaleShare)));
    var rest = 100 - neither, f = Math.round(rest * femaleShare / 100);
    c.world.npcGender = { female: f, male: rest - f, neither: neither }; c.npcRatio = c.world.npcGender;
  }
  var GENDER_NOUN = { female: 'young woman', male: 'young man', neither: 'young person' };
  var SIZE_WORD = { small: 'small-framed', average: '', large: 'big-framed' };
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function roster() { return Array.isArray(window.NNPC_ROSTER) ? window.NNPC_ROSTER : []; }
  function G() { return window.G || null; }

  function ensureState(state) {
    state.creation = state.creation || {};
    var c = state.creation;
    if (typeof c.done !== 'boolean') c.done = false;
    var had = c.player || {};
    c.player = Object.assign(clone(DEFAULT_PLAYER), had);
    // old saves: derive gender from appearance, map legacy backgrounds
    if (!had.gender && had.appearance) c.player.gender = had.appearance === 'male' ? 'male' : had.appearance === 'female' ? 'female' : 'neither';
    if (!find2(OPT.gender, c.player.gender)) c.player.gender = 'neither';
    if (!find2(OPT.bodySize, c.player.bodySize)) c.player.bodySize = 'average';
    if (!find2(OPT.background, c.player.background)) { c.player.backgroundLegacy = c.player.background; c.player.background = LEGACY_BG[c.player.background] || 'waif'; }
    c.npcOverrides = c.npcOverrides || {};
    c.world = Object.assign({ startSeason: 'autumn', needsPace: 'normal', startMoney: find(OPT.background, c.player.background)[3] }, c.world || {});
    var ng = c.world.npcGender;
    if (!ng || typeof ng.male !== 'number' || typeof ng.female !== 'number' || typeof ng.neither !== 'number') c.world.npcGender = (c.npcRatio && typeof c.npcRatio.male === 'number') ? c.npcRatio : { male: 45, female: 45, neither: 10 };
    c.npcRatio = c.world.npcGender;   // same object; Roy reads G.state.creation.npcRatio
    return c;
  }

  /* ---------- paperdoll: pixel art (SVG rects, no images needed) ---------- */
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function c(v) { return Math.max(0, Math.min(255, Math.round(v * f))); }
    return '#' + ((1 << 24) + (c(r) << 16) + (c(g) << 8) + c(b)).toString(16).slice(1);
  }

  function paperdollSVG(p, scale, outfit) {
    // new pixel paperdoll (doll.js); old SVG below stays as the fallback
    if (window.G && window.G.doll && window.G.doll.html) { try { var dh = window.G.doll.html(p, { scale: scale ? Math.max(1, Math.round(scale * 0.55)) : 3, outfit: outfit }); if (dh) return dh; } catch (e) {} }
    var W = 26, H = 52, S = scale || 6, grid = {};
    var skin = find(OPT.skin, p.skin)[2], hair = find(OPT.hairColor, p.hairColor)[2], eye = find(OPT.eyeColor, p.eyeColor)[2];
    var shirt = { female: '#8a6fb0', male: '#4f7396', androgynous: '#5f8a76' }[p.appearance] || '#5f8a76';
    var pants = '#3a3f52', shoes = '#2b2320', OUT = '#15121a';
    function px(x, y, col) { if (x >= 0 && x < W && y >= 0 && y < H) grid[x + ',' + y] = col; }
    function span(y, hw, col, shadeRight) {      // symmetric row around the centre line (cols 12|13)
      for (var x = 13 - hw; x <= 12 + hw; x++) px(x, y, (shadeRight && x === 12 + hw) ? shade(col, 0.78) : col);
    }
    function rect(x0, y0, w, h, col) { for (var y = y0; y < y0 + h; y++) for (var x = x0; x < x0 + w; x++) px(x, y, col); }

    var legLen = { short: 11, average: 13, tall: 15 }[p.height] || 13;
    var hy = H - 1 - 2 - legLen - 14 - 2 - 12;          // head top row
    var sh = { slight: 4, slim: 4, average: 5, athletic: 6, curvy: 5, heavyset: 6 }[p.build] || 5;
    if (p.appearance === 'male') sh += 1;
    var hip = { slight: 3, slim: 4, average: 4, athletic: 4, curvy: 6, heavyset: 6 }[p.build] || 4;
    if (p.appearance === 'female' && p.build !== 'curvy') hip += 1;
    var ty = hy + 14, ly = ty + 14, L = 13 - Math.max(sh, hip) - 1, R = 12 + Math.max(sh, hip) + 1;
    var hl = 13 - 5, hr = 12 + 5;                       // head edges

    // back hair
    var backRows = { bob: 10, shoulder: 16, long: 26 }[p.hairStyle];
    if (backRows) for (var y = hy; y < hy + backRows; y++) span(y, 6, shade(hair, 0.85));
    if (p.hairStyle === 'curly') for (var y2 = hy; y2 < hy + 10; y2++) { px(hl - 2, y2, hair); px(hl - 1, y2, hair); px(hr + 1, y2, hair); px(hr + 2, y2, hair); }
    if (p.hairStyle === 'ponytail') { for (var y3 = hy + 2; y3 < hy + 15; y3++) { px(hr + 1, y3, hair); px(hr + 2, y3, shade(hair, 0.85)); } }

    // ----- outfit (from wardrobe.js when present) -----
    var o = outfit || (window.Wardrobe && Wardrobe.spriteOutfit ? Wardrobe.spriteOutfit(p) : null) ||
      { top: { kind: 'tee', color: shirt }, bottom: { kind: 'pants', color: pants }, shoes: { kind: 'sneakers', color: shoes } };
    // no top / no bottom: bare skin, with any under layer showing (wardrobe.js lets you undress)
    var uT = o.under_top, uB = o.under_bottom, deg = o.deg || {};
    var topPiece = o.top || (uT ? { kind: 'tank', color: uT.color } : { kind: 'bare', color: skin });
    var botPiece = o.bottom || { kind: 'bare', color: skin };
    var topC = topPiece.color, botC = botPiece.color, shoeC = (o.shoes || {}).color || shoes;
    if (o.top && (o.wetU || 0) > 40) topC = shade(topC, (o.wetU || 0) >= 90 ? 0.68 : 0.8);
    if (o.bottom && (o.wetL || 0) > 40) botC = shade(botC, (o.wetL || 0) >= 90 ? 0.68 : 0.8);
    var tk = topPiece.kind, bk = botPiece.kind, sk = o.shoes ? o.shoes.kind || 'sneakers' : 'none', ok = o.outer ? o.outer.kind : null;
    var lhw = hip;

    // hood behind the head
    if (tk === 'hoodie' || ok === 'raincoat') { var hc = ok === 'raincoat' ? o.outer.color : topC; for (var hh = hy + 9; hh < hy + 14; hh++) span(hh, 4, shade(hc, 0.8)); }

    // legs
    var skirtRows = bk === 'skirt' ? 6 : (bk === 'longskirt' ? 10 : 0), shortRows = bk === 'shorts' ? 5 : 0;
    for (var y4 = ly; y4 < ly + legLen; y4++) {
      var r = y4 - ly, legCol = (bk === 'shorts' && r >= shortRows) || ((bk === 'skirt' || bk === 'longskirt') && r >= skirtRows) ? skin : botC;
      if (bk === 'sweats' && r === legLen - 1) legCol = shade(botC, 1.15);
      for (var x = 13 - lhw; x <= 11; x++) px(x, y4, legCol);
      for (var x2 = 14; x2 <= 12 + lhw; x2++) px(x2, y4, x2 === 12 + lhw ? shade(legCol, 0.78) : legCol);
    }
    if (skirtRows) for (var sr = 0; sr < skirtRows; sr++) span(ly + sr, Math.min(lhw + 1 + (sr >> 1), lhw + 3), sr === skirtRows - 1 ? shade(botC, 0.85) : botC, true);
    // underwear when there are no bottoms over it
    if (!o.bottom && uB) {
      var bb = uB.kind === 'brief' ? (uB.bulk || 1) : 0, bRows = 3 + (bb >= 2 ? 1 : 0) + (bb >= 4 ? 1 : 0), bW = lhw + (bb >= 1 ? 1 : 0) + (bb >= 3 ? 1 : 0);
      for (var ub = 0; ub < bRows; ub++) span(ly + ub, bW, ub === bRows - 1 ? shade(uB.color, 0.85) : uB.color, true);
      if (uB.wet > 40) { px(12, ly + 1, shade(uB.color, 0.75)); px(13, ly + 1, shade(uB.color, 0.75)); px(12, ly + 2, shade(uB.color, 0.75)); px(13, ly + 2, shade(uB.color, 0.75)); }
    }
    // shoes
    var sL = 13 - lhw - 1, sLw = lhw, sR = 14, sRw = lhw;
    if (sk === 'none') { rect(sL, ly + legLen, sLw, 1, shade(skin, 0.9)); rect(sR, ly + legLen, sRw, 1, shade(skin, 0.9)); }
    else if (sk === 'boots') { rect(sL, ly + legLen - 2, sLw, 4, shoeC); rect(sR, ly + legLen - 2, sRw, 4, shoeC); }
    else if (sk === 'flats') { rect(sL + 1, ly + legLen, sLw - 1, 1, skin); rect(sR, ly + legLen, sRw - 1, 1, skin); rect(sL, ly + legLen + 1, sLw, 1, shoeC); rect(sR, ly + legLen + 1, sRw, 1, shoeC); }
    else { rect(sL, ly + legLen, sLw, 1, shoeC); rect(sR, ly + legLen, sRw, 1, shoeC); rect(sL, ly + legLen + 1, sLw, 1, '#eeeeee'); rect(sR, ly + legLen + 1, sRw, 1, '#e0e0e0'); }

    // torso (tapers shoulder -> waist -> hip)
    var tw = [];
    for (var i = 0; i < 14; i++) {
      var t = i / 13, hw = Math.round(sh + (hip - sh) * t);
      if (i > 4 && i < 10 && p.build !== 'heavyset') hw = Math.min(hw, Math.max(sh, hip) - 1);
      tw[i] = hw;
      span(ty + i, hw, topC, true);
    }
    if (tk === 'tank') for (var tr = 0; tr < 2; tr++) for (var tx = 13 - tw[tr]; tx <= 12 + tw[tr]; tx++) if (tx !== 10 && tx !== 15 && (tr === 0 || tx < 10 || tx > 15)) px(tx, ty + tr, skin);
    if (tk === 'buttonup' || tk === 'blouse') { px(11, ty, shade(topC, 1.2)); px(14, ty, shade(topC, 1.2)); for (var bt = 2; bt < 13; bt += 3) px(12, ty + bt, shade(topC, 0.7)); }
    if (tk === 'sweater') { span(ty, 2, shade(topC, 0.8)); span(ty + 13, tw[13], shade(topC, 0.8)); }
    if (tk === 'hoodie') { for (var pk = 10; pk <= 15; pk++) px(pk, ty + 9, shade(topC, 0.8)); px(11, ty + 1, '#dddddd'); px(14, ty + 1, '#dddddd'); px(11, ty + 2, '#dddddd'); px(14, ty + 2, '#dddddd'); }
    if (bk === 'overalls') { for (var oy = 4; oy < 14; oy++) for (var ox = 10; ox <= 15; ox++) px(ox, ty + oy, botC); for (var st2 = 0; st2 < 4; st2++) { px(10, ty + st2, botC); px(15, ty + st2, botC); } px(10, ty + 4, '#c9b25a'); px(15, ty + 4, '#c9b25a'); }
    // arms / sleeves
    var sleeve = { tank: 0, tee: 4, bare: 0 }[tk]; if (sleeve === undefined) sleeve = 11;
    var outC = o.outer ? o.outer.color : null;
    if (outC) sleeve = 11;
    for (var a = 0; a < 13; a++) {
      var col = a < sleeve ? (outC || topC) : skin;
      px(13 - sh - 2, ty + a, col); px(13 - sh - 1, ty + a, col);
      px(12 + sh + 1, ty + a, col); px(12 + sh + 2, ty + a, shade(col, 0.82));
    }
    // open jacket / coat over the top
    if (outC) {
      for (var oi = 0; oi < 14; oi++) { var w2 = tw[oi]; px(13 - w2, ty + oi, outC); px(14 - w2, ty + oi, outC); px(11 + w2, ty + oi, outC); px(12 + w2, ty + oi, shade(outC, 0.78)); }
      if (ok === 'wool_coat' || ok === 'raincoat') for (var cy = 0; cy < 4; cy++) { px(13 - lhw - 1, ly + cy, outC); px(14 - lhw - 1, ly + cy, outC); px(12 + lhw, ly + cy, outC); px(12 + lhw + 1, ly + cy, shade(outC, 0.78)); }
      px(11, ty, shade(outC, 1.15)); px(14, ty, shade(outC, 1.15));
    }
    // wear and tear
    // wear and tear by how much integrity is left (fraction of the item's maximum): frayed threads, then holes, then rags
    function wearOn(d, spots, base) {
      if (!d || d.f == null) return;
      var f = d.f, n = f < 0.2 ? spots.length : f < 0.4 ? Math.ceil(spots.length * 0.6) : f < 0.7 ? Math.ceil(spots.length * 0.3) : 0;
      for (var q = 0; q < n; q++) px(spots[q][0], spots[q][1], f < 0.4 ? skin : shade(base, 1.25));
    }
    if (o.top) wearOn(deg.top, [[10, ty + 6], [15, ty + 10], [11, ty + 11], [14, ty + 3], [9, ty + 9], [16, ty + 5]], topC);
    if (o.bottom && !skirtRows) wearOn(deg.bottom, [[13 - lhw, ly + 6], [12 + lhw - 1, ly + 9], [11, ly + 3], [14, ly + 11], [13 - lhw + 1, ly + 10]], botC);
    if (o.bottom && skirtRows) wearOn(deg.bottom, [[11, ly + 2], [14, ly + 4], [10, ly + 1]], botC);
    if (outC) wearOn(deg.outer, [[13 - sh - 2, ty + 7], [12 + sh + 1, ty + 4], [13 - sh - 1, ty + 10], [12 + sh + 2, ty + 9]], outC);
    // soaked through: darker drips at the hems
    if (o.top && (o.wetU || 0) >= 90) { px(11, ty + 13, shade(topC, 0.7)); px(14, ty + 13, shade(topC, 0.7)); }
    if (o.bottom && (o.wetL || 0) >= 90 && !skirtRows) { px(13 - lhw + 1, ly + legLen - 2, shade(botC, 0.7)); px(12 + lhw - 1, ly + legLen - 3, shade(botC, 0.7)); }
    // soiled bottoms: a faint stain at the seat
    if (o.bottom && deg.bottom && deg.bottom.soiled) { px(12, ly + 1, shade(botC, 0.72)); px(13, ly + 1, shade(botC, 0.72)); px(12, ly + 2, shade(botC, 0.8)); }
    // grimy clothes worn for days look dull at the edges
    if (o.top && deg.top && deg.top.days >= 2) { px(13 - tw[13], ty + 13, shade(topC, 0.85)); px(12 + tw[13], ty + 13, shade(topC, 0.7)); }

    // neck + head
    span(hy + 12, 2, shade(skin, 0.85)); span(hy + 13, 2, shade(skin, 0.85));
    for (var h = 0; h < 12; h++) span(hy + h, (h === 0 || h === 11) ? 4 : 5, skin);
    // face
    px(10, hy + 6, '#ffffff'); px(11, hy + 6, eye); px(14, hy + 6, eye); px(15, hy + 6, '#ffffff');
    px(9, hy + 5, shade(hair, 0.9)); px(10, hy + 5, shade(hair, 0.9)); px(15, hy + 5, shade(hair, 0.9)); px(16, hy + 5, shade(hair, 0.9));
    px(12, hy + 9, '#9c5a4a'); px(13, hy + 9, '#9c5a4a');
    if (p.freckles) { px(9, hy + 8, shade(skin, 0.72)); px(11, hy + 8, shade(skin, 0.72)); px(14, hy + 8, shade(skin, 0.72)); px(16, hy + 8, shade(skin, 0.72)); }
    px(hl - 1, hy + 6, shade(skin, 0.9)); px(hr + 1, hy + 6, shade(skin, 0.9));   // ears

    // front hair
    var st = p.hairStyle;
    if (st === 'buzzed') { span(hy, 4, shade(hair, 1.15)); span(hy + 1, 5, shade(hair, 1.15)); }
    else {
      span(hy - 1, 4, hair); span(hy, 5, hair); span(hy + 1, 5, hair);
      for (var b = hl; b <= hr; b++) if (b % 3 !== 0) px(b, hy + 2, hair);          // fringe
      if (st !== 'messy' && st !== 'curly') for (var sd = hy + 2; sd < hy + (st === 'short' || st === 'ponytail' || st === 'braid' ? 5 : 8); sd++) { px(hl, sd, hair); px(hr, sd, hair); }
    }
    if (st === 'messy') { [9, 12, 15].forEach(function (x) { px(x, hy - 2, hair); }); [10, 14].forEach(function (x) { px(x, hy - 3, hair); }); px(hl - 1, hy + 1, hair); px(hr + 1, hy + 2, hair); }
    if (st === 'curly') { span(hy - 2, 3, hair); for (var c = hl - 1; c <= hr + 1; c += 2) px(c, hy - 1, hair); }
    if (st === 'braid') for (var br = hy + 6; br < hy + 22; br++) { px(hl - 1, br, br % 2 ? hair : shade(hair, 0.8)); px(hl, br, br % 2 ? shade(hair, 0.8) : hair); }

    // ----- makeup (salon.js) -----
    var mk = window.Salon && Salon.makeupLook ? Salon.makeupLook() : null;
    if (mk) {
      if (mk.lip) { px(12, hy + 9, mk.lip); px(13, hy + 9, mk.lip); }
      if (mk.eye) { px(9, hy + 6, mk.eye); px(16, hy + 6, mk.eye); if (mk.smudged) { px(10, hy + 7, shade(mk.eye, 1.3)); px(15, hy + 7, shade(mk.eye, 1.3)); } }
      if (mk.blush) { px(9, hy + 8, mk.blush); px(16, hy + 8, mk.blush); }
    }
    // ----- accessories (wardrobe.js) -----
    if (o.face) {
      var fc = o.face.color;
      [9, 10, 11, 12, 13, 14, 15, 16].forEach(function (x) { px(x, hy + 5, fc); px(x, hy + 7, fc); });
      [9, 12, 13, 16].forEach(function (x) { px(x, hy + 6, fc); });
      if (o.face.kind === 'sunglasses') { px(10, hy + 6, '#2b2b33'); px(11, hy + 6, '#3a3a44'); px(14, hy + 6, '#2b2b33'); px(15, hy + 6, '#3a3a44'); }
    }
    if (o.ears) { px(hl - 1, hy + 7, o.ears.color); px(hr + 1, hy + 7, o.ears.color); if (o.ears.kind === 'hoops') { px(hl - 2, hy + 8, o.ears.color); px(hl - 1, hy + 9, o.ears.color); px(hr + 2, hy + 8, o.ears.color); px(hr + 1, hy + 9, o.ears.color); } }
    if (o.neck) { var nc = o.neck.color; span(hy + 12, 3, nc); span(hy + 13, 3, shade(nc, 0.85)); for (var sc = 0; sc < 5; sc++) { px(15, ty + sc, sc % 2 ? shade(nc, 0.85) : nc); px(16, ty + sc, nc); } }
    if (o.head) {
      var hc2 = o.head.color, hk = o.head.kind;
      if (hk === 'beanie') { span(hy - 3, 3, hc2); span(hy - 2, 4, hc2); span(hy - 1, 5, hc2); span(hy, 5, hc2); span(hy + 1, 5, shade(hc2, 0.8)); px(12, hy - 4, shade(hc2, 1.2)); px(13, hy - 4, shade(hc2, 1.2)); }
      else if (hk === 'cap') { span(hy - 2, 4, hc2); span(hy - 1, 5, hc2); span(hy, 5, hc2); for (var cb = hr - 1; cb <= hr + 3; cb++) px(cb, hy + 1, shade(hc2, 0.75)); }
      else if (hk === 'sunhat') { span(hy - 3, 3, hc2); span(hy - 2, 4, hc2); span(hy - 1, 4, hc2); span(hy, 8, shade(hc2, 0.85)); span(hy - 1, 2, '#8a5a32'); }
    }

    // 1px dark outline around every filled pixel
    var keys = Object.keys(grid), out = {};
    keys.forEach(function (k) {
      var xy = k.split(','), x = +xy[0], y = +xy[1];
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nk = (x + d[0]) + ',' + (y + d[1]);
        if (!grid[nk] && x + d[0] >= 0 && x + d[0] < W && y + d[1] >= 0 && y + d[1] < H) out[nk] = 1;
      });
    });
    Object.keys(out).forEach(function (k) { grid[k] = OUT; });
    // censor bars: nothing covering your chest or your lower half
    if (o.bareUpper && p.appearance !== 'male') for (var cy1 = ty + 3; cy1 <= ty + 6; cy1++) for (var cx1 = 13 - sh; cx1 <= 12 + sh; cx1++) grid[cx1 + ',' + cy1] = '#000000';
    if (o.bareLower) for (var cy2 = ly - 2; cy2 <= ly + 2; cy2++) for (var cx2 = 13 - lhw; cx2 <= 12 + lhw; cx2++) grid[cx2 + ',' + cy2] = '#000000';

    // merge horizontal runs into rects
    var rects = '';
    for (var yy = 0; yy < H; yy++) {
      var xx = 0;
      while (xx < W) {
        var cl = grid[xx + ',' + yy];
        if (!cl) { xx++; continue; }
        var x0 = xx; while (xx < W && grid[xx + ',' + yy] === cl) xx++;
        rects += '<rect x="' + x0 + '" y="' + yy + '" width="' + (xx - x0) + '" height="1" fill="' + cl + '"/>';
      }
    }
    return '<svg class="paperdoll" viewBox="0 0 ' + W + ' ' + H + '" width="' + (W * S) + '" height="' + (H * S) +
      '" shape-rendering="crispEdges" style="image-rendering:pixelated;flex-shrink:0" role="img" aria-label="' + esc(describe(p)) + '">' + rects + '</svg>';
  }

  function describe(p) {
    var app = { female: 'feminine', male: 'masculine', androgynous: 'androgynous' }[p.appearance];
    return (p.name || 'You') + ': a ' + (SIZE_WORD[p.bodySize] ? SIZE_WORD[p.bodySize] + ' ' : '') + (GENDER_NOUN[p.gender] || 'young person') + ', ' + (p.height === 'average' ? 'average height' : p.height) + ', ' + find(OPT.build, p.build)[1].toLowerCase() + ' and ' + app +
      ', with ' + (p.hairStyle === 'ponytail' || p.hairStyle === 'braid' ? p.hairColor + ' hair in a ' + p.hairStyle : find(OPT.hairStyle, p.hairStyle)[1].toLowerCase() + ' ' + p.hairColor + ' hair') + ', ' + p.eyeColor + ' eyes and ' +
      p.skin + ' skin' + (p.freckles ? ' dusted with freckles' : '') + '.';
  }

  function npcLook(id) {
    var base = null, r = roster();
    for (var i = 0; i < r.length; i++) if (r[i].id === id) base = r[i];
    var st = G() && G().state && G().state.creation ? G().state.creation.npcOverrides[id] : null;
    return Object.assign({ gender: base ? base.gender : 'female', appearance: base ? base.appearance : 'female' }, st || {});
  }

  /* ---------- UI ---------- */
  var CSS = '' +
    '#sol-creation{position:fixed;inset:0;z-index:1000;background:#1b1c22;color:#e8e4da;font:15px/1.5 Georgia,serif;overflow:auto}' +
    '#sol-creation .cr-wrap{max-width:980px;margin:0 auto;padding:28px 20px 60px}' +
    '#sol-creation h1{font-weight:normal;margin:0 0 4px;letter-spacing:.5px}' +
    '#sol-creation .cr-flavor{color:#a9a395;font-style:italic;margin:0 0 18px}' +
    '#sol-creation .cr-tabs{display:flex;gap:6px;border-bottom:1px solid #3a3b44;margin-bottom:18px}' +
    '#sol-creation .cr-tab{background:none;border:1px solid transparent;border-bottom:none;color:#bdb6a6;padding:8px 14px;cursor:pointer;font:inherit;border-radius:6px 6px 0 0}' +
    '#sol-creation .cr-tab.on{background:#26272f;border-color:#3a3b44;color:#fff}' +
    '#sol-creation .cr-grid{display:grid;grid-template-columns:1fr 232px;gap:24px}' +
    '#sol-creation fieldset{border:1px solid #33343d;border-radius:8px;margin:0 0 14px;padding:10px 14px}' +
    '#sol-creation legend{color:#d9c48f;padding:0 6px}' +
    '#sol-creation label{display:inline-flex;align-items:center;gap:6px;margin:3px 12px 3px 0;cursor:pointer}' +
    '#sol-creation .cr-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin:4px 0}' +
    '#sol-creation input[type=text],#sol-creation input[type=number],#sol-creation select{background:#14151a;color:#eee;border:1px solid #444;border-radius:5px;padding:5px 8px;font:inherit}' +
    '#sol-creation .sw{width:16px;height:16px;border-radius:50%;display:inline-block;border:1px solid #0006}' +
    '#sol-creation .cr-side{position:sticky;top:20px;align-self:start;text-align:center;background:#23242b;border-radius:10px;padding:14px}' +
    '#sol-creation .cr-desc{font-size:13px;color:#bdb6a6;margin-top:8px}' +
    '#sol-creation .cr-hint{font-size:13px;color:#8f8a7e}' +
    '#sol-creation .cr-bg{display:block;margin:6px 0;padding:6px 8px;border-radius:6px}' +
    '#sol-creation .cr-bg:hover{background:#26272f}' +
    '#sol-creation .cr-rec{background:#3f6b4a;color:#fff;border-radius:4px;padding:0 6px;font-size:.8em}' +
    '#sol-creation .cr-trade{display:block;font-size:.85em;margin-top:2px}' +
    '#sol-creation .cr-trade span{margin-right:10px}' +
    '#sol-creation input:disabled+*,#sol-creation input:disabled{opacity:.6}' +
    '#sol-creation .cr-npc{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid #2c2d35}' +
    '#sol-creation .cr-npc small{display:block;color:#8f8a7e}' +
    '#sol-creation .cr-cat{color:#d9c48f;margin:14px 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:1px}' +
    '#sol-creation .cr-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:18px}' +
    '#sol-creation .cr-btn{background:#3b4a63;color:#fff;border:none;border-radius:6px;padding:9px 18px;font:inherit;cursor:pointer}' +
    '#sol-creation .cr-btn.alt{background:#34353e}' +
    '#sol-creation .cr-err{color:#e48b7a;margin-right:auto;align-self:center}' +
    '#sol-creation .cr-foot{position:sticky;bottom:0;z-index:5;background:#1b1c22;border-top:1px solid #33343d;padding:10px 0 12px;margin-top:18px;flex-wrap:wrap;box-shadow:0 -6px 12px #0008}' +
    '@media(max-width:720px){#sol-creation .cr-grid{grid-template-columns:1fr}#sol-creation .cr-side{position:static}}';

  var ui = { tab: 'you', root: null, c: null };

  function radios(field, list, val, swatchIdx, locked) {
    return list.map(function (o) {
      var v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o;
      var sw = swatchIdx && o[swatchIdx] ? '<span class="sw" style="background:' + o[swatchIdx] + '"></span>' : '';
      return '<label><input type="radio" name="' + field + '" value="' + esc(v) + '"' + (v === val ? ' checked' : '') + (locked ? ' disabled' : '') + '>' + sw + esc(l) + '</label>';
    }).join('');
  }

  function tabYou(p) {
    return '' +
      '<fieldset><legend>Who you are</legend>' +
        '<div class="cr-row"><label>Name <input type="text" data-f="name" maxlength="24" value="' + esc(p.name) + '" placeholder="Your name"></label>' +
        '<button type="button" class="cr-btn alt" data-act="randname">Random</button>' +
        '<label>Age <input type="number" data-f="age" min="18" max="30" value="' + p.age + '" style="width:64px"></label></div>' +
        '<div class="cr-row">Pronouns: ' + radios('pronouns', OPT.pronouns, p.pronouns) + '</div>' +
        '<p class="cr-hint">Every student at Hollowbrook College is 18 or older.</p>' +
      '</fieldset>' +
      '<fieldset><legend>Gender</legend>' +
        '<div class="cr-row">Gender: ' + radios('gender', OPT.gender, p.gender) + '</div>' +
        '<p class="cr-hint">Sets your default pronouns, how you describe yourself, and the clothes you arrive with.</p>' +
        '<div class="cr-row">Genitals: ' + radios('anatomy', OPT.anatomy, p.anatomy, 0, ui.c && ui.c.done) + '</div>' +
        '<p class="cr-hint">Only used for how clothes fit. It is never shown or described, and it is fixed once you arrive.</p>' +
        '<div class="cr-row">Appearance: ' + radios('appearance', OPT.appearance, p.appearance) + '</div>' +
        '<p class="cr-hint">Appearance is how strangers read you at a glance. It can drift later with clothing and choices.</p>' +
      '</fieldset>' +
      '<fieldset><legend>Body</legend>' +
        '<div class="cr-row">Body size: ' + radios('bodySize', OPT.bodySize, p.bodySize, 0, ui.c && ui.c.done) + '</div>' +
        (function () { var g = G(), ss = g && g.stats && g.stats.SIZE_SUMMARY; return ss && ss[p.bodySize] ? '<p class="cr-hint">' + esc(ss[p.bodySize]) + '</p>' : ''; })() +
        '<p class="cr-hint">Permanent. Works like a difficulty dial for physical checks: small makes squeezing through crowds, holding on to your bag, sports and carrying harder; large makes them easier.</p>' +
        '<div class="cr-row">Height: ' + radios('height', OPT.height, p.height) + '</div>' +
        '<div class="cr-row">Build: ' + radios('build', OPT.build, p.build) + '</div>' +
        '<div class="cr-row">Skin: ' + radios('skin', OPT.skin, p.skin, 2) + '</div>' +
        '<div class="cr-row"><label><input type="checkbox" data-f="freckles"' + (p.freckles ? ' checked' : '') + '> Freckles</label></div>' +
      '</fieldset>' +
      '<fieldset><legend>Hair and eyes</legend>' +
        '<div class="cr-row">Hair colour: ' + radios('hairColor', OPT.hairColor, p.hairColor, 2) + '</div>' +
        '<div class="cr-row">Hair style: ' + radios('hairStyle', OPT.hairStyle, p.hairStyle) + '</div>' +
        '<div class="cr-row">Eyes: ' + radios('eyeColor', OPT.eyeColor, p.eyeColor, 2) + '</div>' +
      '</fieldset>' + dollFields(p);
  }

  // paperdoll look (doll.js): body shape, demeanor, sizes, hair sides and fringe
  function dollFields(p) {
    var GD = window.G && window.G.doll, D = GD && GD.OPTIONS; if (!D) return '';
    GD.ensure(p);
    return '<fieldset><legend>Look</legend>' +
      '<div class="cr-row">Body shape: ' + radios('bodyShape', D.bodyShape, p.bodyShape) + '</div>' +
      '<div class="cr-row">Chest: ' + radios('breastSize', D.breastSize, p.breastSize) + '</div>' +
      '<div class="cr-row">Hips: ' + radios('hipSize', D.hipSize, p.hipSize) + '</div>' +
      '<div class="cr-row">Demeanor: ' + radios('demeanor', D.demeanor, p.demeanor) + '</div>' +
      '<div class="cr-row">Hair sides: ' + radios('hairSides', D.hairSides, p.hairSides) + '</div>' +
      '<div class="cr-row">Fringe: ' + radios('hairFringe', D.hairFringe, p.hairFringe) + '</div>' +
      '<p class="cr-hint">Demeanor sets your eye shape and resting expression. Hair length grows on its own after you arrive.</p>' +
    '</fieldset>';
  }

  function bgNotes(id) {
    var g = G(), out = [];
    try { if (g && g.stats && g.stats.BG_SUMMARY && g.stats.BG_SUMMARY[id]) out.push(g.stats.BG_SUMMARY[id]); } catch (e) {}
    try { if (g && g.school && g.school.backgroundNote) { var n = g.school.backgroundNote(id); if (n) out.push(n); } } catch (e) {}
    return out.length ? '<span class="cr-hint" style="display:block">' + out.map(esc).join(' ') + '</span>' : '';
  }
  function tabStart(c) {
    return '' +
      '<fieldset><legend>Background</legend>' +
        OPT.background.map(function (b) {
          return '<label class="cr-bg"><input type="radio" name="background" value="' + b[0] + '"' + (c.player.background === b[0] ? ' checked' : '') +
            '> <b>' + esc(b[1]) + '</b> ($' + b[3] + ')' + (b[5] ? ' <span class="cr-rec">Recommended for beginners</span>' : '') +
            '<br><span class="cr-hint">' + esc(b[2]) + '</span><span class="cr-trade">' + (b[4] || []).map(function (t) {
              var good = t.charAt(0) === '+';
              return '<span style="color:' + (good ? '#8fc98f' : '#e09a8a') + '">' + (good ? '▲ ' : '▼ ') + esc(t.slice(2)) + '</span>';
            }).join(' ') + '</span>' + bgNotes(b[0]) + '</label>';
        }).join('') +
      '</fieldset>' +
      '<fieldset><legend>World</legend>' +
        '<div class="cr-row">Start in: ' + radios('w:startSeason', OPT.startSeason, c.world.startSeason) + '</div>' +
        '<div class="cr-row">Needs pace: ' + radios('w:needsPace', OPT.needsPace, c.world.needsPace) + '</div>' +
        '<p class="cr-hint">Needs pace scales how fast fatigue, thirst, hunger, bladder and bowels build up.</p>' +
      '</fieldset>';
  }

  function tabNpcs(c) {
    var r = roster();
    if (!r.length) return '<p class="cr-flavor">The townsfolk are still settling in. (No named NPC roster is loaded yet.)</p>';
    var cats = ['Influential', 'Teachers', 'Students', 'Neighbors', 'Outcasts', 'Non-Human'], html = '<p class="cr-hint">Names are fixed. You can change how each person is built and how they present.</p>';
    var ng = c.world.npcGender, rest = ng.male + ng.female, fs = rest ? Math.round(ng.female * 100 / rest) : 50;
    html = '<fieldset><legend>Random townsfolk</legend>' +
      '<div class="cr-row"><label>Men <input type="range" data-f="npcFemale" min="0" max="100" step="5" value="' + fs + '"> Women</label></div>' +
      '<div class="cr-row"><label>Neither: <input type="range" data-f="npcNeither" min="0" max="50" step="5" value="' + ng.neither + '"></label></div>' +
      '<p class="cr-hint cr-npcmix">Unnamed and randomly generated people: ' + ng.female + '% women, ' + ng.male + '% men, ' + ng.neither + '% neither. Everyone is 18 or older.</p>' +
      '</fieldset>' + html;
    var seen = {};
    cats.concat(r.map(function (n) { return n.category; })).forEach(function (cat) {
      if (seen[cat]) return; seen[cat] = 1;
      var group = r.filter(function (n) { return n.category === cat; });
      if (!group.length) return;
      html += '<div class="cr-cat">' + esc(cat) + '</div>';
      group.forEach(function (n) {
        var look = Object.assign({ gender: n.gender, appearance: n.appearance }, c.npcOverrides[n.id] || {});
        var sel = function (k, list) {
          return '<select data-npc="' + esc(n.id) + '" data-k="' + k + '">' + list.map(function (o) {
            return '<option value="' + o[0] + '"' + (o[0] === look[k] ? ' selected' : '') + '>' + o[1] + '</option>';
          }).join('') + '</select>';
        };
        html += '<div class="cr-npc"><div><b>' + esc(n.name) + '</b><small>' + esc(n.blurb || '') + '</small></div>' +
          '<div>Body ' + sel('gender', OPT.anatomy) + '</div><div>Looks ' + sel('appearance', OPT.appearance) + '</div></div>';
      });
    });
    return html + '<div class="cr-actions"><button type="button" class="cr-btn alt" data-act="npcreset">Reset all to defaults</button></div>';
  }

  function render() {
    var c = ui.c, p = c.player, body;
    if (ui.tab === 'you') body = tabYou(p); else if (ui.tab === 'start') body = tabStart(c); else body = tabNpcs(c);
    var tabs = [['you', 'Your character'], ['start', 'Background & world'], ['npcs', 'Townsfolk']].map(function (t) {
      return '<button type="button" class="cr-tab' + (ui.tab === t[0] ? ' on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join('');
    ui.root.innerHTML = '<div class="cr-wrap">' +
      '<h1>Hollowbrook</h1><p class="cr-flavor">The bus wheezes to a stop at the edge of town. The college bell tower peeks over the maples. Before you step off, tell us who you are.</p>' +
      '<div class="cr-tabs">' + tabs + '</div>' +
      '<div class="cr-grid"><div class="cr-main">' + body + '</div>' +
      '<div class="cr-side">' + paperdollSVG(p) + '<div class="cr-desc">' + esc(describe(p)) + '</div></div></div>' +
      '<div class="cr-actions cr-foot"><span class="cr-err"></span>' +
      '<button type="button" class="cr-btn alt" data-act="randomize">Randomize look</button>' +
      '<button type="button" class="cr-btn" data-act="begin">Step off the bus</button></div></div>';
  }

  function refreshSide() {
    var side = $('.cr-side', ui.root);
    if (side) side.innerHTML = paperdollSVG(ui.c.player) + '<div class="cr-desc">' + esc(describe(ui.c.player)) + '</div>';
  }

  function onInput(e) {
    var t = e.target, c = ui.c;
    if (t.dataset.npc) {
      var o = c.npcOverrides[t.dataset.npc] = c.npcOverrides[t.dataset.npc] || {};
      o[t.dataset.k] = t.value; return;
    }
    if (t.type === 'radio') {
      if (t.name.indexOf('w:') === 0) c.world[t.name.slice(2)] = t.value;
      else {
        c.player[t.name] = /^(breastSize|hipSize)$/.test(t.name) ? +t.value : t.value;
        if (c.done && (t.name === 'anatomy' || t.name === 'bodySize')) { render(); return; }   // fixed after arrival
        if (c.player.dollAuto) delete c.player.dollAuto[t.name];
        if (t.name === 'background') c.world.startMoney = find(OPT.background, t.value)[3];
        if (t.name === 'appearance') c.player.appearanceSet = true;
        if (t.name === 'gender' && !c.player.appearanceSet) { c.player.appearance = t.value === 'neither' ? 'androgynous' : t.value; var ap = ui.root.querySelectorAll('input[name=appearance]'); [].forEach.call(ap, function (x) { x.checked = x.value === c.player.appearance; }); }
        if (t.name === 'gender') { c.player.pronouns = pronounsFor(t.value); var pr = ui.root.querySelectorAll('input[name=pronouns]'); [].forEach.call(pr, function (x) { x.checked = x.value === c.player.pronouns; }); }
      }
    } else if (t.dataset.f === 'npcFemale' || t.dataset.f === 'npcNeither') {
      var ng = c.world.npcGender, rest = ng.male + ng.female, fs = rest ? ng.female * 100 / rest : 50;
      if (t.dataset.f === 'npcFemale') setNpcRatio(c, ng.neither, +t.value); else setNpcRatio(c, +t.value, fs);
      var mix = $('.cr-npcmix', ui.root), n2 = c.world.npcGender;
      if (mix) mix.textContent = 'Unnamed and randomly generated people: ' + n2.female + '% women, ' + n2.male + '% men, ' + n2.neither + '% neither. Everyone is 18 or older.';
      return;
    } else if (t.dataset.f === 'name') c.player.name = t.value.replace(/[<>]/g, '');
    else if (t.dataset.f === 'age') c.player.age = Math.max(18, Math.min(30, parseInt(t.value, 10) || 18));
    else if (t.dataset.f === 'freckles') c.player.freckles = t.checked;
    refreshSide();
  }

  function onClick(e) {
    var t = e.target.closest('[data-tab],[data-act]'); if (!t) return;
    var c = ui.c;
    if (t.dataset.tab) { ui.tab = t.dataset.tab; render(); return; }
    switch (t.dataset.act) {
      case 'randname': c.player.name = pick(FIRST_NAMES); render(); break;
      case 'randomize':
        ['height', 'build', 'skin', 'hairColor', 'hairStyle', 'eyeColor', 'appearance'].forEach(function (k) { c.player[k] = pick(OPT[k])[0]; });
        c.player.freckles = Math.random() < 0.3;
        if (window.G && window.G.doll && window.G.doll.randomize) window.G.doll.randomize(c.player);
        render(); break;
      case 'npcreset': c.npcOverrides = {}; render(); break;
      case 'begin': finish(); break;
    }
  }

  function finish() {
    var c = ui.c, err = $('.cr-err', ui.root);
    if (!c.player.name.trim()) {
      ui.tab = 'you'; render();
      var msg = 'You need a name before you step off the bus.';
      [].forEach.call(ui.root.querySelectorAll('.cr-err'), function (e) { e.textContent = msg; });
      var nf = $('[data-f=name]', ui.root);
      if (nf) { nf.style.outline = '2px solid #d9a441'; nf.placeholder = 'Type a name here first'; try { nf.scrollIntoView({ block: 'center' }); nf.focus(); } catch (e) {} }
      return;
    }
    if (c.player.age < 18) c.player.age = 18;
    c.player.name = c.player.name.trim();
    c.done = true;
    close();
    var g = G();
    if (g) {
      if (g.emit) g.emit('creationDone', c);
      try { if (typeof g.start === 'function') g.start(); }
      catch (e) { console.error(e); if (g.story) g.story('<p><b>Something went wrong starting the game:</b> ' + esc(String(e && e.message || e)) + '</p><p>Please tell the developers this message.</p>'); }
    }
  }

  function close() {
    if (ui.root) { ui.root.removeEventListener('input', onInput); ui.root.removeEventListener('change', onInput); ui.root.remove(); ui.root = null; }
  }

  function open() {
    var g = G(), state = g && g.state ? g.state : (window.__solCreationState = window.__solCreationState || {});
    ui.c = ensureState(state);
    ui.tab = 'you';
    if (!document.getElementById('sol-creation-css')) {
      var s = document.createElement('style'); s.id = 'sol-creation-css'; s.textContent = CSS; document.head.appendChild(s);
    }
    close();
    ui.root = document.createElement('div'); ui.root.id = 'sol-creation';
    document.body.appendChild(ui.root);
    ui.root.addEventListener('input', onInput);
    ui.root.addEventListener('change', onInput);
    ui.root.addEventListener('click', onClick);
    render();
  }

  var mod = {
    id: 'creation',
    init: function (state) {
      var c = ensureState(state);
      if (!c.done) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', open); else open();
      }
    },
    onTick: function () {},
    getOptions: function (state) {
      var wd = window.G && G.world, tg = wd && wd.here ? ((wd.here() || {}).tags || []) : [];
      if (tg.indexOf('home') < 0) return { dialogue: [], actions: [], travel: [], other: [] };   // the mirror is in your dorm room
      return { dialogue: [], actions: [], travel: [], other: [{
        label: 'Look in a mirror', time: 1,
        run: function (st) {
          var p = st.creation.player;
          return { text: '<div style="float:right;margin:0 0 8px 12px">' + paperdollSVG(p) + '</div><p>You catch your reflection. ' + esc(describe(p)) + '</p>' + (window.Salon && Salon.hairNote ? '<p>' + esc(Salon.hairNote()) + '</p>' : '') + (function () { try { return G.stats && G.stats.selfDescription ? G.stats.selfDescription() : ''; } catch (e) { return ''; } })(), minutes: 1 };
        }
      }] };
    }
  };

  window.Creation = { open: open, paperdollSVG: paperdollSVG, describe: describe, npcLook: npcLook, OPTIONS: OPT, module: mod,
    bodySizeMod: bodySizeMod, rollNpcGender: rollNpcGender, pronounsFor: pronounsFor,
    gender: function () { var p = curPlayer(); return (p && p.gender) || 'neither'; },
    background: function () { var p = curPlayer(); return (p && p.background) || 'waif'; } };
  (function (gofn, pick) { mod.getOptions = function (state) { var out = gofn.apply(this, arguments); if (out) ['actions', 'other', 'dialogue'].forEach(function (k) { (out[k] || []).forEach(function (o) { if (o && !o.section) o.section = pick(o, state); if (o && !o.icon) o.icon = '🪞'; }); }); return out; }; })(mod.getOptions, function () { return 'self'; });
  if (window.G && typeof window.G.register === 'function') window.G.register(mod);
  if (window.G && typeof window.G.addTab === 'function') window.G.addTab({
    id: 'appearance', label: 'Appearance', order: 5,
    render: function (state) {
      var p = (state.creation || {}).player || DEFAULT_PLAYER;
      var bg = find(OPT.background, p.background);
      return '<div style="display:flex;gap:18px;align-items:flex-start">' + paperdollSVG(p, 5) +
        '<div><p><i>The person looking back at you from shop windows.</i></p><p>' + esc(describe(p)) + '</p>' +
        '<p>Age ' + p.age + ', ' + esc(p.pronouns) + ', ' + esc(find(OPT.gender, p.gender)[1].toLowerCase()) + '. Strangers tend to read you as ' +
        ({ female: 'feminine', male: 'masculine', androgynous: 'androgynous' }[p.appearance]) + '.</p>' +
        (window.Salon && Salon.hairNote ? '<p>' + esc(Salon.hairNote()) + '</p>' : '') +
        '<p><b>Background:</b> ' + esc(bg[1]) + '. ' + esc(bg[2]) + '</p>' +
        '<p class="cr-hint"><b>Fixed at arrival:</b> body size ' + esc(find(OPT.bodySize, p.bodySize)[1].replace(/ \(.*\)/, '').toLowerCase()) + ' (' + (p.bodySize === 'small' ? 'physical checks are harder' : p.bodySize === 'large' ? 'physical checks are easier' : 'no change to physical checks') + '); clothing fit ' + esc(find(OPT.anatomy, p.anatomy)[1].toLowerCase()) + '.</p></div></div>';
    }
  });
})();
