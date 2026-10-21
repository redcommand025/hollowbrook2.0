/* doll.js - pixel-art paperdoll (owner: Lucy's creation/paperdoll area; built for Red)
 * ES5 only. Draws an original chibi doll procedurally on an offscreen canvas (56x112 native),
 * as a 2-frame idle sprite sheet (breathing bob) plus a blink overlay, scaled with image-rendering:pixelated.
 * Layer order: back hair, body (by shape), skin/tan/tan lines, underwear, lower, upper, jacket/outfit,
 * arms + sleeves, accessories, neck/face, eyes, brows, mouth, blush/temp overlays, hair sides, fringe, hat, censor bars.
 * Public: G.doll = { html, render, tan, setTemp, clearTemp, temp, applyContacts, ensure, randomize, resolve, OPTIONS, PALETTE, ... }
 * Guardrails: all characters are adults (18+). Nudity is always covered by a black censor bar; no anatomy is drawn.
 * The `penis` field is a clothing-fit flag only (underwear/bottom cut). Brief fill shows at most as a slight silhouette bulge.
 */
(function () {
  'use strict';

  var DW = 56, DH = 112, CX = 28;
  var CACHE = {}, CACHE_KEYS = [], CACHE_MAX = 90;

  /* ---------------- palettes / options ---------------- */
  var SKIN = [
    ['porcelain', 'Porcelain', '#f6dcc9'], ['fair', 'Fair', '#eec4a4'], ['light', 'Light', '#e7b893'], ['olive', 'Olive', '#d1a07a'],
    ['tan', 'Tan', '#b9825a'], ['golden', 'Golden brown', '#a26a43'], ['brown', 'Brown', '#8d5a3b'], ['deep', 'Deep', '#5c3826'], ['ebony', 'Ebony', '#432a1e']
  ];
  var EYES = [
    ['brown', 'Brown', '#5b3a1e'], ['dark', 'Dark brown', '#3a2416'], ['hazel', 'Hazel', '#8e7340'], ['amber', 'Amber', '#c08a2b'], ['honey', 'Honey', '#c9962e'],
    ['green', 'Green', '#3f7a4a'], ['emerald', 'Emerald', '#1f8a4c'], ['teal', 'Teal', '#2f8f8a'], ['blue', 'Blue', '#3f6fae'], ['sky', 'Sky blue', '#6fa8dc'],
    ['grey', 'Grey', '#7d8790'], ['steel', 'Steel blue', '#56708a'], ['violet', 'Violet', '#7b5ea7']
  ];
  var CONTACT_EXTRA = [['ice', 'Ice blue', '#a9d8ee'], ['rose', 'Rose', '#c46a86'], ['gold', 'Gold', '#d8b04a']];
  var HAIR = [['black', '#1c1a1a'], ['brown', '#5a3a22'], ['chestnut', '#7b3f1d'], ['blonde', '#d8b45c'], ['ginger', '#b5521f'], ['auburn', '#8a2f1f'],
    ['platinum', '#e8e2cf'], ['grey', '#9a9a9a'], ['dyed blue', '#3b5fbf'], ['dyed pink', '#d9709f'], ['dyed purple', '#7a4fa8'], ['dyed green', '#3f8f5a'], ['dyed red', '#b0242f'], ['dyed silver', '#c4c8d0']];
  var OPTIONS = {
    bodyShape: [['classic', 'Classic'], ['slender', 'Slender'], ['curvy', 'Curvy'], ['soft', 'Soft']],
    demeanor: [['gentle', 'Gentle'], ['sweet', 'Sweet'], ['catty', 'Catty'], ['aloof', 'Aloof'], ['foxy', 'Foxy']],
    breastSize: [[0, 'Flat'], [1, 'Small'], [2, 'Medium'], [3, 'Full'], [4, 'Large']],
    hipSize: [[0, 'Narrow'], [1, 'Slim'], [2, 'Average'], [3, 'Wide'], [4, 'Very wide']],
    hairSides: [['straight', 'Straight'], ['wavy', 'Wavy'], ['curly', 'Curly'], ['tucked', 'Tucked behind ears'], ['pigtails', 'Pigtails'], ['ponytail', 'Ponytail'], ['braids', 'Twin braids'], ['bun', 'Bun']],
    hairFringe: [['blunt', 'Blunt'], ['swept', 'Side-swept'], ['parted', 'Middle part'], ['curtain', 'Curtain'], ['spiky', 'Spiky'], ['wispy', 'Wispy'], ['choppy', 'Choppy'], ['none', 'Swept back']],
    skin: SKIN, eyeColor: EYES, contacts: EYES.concat(CONTACT_EXTRA)
  };
  var TEMP_NAMES = ['blush', 'tired', 'stressed', 'upset', 'cold', 'wetHair', 'sunburn', 'happy'];
  var REGIONS = ['face', 'neck', 'shoulders', 'chest', 'belly', 'hips', 'thigh', 'shin', 'foot', 'upperArm', 'forearm'];

  function find(list, v) { for (var i = 0; i < list.length; i++) if (list[i][0] === v) return list[i]; return null; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function num(v, d) { v = +v; return isFinite(v) ? v : d; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function G_() { return window.G || null; }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; } return h; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  if (!Math.imul) Math.imul = function (a, b) { var ah = (a >>> 16) & 0xffff, al = a & 0xffff, bh = (b >>> 16) & 0xffff, bl = b & 0xffff; return ((al * bl) + (((ah * bl + al * bh) << 16) >>> 0) | 0); };

  /* ---------------- colour ---------------- */
  function hex2i(h) { h = String(h || '#888888').replace('#', ''); if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2); var n = parseInt(h, 16); return isFinite(n) ? n : 0x888888; }
  function c255(v) { return v < 0 ? 0 : v > 255 ? 255 : Math.round(v); }
  function irgb(i) { return [(i >> 16) & 255, (i >> 8) & 255, i & 255]; }
  function rgbi(r, g, b) { return (c255(r) << 16) | (c255(g) << 8) | c255(b); }
  function mixi(a, b, t) { var A = irgb(a), B = irgb(b); return rgbi(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
  function toHsl(i) {
    var c = irgb(i), r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn;
    if (d > 0) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    return [h, s, l];
  }
  function fromHsl(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360; s = clamp(s, 0, 1); l = clamp(l, 0, 1);
    if (s === 0) return rgbi(l * 255, l * 255, l * 255);
    function f(p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return rgbi(f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255);
  }
  function toward(h, target, deg) { var d = ((target - h + 540) % 360) - 180; return h + clamp(d, -deg, deg); }
  /* 6-step ramp: [highlight, light, base, shadow, deep shadow, outline]; shadows hue-shift cool (or warm-red for skin) */
  function ramp(hex, o) {
    o = o || {};
    var base = typeof hex === 'number' ? hex : hex2i(hex), hsl = toHsl(base), h = hsl[0], s = hsl[1], l = hsl[2];
    var sT = o.skin ? 350 : 255, hT = o.skin ? 40 : 50, k = o.soft ? 0.7 : 1;
    var lo = Math.min(l * 0.42, 0.34);
    return [
      fromHsl(toward(h, hT, 10), s * 0.95, Math.min(0.97, l + 0.14 * k + (l < 0.2 ? 0.06 : 0))),
      fromHsl(toward(h, hT, 5), s, Math.min(0.95, l + 0.065 * k)),
      base,
      fromHsl(toward(h, sT, 8), Math.min(1, s + 0.05), Math.max(0.03, l - 0.10 * k)),
      fromHsl(toward(h, sT, 14), Math.min(1, s + 0.08), Math.max(0.02, l - 0.19 * k)),
      fromHsl(toward(h, sT, 20), Math.min(1, s + 0.1), Math.max(0.02, lo))
    ];
  }
  function skinRamp(base) {
    var c = typeof base === 'number' ? base : hex2i(base), l = toHsl(c)[2];
    return [mixi(c, 0xfff6ec, 0.38), mixi(c, 0xfff1e2, 0.16), c, mixi(mixi(c, 0xb0584a, 0.2), 0x000000, 0.06), mixi(mixi(c, 0x8a3a38, 0.3), 0x000000, 0.16),
      mixi(c, l < 0.3 ? 0x140806 : 0x3a1a12, l < 0.3 ? 0.55 : 0.64)];
  }
  function rampMul(R, f) { var out = []; for (var i = 0; i < R.length; i++) { var c = irgb(R[i]); out.push(rgbi(c[0] * f, c[1] * f, c[2] * f)); } return out; }
  function rampMix(R, col, t) { var out = []; for (var i = 0; i < R.length; i++) out.push(mixi(R[i], col, t)); return out; }
  function wetRamp(R, wet) { if (!(wet > 40)) return R; var f = wet >= 90 ? 0.74 : 0.86; var o = rampMul(R, f); return rampMix(o, 0x1e2a44, wet >= 90 ? 0.08 : 0.04); }

  /* ---------------- masks ---------------- */
  function M() { return new Uint8Array(DW * DH); }
  function inb(x, y) { return x >= 0 && y >= 0 && x < DW && y < DH; }
  function ms(m, x, y) { x = Math.round(x); y = Math.round(y); if (inb(x, y)) m[y * DW + x] = 1; }
  function mg(m, x, y) { return inb(x, y) ? m[y * DW + x] : 0; }
  function mc(m, x, y) { if (inb(x, y)) m[y * DW + x] = 0; }
  function span(m, y, l, r) { y = Math.round(y); l = Math.round(l); r = Math.round(r); for (var x = l; x <= r; x++) ms(m, x, y); }
  function sym(m, y, hw) { hw = Math.round(hw); span(m, y, CX - hw, CX - 1 + hw); }
  function rect(m, x0, y0, x1, y1) { for (var y = y0; y <= y1; y++) span(m, y, x0, x1); }
  function ell(m, cx, cy, rx, ry) {
    for (var y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (var x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) ms(m, x, y);
    }
  }
  function disc(m, cx, cy, r) { ell(m, cx, cy, r, r); }
  function line(m, x0, y0, x1, y1, r0, r1) {
    var d = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0)), n = Math.max(1, Math.ceil(d * 3));
    for (var i = 0; i <= n; i++) { var t = i / n; disc(m, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + ((r1 == null ? r0 : r1) - r0) * t); }
  }
  function mirror(m) { for (var y = 0; y < DH; y++) for (var x = 0; x < CX; x++) { var a = y * DW + x, b = y * DW + (DW - 1 - x); if (m[a] || m[b]) { m[a] = 1; m[b] = 1; } } return m; }
  function flipped(m) { var o = M(); for (var y = 0; y < DH; y++) for (var x = 0; x < DW; x++) if (m[y * DW + x]) o[y * DW + (DW - 1 - x)] = 1; return o; }
  function mor(a, b) { for (var i = 0; i < a.length; i++) if (b[i]) a[i] = 1; return a; }
  function msub(a, b) { for (var i = 0; i < a.length; i++) if (b[i]) a[i] = 0; return a; }
  function mand(a, b) { for (var i = 0; i < a.length; i++) if (!b[i]) a[i] = 0; return a; }
  function mcopy(a) { return new Uint8Array(a); }
  function dilate(a, n) { var o = mcopy(a); for (var k = 0; k < (n || 1); k++) { var src = mcopy(o); for (var y = 0; y < DH; y++) for (var x = 0; x < DW; x++) if (src[y * DW + x]) { ms(o, x + 1, y); ms(o, x - 1, y); ms(o, x, y + 1); ms(o, x, y - 1); } } return o; }
  function rowsOnly(a, y0, y1) { for (var y = 0; y < DH; y++) if (y < y0 || y > y1) for (var x = 0; x < DW; x++) a[y * DW + x] = 0; return a; }
  function colsOnly(a, x0, x1) { for (var y = 0; y < DH; y++) for (var x = 0; x < DW; x++) if (x < x0 || x > x1) a[y * DW + x] = 0; return a; }
  function count(a) { var n = 0; for (var i = 0; i < a.length; i++) if (a[i]) n++; return n; }

  /* ---------------- painter ---------------- */
  function Buf() { var b = new Int32Array(DW * DH); for (var i = 0; i < b.length; i++) b[i] = -1; return b; }
  function px(buf, x, y, c) { x = Math.round(x); y = Math.round(y); if (inb(x, y) && c != null && c >= 0) buf[y * DW + x] = c; }
  /* paint a mask with a ramp (or function(x,y)->ramp). o.open: sides without outline ('t','b','l','r'); o.flat; o.hl:false; o.olc */
  function paint(buf, m, rp, o) {
    o = o || {};
    var op = o.open || '', ol = o.ol !== false, fn = typeof rp === 'function';
    var oT = op.indexOf('t') < 0, oB = op.indexOf('b') < 0, oL = op.indexOf('l') < 0, oR = op.indexOf('r') < 0, hl = o.hl !== false;
    for (var y = 0; y < DH; y++) {
      var x = 0;
      while (x < DW) {
        if (!m[y * DW + x]) { x++; continue; }
        var l = x; while (x < DW && m[y * DW + x]) x++; var r = x - 1, w = r - l + 1;
        for (var xx = l; xx <= r; xx++) {
          var i = y * DW + xx, R = fn ? rp(xx, y) : rp; if (!R) continue;
          var up = y > 0 && m[i - DW], dn = y < DH - 1 && m[i + DW];
          var edge = (!up && oT) || (!dn && oB) || (xx === l && oL && (xx === 0 || !m[i - 1])) || (xx === r && oR && (xx === DW - 1 || !m[i + 1]));
          var c;
          if (ol && edge) c = o.olc != null ? o.olc : R[5];
          else if (o.flat) c = R[o.tone == null ? 2 : o.tone];
          else {
            var tone = 2, pos = xx - l, fromR = r - xx, sw = w >= 11 ? 3 : w >= 6 ? 2 : 1;
            if (w >= 4 && fromR <= sw) tone = 3;
            if (w >= 9 && fromR <= 1) tone = 4;
            if (hl && w >= 5 && pos >= 1 && pos <= (w >= 9 ? 2 : 1)) tone = 1;
            var dn2 = y < DH - 2 && m[i + 2 * DW];
            if (oB && (!dn2) && tone >= 1) tone = Math.max(tone, 3);
            if (hl && oT && tone === 2 && !(y > 1 && m[i - 2 * DW])) tone = 1;
            if (o.dark) tone = Math.min(4, tone + 1);
            c = R[tone];
          }
          buf[i] = c;
        }
      }
    }
  }
  function overlay(buf, m, c) { for (var i = 0; i < m.length; i++) if (m[i]) buf[i] = c; }
  function stamp(buf, list, c) { for (var i = 0; i < list.length; i++) px(buf, list[i][0], list[i][1], c); }

  /* ---------------- item classification ---------------- */
  var LONG_COATS = { coat: 1, trench: 1, raincoat: 1 };
  function categorize(slot, kind, name, def) {
    name = String(name || '').toLowerCase(); kind = kind || '';
    if (slot === 'top') {
      if (kind === 'dress' || /dress/.test(name)) return 'dress';
      if (kind === 'tee') return 'tee'; if (kind === 'tank') return 'tank'; if (kind === 'blouse') return 'blouse';
      if (kind === 'buttonup') return 'shirt'; if (kind === 'hoodie') return 'hoodie';
      if (kind === 'sweater') return /turtle/.test(name) ? 'turtle' : /henley|thermal/.test(name) ? 'henley' : 'sweater';
      return kind === 'tank' ? 'tank' : 'tee';
    }
    if (slot === 'outfit') return 'dress';
    if (slot === 'bottom') {
      if (kind === 'pants') return /jean/.test(name) ? 'jeans' : /chino|khaki/.test(name) ? 'chinos' : /cord/.test(name) ? 'cords' : 'trousers';
      if (kind === 'sweats' || kind === 'shorts' || kind === 'skirt' || kind === 'longskirt' || kind === 'overalls') return kind;
      return 'trousers';
    }
    if (slot === 'shoes') { if (kind === 'boots') return 'boots'; if (kind === 'flats') return /sandal/.test(name) ? 'sandals' : /loafer/.test(name) ? 'loafers' : 'flats'; if (kind === 'socks') return 'socks'; return 'sneakers'; }
    if (slot === 'outer') {
      if (kind === 'raincoat') return 'raincoat';
      if (kind === 'wool_coat') return /puffer/.test(name) ? 'puffer' : /trench/.test(name) ? 'trench' : 'coat';
      return /denim/.test(name) ? 'denim' : /cardigan/.test(name) ? 'cardigan' : 'jacket';
    }
    if (slot === 'under_top') return /cami/.test(name) ? 'cami' : /bra\b|bralette/.test(name) ? 'bra' : /thermal/.test(name) ? 'thermal' : kind === 'bra' ? 'bra' : 'undershirt';
    if (slot === 'under_bottom') {
      if (kind === 'brief' || (def && def.absorb && def.cat !== 'cloth')) return /pull/.test(name) || (def && def.cat === 'pullup') ? 'pullup' : 'diaper';
      return /boxer/.test(name) ? 'boxers' : /lace|seamless|pant/.test(name) ? 'panties' : 'briefs';
    }
    return kind || slot;
  }
  function patternOf(name) {
    name = String(name || '').toLowerCase();
    if (/flannel|plaid|tartan|check/.test(name)) return 'plaid';
    if (/band/.test(name)) return 'print'; if (/cat-print|cat print/.test(name)) return 'cats'; if (/floral|flower/.test(name)) return 'floral';
    if (/hollowbrook|crest/.test(name)) return 'crest'; if (/cable/.test(name)) return 'cable'; if (/stripe/.test(name)) return 'stripe';
    return '';
  }
  /* tan-line regions each category covers */
  var COVER = {
    tee: ['shoulders', 'chest', 'belly', 'upperArm'], tank: ['chest', 'belly'], cami: ['chest', 'belly'], undershirt: ['chest', 'belly'], bra: ['chest'],
    blouse: ['shoulders', 'chest', 'belly', 'upperArm', 'forearm'], shirt: ['shoulders', 'chest', 'belly', 'upperArm', 'forearm'], hoodie: ['neck', 'shoulders', 'chest', 'belly', 'upperArm', 'forearm'],
    sweater: ['shoulders', 'chest', 'belly', 'upperArm', 'forearm'], turtle: ['neck', 'shoulders', 'chest', 'belly', 'upperArm', 'forearm'], henley: ['shoulders', 'chest', 'belly', 'upperArm', 'forearm'], thermal: ['shoulders', 'chest', 'belly', 'upperArm', 'forearm'],
    dress: ['chest', 'belly', 'hips', 'thigh'],
    briefs: ['hips'], panties: ['hips'], boxers: ['hips', 'thigh'], diaper: ['hips'], pullup: ['hips'],
    jeans: ['hips', 'thigh', 'shin'], chinos: ['hips', 'thigh', 'shin'], cords: ['hips', 'thigh', 'shin'], trousers: ['hips', 'thigh', 'shin'], sweats: ['hips', 'thigh', 'shin'],
    shorts: ['hips', 'thigh'], skirt: ['hips', 'thigh'], longskirt: ['hips', 'thigh', 'shin'], overalls: ['chest', 'belly', 'hips', 'thigh', 'shin'],
    sneakers: ['foot'], boots: ['foot', 'shin'], flats: ['foot'], loafers: ['foot'], sandals: [], socks: ['foot'],
    jacket: ['shoulders', 'upperArm', 'forearm'], denim: ['shoulders', 'upperArm', 'forearm'], cardigan: ['shoulders', 'upperArm', 'forearm'],
    coat: ['shoulders', 'chest', 'belly', 'upperArm', 'forearm', 'thigh'], trench: ['shoulders', 'chest', 'belly', 'upperArm', 'forearm', 'thigh'], puffer: ['shoulders', 'chest', 'belly', 'upperArm', 'forearm'], raincoat: ['neck', 'shoulders', 'chest', 'belly', 'upperArm', 'forearm', 'thigh'],
    scarf: ['neck']
  };

  function catalog() { return (window.Wardrobe && window.Wardrobe.CATALOG) || {}; }
  function itemFromDef(slot, id, d, extra) {
    d = d || {}; extra = extra || {};
    var name = d.name || id || '', kind = extra.kind || d.kind;
    var it = { slot: slot, id: id || null, cat: categorize(slot, kind, name, d), col: extra.color || d.color || '#8a8a96', bag: num(d.bag, 1),
      wet: Math.round(num(extra.wet, 0)), f: Math.round(clamp(num(extra.f, 1), 0, 1) * 20) / 20, soiled: !!extra.soiled, pat: patternOf(name), bulk: num(extra.bulk, d.bulk || 0), kind: kind || '' };
    return it;
  }
  /* outfit: array of item ids, a Wardrobe.spriteOutfit()-style object, or null for the live wardrobe */
  function normalizeOutfit(o, p, live) {
    var C = catalog(), out = {}, SL = ['under_top', 'under_bottom', 'top', 'bottom', 'shoes', 'outer', 'head', 'face', 'ears', 'neck', 'outfit'];
    if (Object.prototype.toString.call(o) === '[object Array]') {
      o.forEach(function (x) {
        var id = typeof x === 'string' ? x : x && x.id, d = typeof x === 'string' ? C[x] : (C[id] || x);
        if (!d || !d.slot) return;
        out[d.slot] = itemFromDef(d.slot, id, d, typeof x === 'object' ? x : null);
      });
      var ex1 = exposureOf(out); out._bareUpper = ex1.u; out._bareLower = ex1.l;
      return out;
    }
    if (!o) return null;
    SL.forEach(function (s) {
      var v = o[s]; if (!v) return;
      var id = live && window.Wardrobe && Wardrobe.worn ? (s === 'outfit' ? null : Wardrobe.worn(s)) : (v.id || null), d = (id && C[id]) || v;
      var dg = (o.deg || {})[s] || {};
      var wet = s === 'top' ? (o.wetU != null ? o.wetU : dg.wet) : s === 'bottom' ? (o.wetL != null ? o.wetL : dg.wet) : (dg.wet != null ? dg.wet : v.wet);
      var extra = { kind: v.kind, color: v.color, wet: wet || 0, f: dg.f != null ? dg.f : 1, soiled: dg.soiled, bulk: v.bulk };
      if (s === 'under_bottom' && v.kind === 'brief') extra.kind = 'brief';
      out[s] = itemFromDef(s, id, d, extra);
    });
    if (o.bareUpper != null || o.bareLower != null) { out._bareUpper = !!o.bareUpper; out._bareLower = !!o.bareLower; }
    else { var ex = exposureOf(out); out._bareUpper = ex.u; out._bareLower = ex.l; }
    return out;
  }
  function exposureOf(o) {
    var u = !(o.top || o.outer || o.under_top || o.outfit);
    var l = !(o.bottom || o.under_bottom || o.outfit || (o.outer && LONG_COATS[o.outer.cat]) || (o.top && o.top.cat === 'dress'));
    return { u: u, l: l };
  }
  function defaultOutfit(p) {
    var app = (p && p.appearance) || 'androgynous';
    return normalizeOutfit([app === 'male' ? 'flannel' : 'tee_white', app === 'female' ? 'skirt' : 'jeans', 'sneakers'].map(function (id) {
      return catalog()[id] ? id : null;
    }).filter(Boolean).concat(catalog().tee_white ? [] : [{ slot: 'top', kind: 'tee', color: '#e6e2d6', name: 'tee' }, { slot: 'bottom', kind: 'pants', color: '#3d5a80', name: 'jeans' }, { slot: 'shoes', kind: 'sneakers', color: '#b33a3a', name: 'sneakers' }]), p, false);
  }

  /* ---------------- player fields ---------------- */
  var HAIRSTYLE_MAP = {
    buzzed: ['tucked', 'none'], short: ['straight', 'swept'], messy: ['wavy', 'spiky'], bob: ['straight', 'blunt'], shoulder: ['straight', 'parted'],
    long: ['straight', 'curtain'], ponytail: ['ponytail', 'swept'], braid: ['braids', 'parted'], curly: ['curly', 'wispy']
  };
  function derived(p, field) {
    var app = p.appearance || 'androgynous', build = p.build || 'average';
    if (field === 'bodyShape') return { slight: 'slender', slim: 'slender', average: 'classic', athletic: 'classic', curvy: 'curvy', heavyset: 'soft' }[build] || 'classic';
    if (field === 'breastSize') return clamp((app === 'female' ? 2 : app === 'male' ? 0 : 1) + (build === 'curvy' || build === 'heavyset' ? 1 : 0) - (app !== 'male' && (build === 'slight') ? 1 : 0), 0, 4);
    if (field === 'hipSize') return clamp((app === 'female' ? 2 : 1) + (build === 'curvy' ? 1 : 0) + (build === 'heavyset' ? 1 : 0) - (build === 'slight' ? 1 : 0), 0, 4);
    if (field === 'hairSides') return (HAIRSTYLE_MAP[p.hairStyle] || HAIRSTYLE_MAP.shoulder)[0];
    if (field === 'hairFringe') return (HAIRSTYLE_MAP[p.hairStyle] || HAIRSTYLE_MAP.shoulder)[1];
    if (field === 'demeanor') return 'gentle';
    return null;
  }
  var AUTO_FIELDS = ['bodyShape', 'breastSize', 'hipSize', 'hairSides', 'hairFringe'];
  /* fill missing doll fields in place (migration for old saves; also used by the creator). Fields flagged in p.dollAuto follow build/appearance/hairStyle. */
  function ensure(p) {
    if (!p || typeof p !== 'object') return p;
    if (!p.dollAuto || typeof p.dollAuto !== 'object') {
      p.dollAuto = {};
      AUTO_FIELDS.forEach(function (f) { if (p[f] == null) p.dollAuto[f] = true; });
    }
    AUTO_FIELDS.forEach(function (f) { if (p.dollAuto[f] || p[f] == null) p[f] = derived(p, f); });
    if (!find(OPTIONS.demeanor, p.demeanor)) p.demeanor = 'gentle';
    if (!find(OPTIONS.bodyShape, p.bodyShape)) p.bodyShape = 'classic';
    if (!find(OPTIONS.hairSides, p.hairSides)) p.hairSides = derived(p, 'hairSides');
    if (!find(OPTIONS.hairFringe, p.hairFringe)) p.hairFringe = derived(p, 'hairFringe');
    p.breastSize = clamp(Math.round(num(p.breastSize, 1)), 0, 4); p.hipSize = clamp(Math.round(num(p.hipSize, 2)), 0, 4);
    if (typeof p.tan !== 'number') p.tan = 0;
    if (!p.tanLines || typeof p.tanLines !== 'object') p.tanLines = {};
    if (p.contacts && (typeof p.contacts !== 'object' || !p.contacts.color)) p.contacts = null;
    if (p.contacts === undefined) p.contacts = null;
    return p;
  }
  function randomize(p, rnd) {
    rnd = rnd || Math.random;
    function pk(l) { return l[Math.floor(rnd() * l.length)][0]; }
    p.dollAuto = {};
    p.bodyShape = pk(OPTIONS.bodyShape); p.demeanor = pk(OPTIONS.demeanor); p.hairSides = pk(OPTIONS.hairSides); p.hairFringe = pk(OPTIONS.hairFringe);
    p.breastSize = p.appearance === 'male' ? (rnd() < 0.8 ? 0 : 1) : pk(OPTIONS.breastSize); p.hipSize = pk(OPTIONS.hipSize);
    return p;
  }
  function penisOf(p) { if (p && typeof p.penis === 'boolean') return p.penis; return !!(p && (p.anatomy === 'penis' || p.anatomy === 'both')); }

  /* ---------------- time + temp states ---------------- */
  function nowMin() {
    var g = G_(), s = g && g.state;
    if (s && s.world && typeof s.world.minutes === 'number') return s.world.minutes;
    var t = (g && g.time) || {}; return (num(t.day, 1)) * 1440 + num(t.hour, 8) * 60 + num(t.minute, 0);
  }
  function dstate() { var g = G_(); if (!g || !g.state) return null; var s = g.state; if (!s.doll || typeof s.doll !== 'object') s.doll = { temps: {} }; if (!s.doll.temps) s.doll.temps = {}; return s.doll; }
  function tempOn(name) { var d = dstate(); return !!(d && d.temps[name] != null && d.temps[name] > nowMin()); }
  function setTemp(name, minutes) {
    var d = dstate(); if (!d || !name) return false;
    if (minutes === 0 || minutes === false) { delete d.temps[name]; return true; }
    var until = nowMin() + Math.max(1, num(minutes, 60));
    d.temps[name] = Math.max(d.temps[name] || 0, until); return true;
  }
  function applyContacts(color, hours) {
    var g = G_(), p = g && g.state && g.state.creation && g.state.creation.player; if (!p) return false;
    if (!color) { p.contacts = null; return true; }
    if (!find(OPTIONS.contacts, color) && !/^#[0-9a-f]{6}$/i.test(color)) return false;
    p.contacts = { color: color, until: nowMin() + Math.round(num(hours, 16) * 60) }; return true;
  }
  function coveredRegions() {
    var o = null, out = {};
    try { o = window.Wardrobe && Wardrobe.spriteOutfit ? normalizeOutfit(Wardrobe.spriteOutfit(curPlayer()), curPlayer(), true) : null; } catch (e) { o = null; }
    if (!o) return out;
    Object.keys(o).forEach(function (s) { var it = o[s]; if (!it || s.charAt(0) === '_') return; (COVER[it.cat] || []).forEach(function (r) { out[r] = true; }); });
    if (o.head && (o.head.cat === 'sunhat' || o.head.cat === 'cap')) out.face = true;
    return out;
  }
  /* sunbathing / time outdoors in sun: amount 0-100 of tan gained. Regions covered by the clothes worn right now stay paler. */
  function tan(amount) {
    var p = curPlayer(); if (!p) return 0; ensure(p);
    amount = num(amount, 5); var cov = coveredRegions(), was = p.tan;
    p.tan = clamp(p.tan + amount, 0, 100);
    var gained = p.tan - was;
    REGIONS.forEach(function (r) {
      var cur = num(p.tanLines[r], 0);
      if (gained > 0 && cov[r] && r !== 'face') cur += gained;
      if (gained < 0) cur = Math.max(0, cur + gained);
      cur = clamp(cur, 0, p.tan); if (cur) p.tanLines[r] = Math.round(cur * 10) / 10; else delete p.tanLines[r];
    });
    return p.tan;
  }
  function curPlayer() { var g = G_(); return g && g.state && g.state.creation ? g.state.creation.player : null; }

  /* ---------------- resolve: player + game state -> drawing config (also the cache key) ---------------- */
  function skinHex(id) { var s = find(SKIN, id) || find(((window.Creation && Creation.OPTIONS && Creation.OPTIONS.skin) || []), id); return s ? s[2] : '#eec4a4'; }
  function hairHex(id) {
    var l = (window.Creation && Creation.OPTIONS && Creation.OPTIONS.hairColor) || [], h = find(l, id); if (h) return h[2];
    for (var i = 0; i < HAIR.length; i++) if (HAIR[i][0] === id) return HAIR[i][1];
    return /^#[0-9a-f]{6}$/i.test(String(id)) ? id : '#5a3a22';
  }
  function eyeHex(id) { var e = find(OPTIONS.contacts, id); return e ? e[2] : (/^#[0-9a-f]{6}$/i.test(String(id)) ? id : '#8e7340'); }
  function safe(fn, d) { try { var v = fn(); return v === undefined ? d : v; } catch (e) { return d; } }
  function hairLenCm(p, live) {
    var g = G_(), S = (g && g.salon && g.salon.STYLES) || (window.Salon && Salon.STYLES) || null;
    if (live && g && g.state && g.state.hair && g.state.creation && g.state.creation.done && g.salon && g.salon.length) { var L = safe(function () { return g.salon.length(); }, null); if (L != null) return L; }
    if (p.hairLength != null) return num(p.hairLength, 25);
    var st = S && S[p.hairStyle];
    return st ? st.ideal : ({ buzzed: 1, short: 5, messy: 9, bob: 16, shoulder: 25, long: 40, ponytail: 28, braid: 35, curly: 15 }[p.hairStyle] || 25);
  }

  function resolve(p, opts) {
    opts = opts || {};
    var g = G_(), st = g && g.state, mann = !!opts.mannequin || !p;
    var live = !mann && !!(st && st.creation && p === st.creation.player);
    var cfg = { v: 3, mann: mann };
    if (mann) {
      var pres = opts.presentation || 'fem', pl = curPlayer();
      cfg.masc = pres === 'masc'; cfg.height = 'average'; cfg.shape = cfg.masc ? 'classic' : 'classic';
      cfg.bust = cfg.masc ? 0 : clamp(Math.round(num(opts.breastSize != null ? opts.breastSize : (pl && pl.breastSize != null ? pl.breastSize : 2), 2)), 0, 4);
      cfg.hip = cfg.masc ? 1 : clamp(Math.round(num(opts.hipSize != null ? opts.hipSize : 2, 2)), 0, 4);
      cfg.penis = cfg.masc; cfg.skin = '#c3c7cf';
      cfg.outfit = normalizeOutfit(opts.outfit || [], null, false) || {};
      cfg.outfit._bareUpper = false; cfg.outfit._bareLower = false;
      cfg.pose = 'down'; cfg.t = {};
      return cfg;
    }
    var q = {}; for (var k in p) if (Object.prototype.hasOwnProperty.call(p, k)) q[k] = p[k];
    ensure(q);
    cfg.masc = q.appearance === 'male'; cfg.height = q.height || 'average'; cfg.shape = q.bodyShape;
    cfg.bust = q.breastSize; cfg.hip = q.hipSize; cfg.penis = penisOf(q); cfg.dem = q.demeanor;
    var tn = clamp(num(q.tan, 0), 0, 100), tl = {};
    if (tn > 0) REGIONS.forEach(function (r) { var v = Math.round(clamp(tn - num(q.tanLines[r], 0), 0, 100) / 5) * 5; tl[r] = v; });
    cfg.skin = skinHex(q.skin); cfg.tan = tl; cfg.freckles = !!q.freckles;
    var eye = q.eyeColor; if (q.contacts && q.contacts.color && (!live || num(q.contacts.until, 0) > nowMin())) eye = q.contacts.color;
    cfg.eye = eyeHex(eye);
    var cm = hairLenCm(q, live);
    cfg.hair = { col: hairHex(q.hairColor), len: Math.round(cm), sides: q.hairSides, fringe: q.hairFringe, roots: null, faded: false, wet: false, scruffy: false };
    if (live && g.salon && st.hair) {
      if (safe(function () { return g.salon.rootsShowing(); }, false)) cfg.hair.roots = hairHex(safe(function () { return g.salon.natural(); }, 'brown'));
      cfg.hair.faded = !!safe(function () { return g.salon.faded(); }, false);
      cfg.hair.scruffy = !!safe(function () { return g.salon.scruffy(); }, false);
    }
    if (q.hairStyle === 'buzzed' && cm < 2) cfg.hair.sides = 'buzz';
    // makeup (salon.js)
    var mk = live && window.Salon && Salon.makeupLook ? safe(function () { return Salon.makeupLook(); }, null) : null;
    if (mk) cfg.mk = { lip: mk.lip || null, eye: mk.eye || null, blush: mk.blush || null, sm: !!mk.smudged };
    // clothes
    var outfit = null;
    if (opts.outfit) outfit = normalizeOutfit(opts.outfit, q, false);
    else if (live && window.Wardrobe && Wardrobe.spriteOutfit && st.wardrobe && st.wardrobe.starter) {
      outfit = safe(function () { return normalizeOutfit(Wardrobe.spriteOutfit(p), q, true); }, null);
      if (outfit && outfit.under_bottom && g.wardrobe && g.wardrobe.layer) {
        var lb = safe(function () { return g.wardrobe.layer('under_bottom'); }, null);
        if (lb) { outfit.under_bottom.bulk = num(lb.bulk, 0); outfit.under_bottom.fill = Math.round(num(lb.fill, 0) * 10) / 10; }
        outfit._briefShows = !!safe(function () { return g.wardrobe.briefVisible(); }, false);
      }
    }
    if (!outfit) outfit = defaultOutfit(q);
    cfg.outfit = outfit;
    // live temporary states
    var t = {};
    if (live) {
      var n = (st.stats && st.stats.needs) || {};
      var exposedPub = !!safe(function () { return g.wardrobe && g.wardrobe.exposedInPublic && g.wardrobe.exposedInPublic(); }, false);
      var outdoors = !!safe(function () { var h = g.world.here(); return h && !h.indoor; }, false);
      var wx = safe(function () { return g.world.weather(); }, 'clear'), wxd = safe(function () { return g.world.WEATHER[wx]; }, null);
      var temp = safe(function () { return g.world.temp(); }, 14), warmth = safe(function () { return g.wardrobe.warmth(); }, 4);
      t.tired = num(n.fatigue, 0) >= 700 || tempOn('tired');
      t.stressed = num(n.stress, 0) >= 650 || tempOn('stressed');
      t.upset = num(n.stress, 0) >= 900 || tempOn('upset');
      t.blush = tempOn('blush') || exposedPub ? 2 : (st.lock && st.lock.reason === 'npcs-scene') ? 1 : 0;
      t.cold = tempOn('cold') || (outdoors && ((temp <= 8 && warmth < 6) || (temp <= 2 && warmth < 9)));
      var umbrella = !!(st.world && st.world.umbrella), hat = outfit.head, hood = outfit.outer && outfit.outer.cat === 'raincoat';
      t.wetHair = tempOn('wetHair') || (outdoors && wxd && num(wxd.wet, 0) >= 4 && !umbrella && !hood && !(hat && hat.cat !== 'sunhat'));
      t.sunburn = tempOn('sunburn');
      t.happy = tempOn('happy');
      cfg.pose = exposedPub || safe(function () { return g.stats.covering(); }, false) ? 'cover' : t.cold ? 'hug' : 'down';
    } else {
      var ft = opts.temps || {};
      TEMP_NAMES.forEach(function (nm) { if (ft[nm]) t[nm] = ft[nm]; });
      cfg.pose = opts.pose || (t.cold ? 'hug' : 'down');
    }
    if (t.wetHair) cfg.hair.wet = true;
    Object.keys(t).forEach(function (k2) { if (!t[k2]) delete t[k2]; });
    cfg.t = t;
    return cfg;
  }

  /* ---------------- geometry ---------------- */
  var HEAD = [6, 9, 11, 12, 13, 14, 15, 15, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 15, 15, 14, 14, 13, 12, 11, 9, 6];
  function geo(cfg) {
    var leg = { short: 27, average: 30, tall: 33 }[cfg.height] || 30;
    var feet = 109, ank = feet - 4, cr = ank - leg, sy = cr - 27, hT = sy - 33, shp = cfg.shape;
    var chest = { classic: 9, slender: 8, curvy: 9, soft: 10 }[shp] || 9;
    var waist = { classic: 8, slender: 7, curvy: 7, soft: 10 }[shp] || 8;
    var hip = ({ classic: 9, slender: 8, curvy: 10, soft: 11 }[shp] || 9) + [-1, -1, 0, 1, 2][clamp(cfg.hip, 0, 4)];
    if (cfg.masc) { chest += 1; waist += 1; }
    hip = Math.max(hip, waist); if (shp === 'soft') waist = Math.max(waist, hip - 1);
    var bustW = [0, 0, 1, 1, 2][clamp(cfg.bust, 0, 4)];
    function lerp(a, b, t) { return a + (b - a) * t; }
    function tw(r) {
      var v;
      if (r <= 0) v = chest - 4; else if (r === 1) v = chest - 1; else if (r <= 8) v = chest;
      else if (r <= 12) v = lerp(chest, waist, (r - 8) / 4); else if (r <= 15) v = waist;
      else if (r <= 19) v = lerp(waist, hip, (r - 15) / 4); else v = hip;
      if (shp === 'soft' && r >= 12 && r <= 18) v += 1;
      return Math.round(v);
    }
    var ankHW = shp === 'soft' ? 7 : shp === 'slender' ? 5 : 6;
    function legOuter(y) { var t = clamp((y - cr) / (ank - cr), 0, 1); return Math.round(CX - hip + (hip - ankHW) * Math.pow(t, 0.85)); }
    return { leg: leg, feet: feet, ank: ank, cr: cr, sy: sy, hT: hT, chest: chest, waist: waist, hip: hip, bustW: bustW, bust: cfg.bust, tw: tw, legOuter: legOuter };
  }
  /* arm path (left side of the picture unless right=true): [shoulder, elbow, wrist, hand] */
  function armPath(Gm, pose, right) {
    var sy = Gm.sy, c = Gm.chest, h = Gm.hip, P;
    var wx = Math.min(CX - c - 2.2, CX - h - 1.4);
    if (pose === 'cover') P = right ? [[CX + c - 1, sy + 3], [CX + c + 1.5, sy + 12.5], [CX + 3.5, sy + 21.5], [CX + 1.5, sy + 23]] : [[CX - c + 1, sy + 3], [CX - c - 2, sy + 11.5], [CX + 1.5, sy + 7], [CX + 3.5, sy + 6.5]];
    else if (pose === 'hug') P = right ? [[CX + c - 1, sy + 3], [CX + c + 1.8, sy + 11.5], [CX - 3, sy + 10.5], [CX - 5, sy + 10]] : [[CX - c + 1, sy + 3], [CX - c - 1.8, sy + 11], [CX + 3, sy + 8.5], [CX + 5, sy + 8]];
    else { P = [[CX - c + 1, sy + 3], [CX - c - 1.4, sy + 12.5], [wx, sy + 20.5], [wx + 0.2, sy + 22.6]]; if (right) P = P.map(function (q) { return [DW - q[0], q[1]]; }); }
    return P;
  }
  function armMask(P, t0, t1, extra) {
    var m = M(), a = P[0], b = P[1], c = P[2], la = Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2)), lb = Math.sqrt(Math.pow(c[0] - b[0], 2) + Math.pow(c[1] - b[1], 2)), L = la + lb;
    extra = extra || 0;
    var n = Math.ceil(L * 3);
    for (var i = 0; i <= n; i++) {
      var t = i / n; if (t < t0 - 1e-6 || t > t1 + 1e-6) continue;
      var d = t * L, x, y, r;
      if (d <= la) { var u = d / la; x = a[0] + (b[0] - a[0]) * u; y = a[1] + (b[1] - a[1]) * u; r = 2.45 - 0.25 * u; }
      else { var v = (d - la) / lb; x = b[0] + (c[0] - b[0]) * v; y = b[1] + (c[1] - b[1]) * v; r = 2.2 - 0.3 * v; }
      disc(m, x, y, r + extra);
    }
    return m;
  }
  function handMask(P) { var m = M(); disc(m, P[3][0], P[3][1], 2.35); return m; }

  /* ---------------- eyes / faces ---------------- */
  var EYE = {
    gentle: ['..LLLL.', '.LLLLLL', 'LLDDDDL', '.WHDDDW', '.WHPPIW', '.WIPPIW', '.WiIIiW', '..lll..'],
    sweet: ['.LLLLL.', 'LLLLLLL', 'LHHDDDL', 'WHHDPDW', 'WIDPPIW', 'WIIIIhW', 'WiiiihW', '.lllll.'],
    catty: ['LL.....', '.LLLLLL', '.LDDDDL', 'WHDPPDW', '.WIPPIW', '..WiiW.', '...ll..'],
    aloof: ['LLLLLLL', '.LDDDDL', '.WHPPIW', '.WIIIiW', '..WiiW.', '...ll..'],
    foxy: ['L......', 'LLLLLL.', '.LLDDDL', '.WHPPIW', '..WiiW.', '...ll..']
  };
  var BROW = {
    gentle: [[1, 1], [2, 0], [3, 0], [4, 0], [5, 1]], sweet: [[1, 0], [2, -1], [3, -1], [4, -1], [5, 0]],
    catty: [[0, -1], [1, -1], [2, 0], [3, 0], [4, 1], [5, 1]], aloof: [[1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2]],
    foxy: [[0, 0], [1, 0], [2, 0], [3, 1], [4, 1], [5, 2]], worried: [[1, 2], [2, 2], [3, 1], [4, 1], [5, 0]]
  };
  var MOUTH = {
    smile: [[26, 0, 'm'], [27, 1, 'm'], [28, 1, 'm'], [29, 0, 'm']],
    cat: [[25, 0, 'm'], [26, 1, 'm'], [27, 0, 'm'], [28, 0, 'm'], [29, 1, 'm'], [30, 0, 'm']],
    neutral: [[27, 0, 'm'], [28, 0, 'm']],
    smirk: [[26, 0, 'm'], [27, 0, 'm'], [28, 0, 'm'], [29, -1, 'm']],
    frown: [[26, 1, 'm'], [27, 0, 'm'], [28, 0, 'm'], [29, 1, 'm']],
    open: [[27, 0, 'd'], [28, 0, 'd'], [27, 1, 't'], [28, 1, 't'], [26, 0, 'm'], [29, 0, 'm']],
    big: [[25, 0, 'm'], [26, 0, 'd'], [27, 0, 'd'], [28, 0, 'd'], [29, 0, 'd'], [30, 0, 'm'], [26, 1, 'm'], [27, 1, 't'], [28, 1, 't'], [29, 1, 'm']],
    wobble: [[25, 1, 'm'], [26, 0, 'm'], [27, 1, 'm'], [28, 0, 'm'], [29, 1, 'm'], [30, 0, 'm']]
  };

  /* ---------------- hair ---------------- */
  function hairEndY(cm, hT) {
    var P = [[0, 6], [2, 12], [7, 22], [13, 28], [19, 34], [30, 43], [50, 53], [75, 62], [90, 66]];
    cm = clamp(cm, 0, 90);
    for (var i = 1; i < P.length; i++) if (cm <= P[i][0]) { var t = (cm - P[i - 1][0]) / (P[i][0] - P[i - 1][0]); return Math.round(hT + P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t); }
    return hT + 66;
  }
  /* fringe = a base line plus pointed locks [centre dx, width, length]; dx 0..31 across the forehead */
  var FRINGE = {
    blunt: { base: function (dx) { return 12 + Math.round(Math.pow(Math.abs(dx - 15.5) / 15.5, 4) * 2); }, locks: [[4, 7, 1.4], [11, 7, 1.6], [18, 7, 1.4], [25, 7, 1.6]] },
    swept: { base: function (dx) { return 6 + dx * 0.24; }, locks: [[3, 6, 4], [8, 7, 4], [13, 7, 4.5], [18, 7, 4], [23, 6, 4], [28, 5, 3]] },
    parted: { base: function (dx) { return 4 + Math.abs(dx - 15.5) * 0.48; }, locks: [[3, 6, 3.5], [8, 6, 3.5], [12.5, 5, 3], [19, 5, 3], [23.5, 6, 3.5], [28.5, 6, 3.5]] },
    curtain: { base: function (dx) { return 3 + Math.max(0, Math.abs(dx - 15.5) - 2) * 0.82; }, locks: [[2.5, 5, 3], [7, 5, 2.5], [24.5, 5, 2.5], [29, 5, 3]] },
    spiky: { base: function () { return 8; }, locks: [[2, 4.5, 6], [6, 4.5, 6.5], [10, 4.5, 5], [14, 4.5, 6.5], [18, 4.5, 5.5], [22, 4.5, 6.5], [26, 4.5, 5], [29.5, 4, 6]] },
    wispy: { base: function () { return 9; }, locks: [[3, 3.5, 5], [7.5, 3.5, 6], [11, 3, 4], [15.5, 3.5, 6], [20, 3, 4.5], [24, 3.5, 6], [28, 3.5, 5]] },
    choppy: { base: function () { return 10; }, locks: [[2.5, 5, 4], [7, 4, 2], [10.5, 5, 5], [15, 4, 2.5], [19, 5, 5], [23.5, 4, 3], [27.5, 5, 4.5]] },
    none: { base: function (dx) { return 4 + Math.pow(Math.abs(dx - 15.5) / 15.5, 2) * 9; }, locks: [[8, 9, 1.2], [23, 9, 1.6]] }
  };
  function fringeAt(style, dx, wet) {
    var F = FRINGE[style] || FRINGE.blunt, v = F.base(dx);
    for (var i = 0; i < F.locks.length; i++) { var L = F.locks[i], d = Math.abs(dx + 0.5 - L[0]) / (L[1] / 2); if (d < 1) v = Math.max(v, F.base(dx) + L[2] * (1 - d) * (wet ? 1.25 : 1)); }
    if (dx <= 1 || dx >= 30) v = Math.max(v, style === 'none' ? 14 : 17);
    return Math.min(17, Math.round(v));
  }
  function fringeTips(style) { var F = FRINGE[style] || FRINGE.blunt; return F.locks.map(function (L) { return [12 + L[0] - 0.5, fringeAt(style, Math.round(L[0] - 0.5))]; }); }
  function capMask(hT) { var m = M(); ell(m, CX, hT + 12.5, 17.8, 15.8); for (var y = hT + 12; y <= hT + 30; y++) sym(m, y, Math.round(17.6 - Math.max(0, y - hT - 14) * 0.12)); return m; }
  function frontHair(cfg, Gm, buzz) {
    var hT = Gm.hT, m = capMask(hT), st = cfg.hair.fringe, cut = M();
    for (var x = 0; x < DW; x++) {
      var lim;
      if (x >= 12 && x <= 43) lim = hT + fringeAt(st, x - 12, cfg.hair.wet);
      else lim = hT + (st === 'none' ? 15 : 18);
      if (buzz) lim = hT + (x >= 13 && x <= 42 ? 5 : 15);
      for (var y = lim + 1; y < DH; y++) cut[y * DW + x] = 1;
    }
    return msub(m, cut);
  }
  function lockMask(cfg, Gm, end) {
    var m = M(), hT = Gm.hT, st = cfg.hair.sides, top = hT + 12;
    if (st === 'buzz') return m;
    if (st === 'tucked' || st === 'ponytail' || st === 'bun') end = Math.min(end, hT + 18);
    if (st === 'pigtails' || st === 'braids') end = Math.min(end, hT + 24);
    if (end <= top + 1) return m;
    for (var y = top; y <= end; y++) {
      var xo = y > Gm.sy - 1 ? 9.5 : 10.5, xi = y < hT + 30 ? 16 : 15, k = end - y;
      if (st === 'tucked' || st === 'ponytail' || st === 'bun') { xo = 10.5; xi = 13; }
      if (st === 'wavy') { var s = Math.round(Math.sin((y - hT) / 2.8) * 1.3); xo += s; xi += s; }
      if (k < 4) { xo += (4 - k) * 0.6; xi -= (4 - k) * 0.9; }
      if (st === 'curly') { disc(m, (xo + xi) / 2 + ((y >> 2) % 2 ? 1.2 : -1.2), y, 3.1 - (k < 3 ? (3 - k) * 0.6 : 0)); continue; }
      if (xi >= xo) span(m, y, Math.round(xo), Math.round(xi));
    }
    return m;
  }
  function backHairMask(cfg, Gm, end, R) {
    var m = M(), hT = Gm.hT, st = cfg.hair.sides, r = R || rng(7);
    if (st === 'buzz' || st === 'bun' || st === 'braids' || st === 'pigtails' || st === 'ponytail') return m;
    if (end <= hT + 26) return m;
    ell(m, CX, hT + 12.5, 18.6, 16.8);
    for (var y = hT + 12; y <= end; y++) {
      var sh = clamp((y - (Gm.sy - 4)) / 6, 0, 1), hw = 18.3 + sh * 2.4, k = end - y;
      if (st === 'curly') hw += 2; if (st === 'wavy') hw += Math.sin((y - hT) / 2.8) * 1.1;
      if (k < 6) hw -= (6 - k) * 0.9;
      if (hw > 2) sym(m, y, Math.round(hw));
    }
    // pointed lock tips along the hem
    for (var x = 0; x < DW; x++) { var ph = (x + 1) % 5, cut = ph === 0 ? 0 : ph === 1 || ph === 4 ? 1 : ph === 2 ? 2 : 3; for (var yy = end; yy > end - cut; yy--) mc(m, x, yy); }
    return m;
  }
  function paintHair(buf, m, R, Gm, o) {
    o = o || {};
    paint(buf, m, R, { dark: !!o.dark });
    var hT = Gm.hT;
    for (var y = 1; y < DH - 1; y++) for (var x = 1; x < DW - 1; x++) {
      var i = y * DW + x; if (!m[i] || !m[i - 1] || !m[i + 1] || !m[i - DW] || !m[i + DW]) continue;
      if (!o.dark && o.ring !== false) {
        var yr = hT + 5 + Math.round(Math.pow((x - CX + 0.5) / 16, 2) * 6), seg = (x + 40) % 5;
        if (x >= CX - 14 && x <= CX + 6 && seg !== 4) {
          if (y === yr) { buf[i] = x < CX - 2 ? R[0] : R[1]; continue; }
          if (y === yr + 1 && seg >= 1 && seg <= 2 && x < CX) { buf[i] = R[1]; continue; }
        }
      }
      if (o.strands && y > (o.strandTop || 0) && ((x * 3 + (y >> 3)) % 5 === 0)) buf[i] = R[o.dark ? 4 : 3];
    }
  }

  /* ---------------- clothing helpers ---------------- */
  function holesFor(m, it, seedName) {
    if (!it || it.f >= 0.5) return m;
    var r = rng(hashStr(seedName + it.cat + it.col)), n = 1 + Math.round((0.5 - it.f) * 16), tries = 0;
    var mm = mcopy(m);
    while (n > 0 && tries++ < 400) {
      var i = Math.floor(r() * mm.length); if (!mm[i]) continue;
      var x = i % DW, y = (i / DW) | 0;
      if (!mg(m, x - 1, y) || !mg(m, x + 1, y) || !mg(m, x, y - 1) || !mg(m, x, y + 1) || !mg(m, x + 1, y + 1)) continue;
      mc(mm, x, y); if (r() < 0.6) mc(mm, x + 1, y); if (r() < 0.3) mc(mm, x, y + 1); n--;
    }
    // frayed hem: nibble the lowest pixel of some columns
    for (var cx = 0; cx < DW; cx++) { for (var yy = DH - 1; yy >= 0; yy--) if (mm[yy * DW + cx]) { if (r() < (0.5 - it.f) * 1.4) mm[yy * DW + cx] = 0; break; } }
    return mm;
  }
  function garmentRamp(it) {
    var R = ramp(it.col);
    R = wetRamp(R, it.wet);
    if (it.soiled) R = rampMix(R, 0x6b5a3a, 0.12);
    return R;
  }
  function interior(m, x, y) { return mg(m, x, y) && mg(m, x - 1, y) && mg(m, x + 1, y) && mg(m, x, y - 1) && mg(m, x, y + 1); }
  function drips(buf, m, it, seed) {
    if (!it || it.wet < 90) return;
    var r = rng(hashStr(seed + 'drip')), cols = [], x, y;
    for (x = 0; x < DW; x++) for (y = DH - 1; y >= 0; y--) if (m[y * DW + x]) { if (!mg(m, x, y + 1)) cols.push([x, y]); break; }
    for (var k = 0; k < 3 && cols.length; k++) { var c = cols[Math.floor(r() * cols.length)]; px(buf, c[0], c[1] + 1, 0x8fbde6); if (r() < 0.6) px(buf, c[0], c[1] + 3, 0x6d9cc9); }
    // wet sheen
    for (var s = 0; s < 4; s++) { var i = Math.floor(r() * m.length); x = i % DW; y = (i / DW) | 0; if (interior(m, x, y)) px(buf, x, y, mixi(buf[i] < 0 ? 0xffffff : buf[i], 0xdfefff, 0.35)); }
  }
  function pattern(buf, m, R, pat, Gm) {
    if (!pat) return;
    var sy = Gm.sy;
    for (var y = 1; y < DH - 1; y++) for (var x = 1; x < DW - 1; x++) {
      if (!interior(m, x, y)) continue;
      var i = y * DW + x;
      if (pat === 'plaid') { var a = (x % 4 === 0), b = (y % 4 === 0); if (a && b) buf[i] = R[4]; else if (a || b) buf[i] = mixi(buf[i], R[4], 0.45); else if (x % 4 === 2 && y % 4 === 2) buf[i] = mixi(buf[i], 0xe8d8b0, 0.25); }
      else if (pat === 'stripe') { if (y % 3 === 0) buf[i] = R[4]; }
      else if (pat === 'floral') { if ((x % 5 === 1 && y % 4 === 1) || (x % 5 === 3 && y % 4 === 3)) buf[i] = 0x6f8fcf; else if (x % 5 === 2 && y % 4 === 1) buf[i] = 0xf4f0e0; }
      else if (pat === 'cats') { var cx = (x + 1) % 6, cy = (y + 2) % 6; if ((cy === 0 && (cx === 0 || cx === 2)) || (cy === 1 && cx >= 0 && cx <= 2)) buf[i] = R[0]; }
      else if (pat === 'cable') { if ((x === CX - 5 || x === CX + 4 || x === CX - 1) && y > sy + 2) buf[i] = (y % 3 === 0) ? R[0] : (y % 3 === 1 ? R[3] : R[2]); if ((x === CX - 6 || x === CX + 5 || x === CX - 2 || x === CX) && y % 3 === 2 && y > sy + 2) buf[i] = R[3]; }
    }
    if (pat === 'print') { var r1 = [[CX - 3, sy + 6], [CX + 2, sy + 9]]; for (var yy = r1[0][1]; yy <= r1[1][1]; yy++) for (var xx = r1[0][0]; xx <= r1[1][0]; xx++) if (mg(m, xx, yy)) buf[yy * DW + xx] = (xx + yy) % 3 === 0 ? 0xc94f4f : 0xd9d4c4; }
    if (pat === 'crest') {
      var cr = [[0, 0, 1], [1, 0, 1], [2, 0, 1], [3, 0, 1], [0, 1, 1], [1, 1, 2], [2, 1, 2], [3, 1, 1], [0, 2, 1], [1, 2, 2], [2, 2, 2], [3, 2, 1], [1, 3, 1], [2, 3, 1]];
      cr.forEach(function (q) { px(buf, CX - 6 + q[0], sy + 6 + q[1], q[2] === 1 ? 0xd9c48f : 0xf2ead0); });
    }
  }
  function torsoMask(Gm, r0, r1, ease, o) {
    o = o || {}; var m = M();
    for (var r = r0; r <= r1; r++) {
      var hw = Gm.tw(r) + ease;
      if (r === 0) hw = Gm.tw(0) + Math.min(ease, 1) + 1;
      if (!o.flatChest && r >= 3 && r <= 9) hw += Gm.bustW;
      if (o.flare && r >= r1 - 3) hw += 1;
      if (o.taper && r >= r1 - 1) hw -= 1;
      sym(m, Gm.sy + r, hw);
    }
    return m;
  }
  function neckCut(m, Gm, kind) {
    var sy = Gm.sy;
    if (kind === 'crew') { for (var x = CX - 3; x <= CX + 2; x++) mc(m, x, sy); for (x = CX - 2; x <= CX + 1; x++) mc(m, x, sy + 1); }
    if (kind === 'v') { for (var r = 0; r <= 5; r++) { var w = Math.max(0, Math.round(3 - r * 0.6)); for (var x2 = CX - w - 1; x2 <= CX + w; x2++) mc(m, x2, sy + r); } }
    if (kind === 'scoop') { var rows = [[4, 0], [3, 1], [3, 2], [2, 3], [1, 4]]; rows.forEach(function (q) { for (var x3 = CX - q[0] - 1; x3 <= CX + q[0]; x3++) mc(m, x3, sy + 2 + q[1]); }); for (var r2 = 0; r2 < 2; r2++) for (var x4 = CX - 5; x4 <= CX + 4; x4++) mc(m, x4, sy + r2); }
    if (kind === 'wide') { for (var r3 = 0; r3 <= 3; r3++) for (var x5 = CX - 7 + r3; x5 <= CX + 6 - r3; x5++) mc(m, x5, sy + r3); }
    return m;
  }
  function bustShade(buf, m, R, Gm) {
    if (Gm.bust <= 0) return;
    var ub = Gm.sy + 8 + (Gm.bust >= 3 ? 1 : 0), w = 2 + (Gm.bust >= 2 ? 1 : 0) + (Gm.bust >= 4 ? 1 : 0);
    var cols = [];
    for (var k = -w; k <= w; k++) cols.push([k, Math.abs(k) === w ? -1 : 0]);
    [CX - 4, CX + 3].forEach(function (c) {
      cols.forEach(function (q) { var x = c + q[0], y = ub + q[1]; if (interior(m, x, y)) buf[y * DW + x] = R[Gm.bust >= 2 ? 4 : 3]; });
      if (Gm.bust >= 2) { var hx = c - 1, hy = ub - 3; if (interior(m, hx, hy)) buf[hy * DW + hx] = R[1]; if (interior(m, hx + 1, hy)) buf[hy * DW + hx + 1] = R[1]; }
    });
  }
  function hline(buf, m, y, x0, x1, c, onlyIn) { for (var x = x0; x <= x1; x++) if (!onlyIn || interior(m, x, y)) px(buf, x, y, c); }
  function vline(buf, m, x, y0, y1, c, onlyIn) { for (var y = y0; y <= y1; y++) if (!onlyIn || interior(m, x, y)) px(buf, x, y, c); }
  function mirrorPx(list) { var o = list.slice(); list.forEach(function (q) { o.push([DW - 1 - q[0], q[1]]); }); return o; }
  function stampIn(buf, m, list, c) { list.forEach(function (q) { if (mg(m, q[0], q[1])) px(buf, q[0], q[1], c); }); }

  /* ---------------- garments ---------------- */
  function bagE(it) { return (it.bag >= 3 ? 1 : 0) + (it.bag >= 4 ? 1 : 0); }
  function drawTopLike(buf, it, Gm, seed) {
    var cat = it.cat, R = garmentRamp(it), sy = Gm.sy, e = 1, r0 = 0, r1 = 21, neck = 'crew', sl = null, o = {}, m;
    if (cat === 'bra') {
      m = M();
      var cw = 3.2 + Gm.bust * 0.45, ch = 2.4 + Gm.bust * 0.35;
      if (Gm.bust > 0) { ell(m, CX - 3.6, sy + 6, cw, ch); ell(m, CX + 3.6, sy + 6, cw, ch); }
      for (var rb = 7; rb <= 9; rb++) sym(m, sy + rb, Gm.tw(rb) + (rb <= 9 ? Gm.bustW : 0));
      if (Gm.bust === 0) for (var rb2 = 4; rb2 <= 6; rb2++) sym(m, sy + rb2, Gm.tw(rb2) - 1);
      var bodyT = torsoMask(Gm, 0, 27, 0); mand(m, bodyT);
      var st1 = M(); rect(st1, CX - 6, sy, CX - 6, sy + 5); mirror(st1); mor(m, st1);
      paint(buf, holesFor(m, it, seed), R); drips(buf, m, it, seed);
      return null;
    }
    switch (cat) {
      case 'tee': e = 1 + bagE(it); r1 = 21; sl = { t: 0.34, x: 0.65 }; break;
      case 'tank': e = 0; r1 = 21; neck = 'scoop'; break;
      case 'undershirt': e = 0; r1 = 20; neck = 'scoop'; break;
      case 'cami': e = 0; r0 = 3; r1 = 19; neck = 'none'; break;
      case 'thermal': e = 0; r1 = 20; sl = { t: 0.95, x: 0.35, cuff: 1 }; break;
      case 'blouse': e = 1 + bagE(it); r1 = 22; neck = 'v'; o.flare = true; sl = { t: 0.9, x: 1.1, cuff: 1 }; break;
      case 'shirt': e = 1 + bagE(it); r1 = 21; neck = 'v'; sl = { t: 0.92, x: 0.75, cuff: 1 }; break;
      case 'hoodie': e = 2 + (it.bag >= 4 ? 1 : 0); r1 = 23; o.taper = true; sl = { t: 0.95, x: 1.15, cuff: 1 }; break;
      case 'sweater': case 'turtle': case 'henley': e = 1 + bagE(it); r1 = 22; o.taper = true; sl = { t: 0.94, x: 0.85, cuff: 1 }; break;
      case 'dress': e = 1; r1 = 17; neck = 'scoop'; sl = { t: 0.22, x: 1.0 }; break;
    }
    m = torsoMask(Gm, r0, r1, e, o);
    if (neck !== 'none') neckCut(m, Gm, neck);
    if (cat === 'tank' || cat === 'undershirt' || cat === 'cami') {
      var stp = M(), w = cat === 'cami' ? 0 : cat === 'undershirt' ? 2 : 1;
      rect(stp, CX - 6 - w, sy, CX - 6, sy + (cat === 'cami' ? 4 : 3)); mirror(stp); mor(m, stp);
    }
    if (cat === 'dress') {
      var hem = Gm.cr + 9;
      for (var y = sy + 17; y <= hem; y++) { var t = (y - sy - 17) / (hem - sy - 17); sym(m, y, Math.round(Gm.tw(17) + 1 + (Gm.hip + 4 - Gm.tw(17) - 1) * Math.pow(t, 0.8))); }
    }
    var mm = holesFor(m, it, seed);
    paint(buf, mm, R);
    pattern(buf, mm, R, it.pat, Gm);
    bustShade(buf, mm, R, Gm);
    // details
    if (cat === 'shirt' || cat === 'blouse') {
      var col = M(); [[sy - 1, CX - 5, CX - 3], [sy, CX - 5, CX - 2], [sy + 1, CX - 4, CX - 1], [sy + 2, CX - 3, CX - 1]].forEach(function (q) { span(col, q[0], q[1], q[2]); });
      if (cat === 'blouse') { col = M(); [[sy - 1, CX - 5, CX - 4], [sy, CX - 6, CX - 3], [sy + 1, CX - 5, CX - 3]].forEach(function (q) { span(col, q[0], q[1], q[2]); }); }
      mirror(col); paint(buf, col, ramp(mixi(hex2i(it.col), 0xffffff, 0.12)));
      if (cat === 'shirt') { vline(buf, mm, CX - 1, sy + 4, sy + r1 - 1, R[3], true); for (var b = sy + 6; b < sy + r1; b += 4) px(buf, CX, b, R[0]); hline(buf, mm, sy + 6, CX - 7, CX - 4, R[4], true); vline(buf, mm, CX - 7, sy + 7, sy + 9, R[3], true); vline(buf, mm, CX - 4, sy + 7, sy + 9, R[3], true); hline(buf, mm, sy + 10, CX - 6, CX - 5, R[3], true); }
      else for (var b2 = sy + 7; b2 < sy + r1 - 2; b2 += 4) px(buf, CX - 1, b2, R[0]);
    }
    if (cat === 'hoodie') {
      var rim = M(); for (var ry = sy - 2; ry <= sy + 1; ry++) sym(rim, ry, ry < sy ? 6 : 7); for (var ry2 = sy - 2; ry2 <= sy; ry2++) for (var rx = CX - 3; rx <= CX + 2; rx++) mc(rim, rx, ry2);
      paint(buf, rim, rampMul(R, 0.9));
      [CX - 2, CX + 1].forEach(function (x) { vline(buf, null, x, sy + 2, sy + 7, 0xeeeae0); px(buf, x, sy + 8, 0xc9c4b8); });
      var pt = sy + 15, pb = sy + 20;
      for (var py = pt; py <= pb; py++) { var k = Math.round((py - pt) * 0.4); px(buf, CX - 5 - k, py, R[4]); px(buf, CX + 4 + k, py, R[4]); }
      hline(buf, mm, pt, CX - 5, CX + 4, R[4], true); hline(buf, mm, pb, CX - 7, CX + 6, R[3], true);
      hline(buf, mm, sy + r1 - 1, CX - 12, CX + 11, R[3], true);
    }
    if (cat === 'sweater' || cat === 'turtle' || cat === 'henley' || cat === 'thermal') {
      for (var hx = 0; hx < DW; hx += 2) { px(buf, hx, sy + r1 - 1, interior(mm, hx, sy + r1 - 1) ? R[3] : buf[(sy + r1 - 1) * DW + hx]); }
      if (cat === 'henley') { vline(buf, mm, CX - 1, sy + 1, sy + 6, R[3], true); px(buf, CX, sy + 3, R[0]); px(buf, CX, sy + 5, R[0]); }
      if (cat === 'henley' || cat === 'thermal') for (var wy = sy + 3; wy < sy + r1 - 1; wy += 2) for (var wx = 0; wx < DW; wx += 2) if (interior(mm, wx, wy)) buf[wy * DW + wx] = mixi(buf[wy * DW + wx], R[4], 0.35);
      if (cat !== 'henley') { hline(buf, mm, sy + 1, CX - 4, CX + 3, R[3], true); }
    }
    if (cat === 'tee') hline(buf, mm, sy + 1, CX - 3, CX + 2, R[3], true);
    if (cat === 'cami') { for (var lx = CX - 12; lx <= CX + 12; lx += 2) if (mg(mm, lx, sy + 3)) px(buf, lx, sy + 3, R[0]); }
    if (cat === 'dress') { for (var dy = sy + 19; dy <= Gm.cr + 8; dy++) [CX - 5, CX + 4].forEach(function (x) { if (interior(mm, x, dy)) buf[dy * DW + x] = R[3]; }); hline(buf, mm, sy + 17, CX - 12, CX + 11, R[4], true); }
    drips(buf, mm, it, seed);
    return sl ? { t: sl.t, x: sl.x + it.bag * 0.12, cuff: sl.cuff, R: R, it: it } : null;
  }
  function turtleTube(buf, it, Gm) {
    var m = M(), R = garmentRamp(it); rect(m, CX - 4, Gm.hT + 30, CX + 3, Gm.sy + 1);
    paint(buf, m, R); for (var y = Gm.hT + 31; y <= Gm.sy; y += 2) hline(buf, m, y, CX - 3, CX + 2, R[3], true);
  }
  function pantsMask(Gm, ease, hem, outerFn, bulge) {
    var m = M(), sy = Gm.sy;
    for (var r = 17; r <= 27; r++) sym(m, sy + r, Gm.tw(r) + ease + (bulge && r >= 19 ? 1 : 0));
    for (var y = Gm.cr - 1; y <= hem; y++) { var l = outerFn(y), inner = y <= Gm.cr + (bulge ? 2 : 0) ? CX - 1 : CX - 2; span(m, y, l, inner); }
    return mirror(m);
  }
  function drawBottom(buf, it, Gm, bulge, seed) {
    var cat = it.cat, R = garmentRamp(it), sy = Gm.sy, cr = Gm.cr, ank = Gm.ank, m, lo = Gm.legOuter;
    if (cat === 'skirt' || cat === 'longskirt') {
      m = M(); var hem = cat === 'skirt' ? cr + 8 : cr + 21, top = sy + 17, flare = cat === 'skirt' ? 4 : 5;
      for (var y = top; y <= hem; y++) {
        var t = (y - top) / (hem - top), hw = y < top + 3 ? Gm.tw(y - sy) + 1 : Math.round(Gm.tw(20) + 1 + (Gm.hip + flare - Gm.tw(20) - 1) * Math.pow(t, cat === 'skirt' ? 0.9 : 0.6));
        sym(m, y, hw + (bulge ? 1 : 0));
      }
      if (cat === 'skirt') for (var x = 0; x < DW; x++) if ((x - CX + 30) % 3 === 1) mc(m, x, hem);
      var mm = holesFor(m, it, seed); paint(buf, mm, R);
      hline(buf, mm, top + 2, 0, DW - 1, R[3], true);
      if (cat === 'skirt') { for (var yy = top + 4; yy < hem; yy++) for (var xx = 0; xx < DW; xx++) if (interior(mm, xx, yy) && (xx - CX + 30) % 3 === 0) { buf[yy * DW + xx] = R[4]; if (interior(mm, xx - 1, yy)) buf[yy * DW + xx - 1] = R[1]; } }
      else [CX - 6, CX - 1, CX + 4].forEach(function (fx, i) { for (var yy2 = top + 6 + (i % 2) * 3; yy2 < hem - 1; yy2++) { var wx = fx + Math.round((yy2 - top) * (fx - CX + 0.5) * 0.03); if (interior(mm, wx, yy2)) { buf[yy2 * DW + wx] = R[3]; if (interior(mm, wx - 1, yy2)) buf[yy2 * DW + wx - 1] = R[1]; } } });
      drips(buf, mm, it, seed); return;
    }
    var ease = 1, hemY = ank, outer;
    if (cat === 'jeans') { ease = 0; outer = function (y) { return Math.min(lo(y) - 1, CX - 8); }; }
    else if (cat === 'sweats') { ease = 2; outer = function (y) { return y >= ank - 1 ? lo(y) - 1 : Math.min(lo(y) - 2, CX - 9); }; }
    else if (cat === 'shorts') { ease = 1; hemY = cr + 7; outer = function (y) { return lo(y) - 2; }; }
    else outer = function (y) { return Math.min(lo(y) - 1, CX - 8); };
    m = pantsMask(Gm, ease, hemY, outer, bulge);
    var mp = holesFor(m, it, seed); paint(buf, mp, R);
    if (cat === 'cords') for (var cy = sy + 20; cy <= hemY; cy++) for (var cx = 0; cx < DW; cx += 2) if (interior(mp, cx, cy)) buf[cy * DW + cx] = mixi(buf[cy * DW + cx], R[4], 0.5);
    hline(buf, mp, sy + 19, 0, DW - 1, R[3], true);
    if (cat === 'sweats') { for (var bx = 0; bx < DW; bx += 2) if (interior(mp, bx, sy + 18)) buf[(sy + 18) * DW + bx] = R[3]; px(buf, CX - 2, sy + 20, 0xeeeae0); px(buf, CX + 1, sy + 20, 0xeeeae0); px(buf, CX - 2, sy + 21, 0xd8d3c6); px(buf, CX + 1, sy + 21, 0xd8d3c6); hline(buf, mp, ank - 2, 0, DW - 1, R[3], true); }
    else {
      if (cat === 'jeans' || cat === 'shorts') px(buf, CX - 1, sy + 18, 0xd8b04a);
      vline(buf, mp, CX - 1, sy + 20, cr - 2, R[3], true); px(buf, CX - 2, cr - 1, R[3]);
      var pk = [[CX - Gm.hip + 1, sy + 20], [CX - Gm.hip + 2, sy + 21], [CX - Gm.hip + 3, sy + 22], [CX - Gm.hip + 4, sy + 22]];
      stampIn(buf, mp, mirrorPx(pk), R[3]);
      for (var ly = cr + 1; ly < hemY; ly++) { var l = outer(ly); if (interior(mp, l + 1, ly)) buf[ly * DW + l + 1] = cat === 'chinos' || cat === 'trousers' ? buf[ly * DW + l + 1] : R[1]; if (cat === 'chinos' || cat === 'trousers') { var mid = Math.round((l + CX - 2) / 2); if (interior(mp, mid, ly)) buf[ly * DW + mid] = R[1]; if (interior(mp, DW - 1 - mid, ly)) buf[ly * DW + DW - 1 - mid] = R[1]; } }
      if (cat !== 'chinos' && cat !== 'trousers') hline(buf, mp, hemY - 1, 0, DW - 1, R[1], true);
    }
    if (cat === 'overalls' && false) return;
    drips(buf, mp, it, seed);
  }
  function overallBib(buf, it, Gm) {
    var R = garmentRamp(it), sy = Gm.sy, m = M();
    rect(m, CX - 5, sy + 7, CX + 4, sy + 18);
    var s = M(); rect(s, CX - 7, sy, CX - 6, sy + 7); mirror(s); mor(m, s);
    paint(buf, m, R);
    px(buf, CX - 6, sy + 7, 0xd8b04a); px(buf, CX + 5, sy + 7, 0xd8b04a);
    hline(buf, m, sy + 9, CX - 3, CX + 2, R[4], true); vline(buf, m, CX - 3, sy + 10, sy + 12, R[3], true); vline(buf, m, CX + 2, sy + 10, sy + 12, R[3], true); hline(buf, m, sy + 13, CX - 2, CX + 1, R[3], true);
  }
  function underBottom(buf, it, Gm, penis, seed) {
    var cat = it.cat, R = garmentRamp(it), sy = Gm.sy, cr = Gm.cr, m = M(), body = M(), y, x;
    for (var r = 0; r <= 27; r++) sym(body, sy + r, Gm.tw(r));
    for (y = cr - 1; y <= Gm.ank; y++) span(body, y, Gm.legOuter(y), y <= cr ? CX - 1 : CX - 2);
    mirror(body);
    if (cat === 'boxers') {
      m = pantsMask(Gm, 1, cr + 8, function (yy) { return Gm.legOuter(yy) - 1; }, false); for (y = 0; y < sy + 19; y++) for (x = 0; x < DW; x++) mc(m, x, y);
      var mb = holesFor(m, it, seed); paint(buf, mb, R); pattern(buf, mb, R, 'plaid', Gm); hline(buf, mb, sy + 21, 0, DW - 1, R[4], true); vline(buf, mb, CX - 1, sy + 22, cr - 1, R[4], true); drips(buf, mb, it, seed); return;
    }
    if (cat === 'diaper' || cat === 'pullup') {
      var puff = cat === 'diaper' ? 1 + Math.floor(num(it.bulk, 2) / 2) : 0, low = cr + 3 + (cat === 'diaper' ? Math.floor(num(it.bulk, 2) / 2) : 0) + (num(it.fill, 0) >= 0.85 ? 1 : 0);
      for (y = sy + 16; y <= low; y++) {
        var hw = Math.max(Gm.tw(y - sy), Gm.hip) + puff;
        if (y >= cr - 2) { var k = y - (cr - 2); var l = Math.round(CX - hw + k * 1.6); if (l <= CX - 3) span(m, y, l, CX - 1); }
        else sym(m, y, hw);
      }
      mirror(m);
      var md = holesFor(m, it, seed); paint(buf, md, R);
      hline(buf, md, sy + 17, 0, DW - 1, R[3], true);
      for (y = cr - 1; y <= low; y++) for (x = 0; x < CX; x++) if (mg(md, x, y) && !mg(md, x - 1, y)) { if (interior(md, x + 1, y) && y % 2 === 0) { px(buf, x + 1, y, R[0]); px(buf, DW - 2 - x, y, R[0]); } break; }
      if (cat === 'diaper') { var hw2 = Math.max(Gm.tw(17), Gm.hip) + puff; [[CX - hw2 + 1, sy + 18], [CX - hw2 + 2, sy + 18], [CX - hw2 + 1, sy + 19], [CX - hw2 + 2, sy + 19]].forEach(function (q) { px(buf, q[0], q[1], 0x9cc3e6); px(buf, DW - 1 - q[0], q[1], 0x9cc3e6); }); }
      else { vline(buf, md, CX - Gm.hip + 1, sy + 18, cr - 3, R[3], true); vline(buf, md, CX + Gm.hip - 2, sy + 18, cr - 3, R[3], true); }
      return;
    }
    // briefs (trunk/brief cut when the fit flag says so) or panties (higher leg cut)
    var top = sy + 20 + (penis ? 0 : 1), bot = cr + (penis ? 3 : 2);
    for (y = top; y <= bot; y++) {
      if (y < cr - 2 || (penis && y < cr)) { for (x = 0; x < CX; x++) if (mg(body, x, y)) ms(m, x, y); }
      else { var kk = y - (penis ? cr : cr - 2), lft = Math.round(CX - Gm.hip + 1 + kk * (penis ? 1.3 : 1.7)); if (lft <= CX - 2) span(m, y, lft, CX - 1); }
    }
    mirror(m); mand(m, dilate(body, 1));
    var mu = holesFor(m, it, seed); paint(buf, mu, R);
    hline(buf, mu, top + 1, 0, DW - 1, R[3], true);
    if (penis) { vline(buf, mu, CX - 4, top + 3, cr - 1, R[3], true); vline(buf, mu, CX + 3, top + 3, cr - 1, R[3], true); hline(buf, mu, cr, CX - 3, CX + 2, R[3], true); }
    else if (/lace|seamless/.test(it.kind + ' ' + it.pat)) for (x = 0; x < DW; x += 2) if (mg(mu, x, top)) px(buf, x, top, R[0]);
    drips(buf, mu, it, seed);
  }
  function footMask(Gm, top, low) {
    var m = M(), ank = Gm.ank, f = Gm.feet;
    for (var y = top; y <= f; y++) {
      var l, r = CX - 2;
      if (y < ank - 1) l = Gm.legOuter(y) - 1;
      else if (y === ank - 1) l = CX - 7; else if (y <= ank + 1) l = CX - 8; else if (y < f) l = CX - 9; else { l = CX - 8; r = CX - 3; }
      if (low && y === f) { l = CX - 8; r = CX - 3; }
      span(m, y, l, r);
    }
    return mirror(m);
  }
  function drawShoes(buf, it, Gm, phase) {
    var cat = it.cat, R = garmentRamp(it), ank = Gm.ank, f = Gm.feet, m, sole;
    if (phase === 'early' && cat === 'boots') return; if (phase === 'late' && cat !== 'boots') return;
    if (cat === 'sandals') {
      m = M(); span(m, ank + 1, CX - 8, CX - 2); span(m, ank + 3, CX - 9, CX - 2); mirror(m); paint(buf, m, R, { hl: false });
      sole = M(); span(sole, f, CX - 9, CX - 2); mirror(sole); paint(buf, sole, ramp('#6b4a30'), { flat: true }); return;
    }
    if (cat === 'flats' || cat === 'loafers') {
      m = footMask(Gm, cat === 'loafers' ? ank + 1 : ank + 2, true); paint(buf, m, R);
      if (cat === 'loafers') { hline(buf, m, ank + 2, CX - 7, CX - 4, R[3], true); hline(buf, m, ank + 2, CX + 3, CX + 6, R[3], true); }
      else { px(buf, CX - 5, ank + 2, R[0]); px(buf, CX + 4, ank + 2, R[0]); }
      return;
    }
    if (cat === 'socks') { m = footMask(Gm, ank - 3); paint(buf, m, R); return; }
    m = footMask(Gm, cat === 'boots' ? ank - 7 : ank - 1);
    paint(buf, holesFor(m, it, 'shoe'), R);
    sole = M(); for (var y = (cat === 'boots' ? f : f - 1); y <= f; y++) for (var x = 0; x < DW; x++) if (mg(m, x, y)) ms(sole, x, y);
    paint(buf, sole, ramp(cat === 'boots' ? '#2b2522' : '#ece8de'), { hl: false });
    if (cat === 'sneakers') { [[CX - 6, ank], [CX - 4, ank], [CX - 5, ank + 1]].forEach(function (q) { px(buf, q[0], q[1], 0xf4f1ea); px(buf, DW - 1 - q[0], q[1], 0xf4f1ea); }); hline(buf, m, ank + 3, CX - 8, CX - 7, R[0], true); hline(buf, m, ank + 3, CX + 6, CX + 7, R[0], true); }
    if (cat === 'boots') { for (var ey = ank - 5; ey <= ank; ey += 2) { px(buf, CX - 5, ey, R[0]); px(buf, CX + 4, ey, R[0]); } hline(buf, m, ank - 6, 0, DW - 1, R[1], true); }
    drips(buf, m, it, 'shoe');
  }
  function drawOuter(buf, it, Gm, seed) {
    var cat = it.cat, R = garmentRamp(it), sy = Gm.sy, cr = Gm.cr, e = 2 + bagE(it), m = M(), r1 = 22, r, op;
    var longC = cat === 'coat' || cat === 'trench' || cat === 'raincoat';
    if (longC) r1 = cr + (cat === 'raincoat' ? 10 : 12) - sy; else if (cat === 'cardigan') r1 = 23; else if (cat === 'puffer') { r1 = 25; e = 3; }
    for (r = 0; r <= r1; r++) {
      var hw = r <= 27 ? Gm.tw(r) + e + (r >= 3 && r <= 9 ? Gm.bustW : 0) : Gm.hip + e + Math.round((r - 27) * 0.22);
      if (r === 0) hw = Gm.tw(0) + 2;
      if (cat === 'puffer' && r >= r1 - 1) hw -= 1;
      sym(m, sy + r, hw);
    }
    var closed = cat === 'trench' || cat === 'puffer' || cat === 'raincoat';
    for (r = 0; r <= r1; r++) {
      if (closed) op = r < 6 && cat === 'trench' ? Math.round((6 - r) * 0.6) : 0;
      else if (cat === 'cardigan') op = r < 11 ? Math.round(2 + (11 - r) * 0.45) : 2;
      else if (cat === 'coat') op = r < 9 ? Math.round(2 + (9 - r) * 0.5) : 1;
      else op = r < 7 ? Math.round(3 + (7 - r) * 0.45) : 3;
      if (op > 0) for (var x = CX - op; x <= CX - 1 + op; x++) mc(m, x, sy + r);
    }
    var mm = holesFor(m, it, seed); paint(buf, mm, R);
    pattern(buf, mm, R, it.pat, Gm);
    if (cat === 'puffer') { for (var qy = sy + 4; qy < sy + r1; qy += 4) { hline(buf, mm, qy, 0, DW - 1, R[3], true); hline(buf, mm, qy - 2, 0, DW - 1, R[1], true); } vline(buf, mm, CX - 1, sy + 1, sy + r1 - 1, R[4], true); px(buf, CX - 1, sy + 2, R[0]);
      var col = M(); rect(col, CX - 5, Gm.hT + 31, CX + 4, sy + 1); paint(buf, col, R); }
    if (cat === 'raincoat') { for (var ty = sy + 5; ty < sy + r1 - 2; ty += 5) { px(buf, CX - 2, ty, R[0]); px(buf, CX - 1, ty, R[0]); px(buf, CX, ty, R[4]); } vline(buf, mm, CX - 1, sy + 2, sy + r1 - 1, R[3], true);
      var rim = M(); for (var ry = sy - 2; ry <= sy + 1; ry++) sym(rim, ry, 7); rect(rim, CX - 3, sy - 2, CX + 2, sy); for (var ix = CX - 3; ix <= CX + 2; ix++) for (var iy = sy - 2; iy <= sy; iy++) mc(rim, ix, iy); paint(buf, rim, rampMul(R, 0.92));
      for (var gy = sy + 3; gy < sy + r1; gy += 7) px(buf, CX - Gm.tw(Math.min(27, gy - sy)) - e + 2, gy, R[0]); }
    if (cat === 'trench') { hline(buf, mm, sy + 14, 0, DW - 1, R[4], true); hline(buf, mm, sy + 15, 0, DW - 1, R[3], true); px(buf, CX - 1, sy + 14, 0xc9a24a); px(buf, CX, sy + 14, 0xc9a24a); px(buf, CX - 1, sy + 15, 0xa8862e); px(buf, CX, sy + 15, 0xa8862e);
      [sy + 7, sy + 11].forEach(function (by) { px(buf, CX - 4, by, R[4]); px(buf, CX + 3, by, R[4]); }); vline(buf, mm, CX - 1, sy + 20, sy + r1 - 1, R[4], true); vline(buf, mm, CX + 1, sy + 7, sy + 13, R[3], true); }
    if (!closed) {
      // lapel / front edge highlight, buttons, pockets
      for (r = 1; r <= 7; r++) { var opr = cat === 'cardigan' ? Math.round(2 + (11 - r) * 0.45) : cat === 'coat' ? Math.round(2 + (9 - r) * 0.5) : Math.round(3 + (7 - r) * 0.45), ex = CX - opr - 1; if (interior(mm, ex, sy + r) || mg(mm, ex, sy + r)) { px(buf, ex - 1, sy + r, R[0]); px(buf, DW - ex, sy + r, R[1]); } }
      if (cat === 'denim') { [sy + 8, sy + 13, sy + 18].forEach(function (by) { px(buf, CX - 5, by, 0xd8b04a); }); hline(buf, mm, sy + 6, CX - 9, CX - 6, R[4], true); hline(buf, mm, sy + 6, CX + 5, CX + 8, R[4], true); vline(buf, mm, CX - 8, sy + 7, sy + r1 - 2, R[3], true); vline(buf, mm, CX + 7, sy + 7, sy + r1 - 2, R[3], true); hline(buf, mm, sy + r1 - 2, 0, DW - 1, R[3], true); }
      if (cat === 'cardigan') { for (var cb = sy + 11; cb < sy + r1 - 1; cb += 4) px(buf, CX - 4, cb, 0xf2ead0); for (var rbx = 0; rbx < DW; rbx += 2) if (interior(mm, rbx, sy + r1 - 1)) buf[(sy + r1 - 1) * DW + rbx] = R[3]; }
      if (cat === 'jacket') { hline(buf, mm, sy + 17, CX - 11, CX - 7, R[4], true); vline(buf, mm, CX - 11, sy + 18, sy + 20, R[3], true); vline(buf, mm, CX - 7, sy + 18, sy + 20, R[3], true); hline(buf, mm, sy + 21, CX - 10, CX - 8, R[3], true); }
      if (cat === 'coat') { [sy + 9, sy + 14, sy + 19].forEach(function (by) { px(buf, CX + 2, by, R[0]); }); hline(buf, mm, sy + 21, CX - 11, CX - 7, R[4], true); hline(buf, mm, sy + 21, CX + 6, CX + 10, R[4], true); }
    }
    drips(buf, mm, it, seed);
    return { t: 0.96, x: 1.25 + it.bag * 0.15 + (cat === 'puffer' ? 0.6 : 0), cuff: 1, R: R, it: it, quilt: cat === 'puffer' };
  }
  function drawSleeve(buf, P, sl, side) {
    var m = armMask(P, 0, sl.t, sl.x), mm = holesFor(m, sl.it, 'sleeve' + side);
    paint(buf, mm, sl.R);
    if (sl.it.pat === 'plaid' || sl.it.pat === 'cats' || sl.it.pat === 'floral' || sl.it.pat === 'stripe') pattern(buf, mm, sl.R, sl.it.pat, { sy: 0 });
    if (sl.cuff) { var c = armMask(P, Math.max(0, sl.t - 0.07), sl.t, sl.x - 0.05); mand(c, mm); for (var i = 0; i < c.length; i++) if (c[i] && buf[i] !== sl.R[5]) buf[i] = sl.R[3]; }
    if (sl.quilt) for (var q = 0.2; q < sl.t; q += 0.22) { var ring = armMask(P, q, q + 0.02, sl.x - 0.2); mand(ring, mm); for (var j = 0; j < ring.length; j++) if (ring[j] && buf[j] !== sl.R[5]) buf[j] = sl.R[3]; }
    drips(buf, mm, sl.it, 'sl' + side);
  }

  /* ---------------- accessories ---------------- */
  function drawHat(buf, it, Gm) {
    var R = garmentRamp(it), hT = Gm.hT, m, cat = it.kind || it.cat;
    if (cat === 'beanie') {
      m = capMask(hT); m = dilate(m, 1); rowsOnly(m, 0, hT + 8); paint(buf, m, R);
      for (var x = 0; x < DW; x += 2) for (var y = hT + 6; y <= hT + 7; y++) if (interior(m, x, y)) buf[y * DW + x] = R[3];
      hline(buf, m, hT + 5, 0, DW - 1, R[4], true);
      var pom = M(); disc(pom, CX, hT - 4.5, 3.3); paint(buf, pom, ramp(mixi(hex2i(it.col), 0xffffff, 0.25)));
    } else if (cat === 'cap') {
      m = capMask(hT); rowsOnly(m, 0, hT + 7); paint(buf, m, R);
      vline(buf, m, CX - 7, hT - 1, hT + 6, R[3], true); vline(buf, m, CX + 6, hT - 1, hT + 6, R[3], true); px(buf, CX - 1, hT - 3, R[0]); px(buf, CX, hT - 3, R[0]);
      var br = M(); sym(br, hT + 7, 18); sym(br, hT + 8, 18); sym(br, hT + 9, 16); paint(buf, br, rampMul(R, 0.9)); hline(buf, br, hT + 8, 0, DW - 1, R[4], true);
    } else if (cat === 'sunhat') {
      var brim = M(); ell(brim, CX, hT + 5.5, 25.5, 3.8); paint(buf, brim, R);
      m = M(); ell(m, CX, hT + 2, 12.5, 7.5); rowsOnly(m, 0, hT + 5); paint(buf, m, R);
      for (var yy = hT - 5; yy <= hT + 8; yy++) for (var xx = 0; xx < DW; xx++) if ((interior(m, xx, yy) || interior(brim, xx, yy)) && (xx + yy * 2) % 4 === 0) buf[yy * DW + xx] = R[3];
      var rib = M(); span(rib, hT + 3, CX - 12, CX + 11); span(rib, hT + 4, CX - 12, CX + 11); mand(rib, m); paint(buf, rib, ramp('#8a5a32'), { open: 'lr' });
    }
  }
  function drawGlasses(buf, it, Gm) {
    var hT = Gm.hT, fc = ramp(it.col), dark = (it.kind || it.cat) === 'sunglasses';
    [20.5, DW - 20.5].forEach(function (cx, i) {
      var o = M(), inn = M(); ell(o, cx, hT + 20.5, 4.7, 4.1); ell(inn, cx, hT + 20.5, 3.7, 3.1);
      if (dark) { for (var k = 0; k < inn.length; k++) if (inn[k]) buf[k] = 0x24252c; px(buf, cx - 2, hT + 19, 0x8a8fa0); px(buf, cx - 1, hT + 18, 0x8a8fa0); }
      else { px(buf, cx - 2, hT + 18, mixi(buf[(hT + 18) * DW + Math.round(cx - 2)] < 0 ? 0xffffff : buf[(hT + 18) * DW + Math.round(cx - 2)], 0xffffff, 0.55)); }
      msub(o, inn); overlay(buf, o, fc[i ? 3 : 2]);
    });
    hline(buf, null, hT + 19, 25, 30, fc[2]); hline(buf, null, hT + 19, 12, 15, fc[3]); hline(buf, null, hT + 19, 40, 43, fc[3]);
  }
  function drawEarrings(buf, it, Gm) {
    var hT = Gm.hT, c = hex2i(it.col), hi = mixi(c, 0xffffff, 0.5);
    if ((it.kind || it.cat) === 'hoops') { [[10, 25], [12, 25], [10, 26], [12, 26], [11, 27]].forEach(function (q) { px(buf, q[0], q[1] - 25 + hT + 25, c); px(buf, DW - 1 - q[0], q[1] - 25 + hT + 25, c); }); px(buf, 10, hT + 25, hi); }
    else { px(buf, 11, hT + 24, hi); px(buf, DW - 12, hT + 24, hi); }
  }
  function drawScarf(buf, it, Gm) {
    var R = garmentRamp(it), sy = Gm.sy, m = M();
    sym(m, sy - 3, 5); sym(m, sy - 2, 7); sym(m, sy - 1, 7); sym(m, sy, 7); sym(m, sy + 1, 7); sym(m, sy + 2, 6);
    paint(buf, m, R); if (it.pat === 'plaid' || /plaid/.test(it.col)) pattern(buf, m, R, 'plaid', Gm);
    hline(buf, m, sy, CX - 6, CX + 5, R[3], true);
    var t = M(); rect(t, CX + 2, sy + 1, CX + 6, sy + 13); rect(t, CX + 3, sy + 14, CX + 6, sy + 14); paint(buf, t, R); if (it.pat === 'plaid') pattern(buf, t, R, 'plaid', Gm);
    for (var x = CX + 2; x <= CX + 6; x += 2) px(buf, x, sy + 15, R[3]);
    var knot = M(); ell(knot, CX + 4, sy + 1.5, 2.5, 2); paint(buf, knot, rampMul(R, 0.92));
  }

  /* ---------------- face ---------------- */
  function eyeMap(cfg, blink) {
    var dem = EYE[cfg.dem] ? cfg.dem : 'gentle', base = EYE[dem].slice(), h = base.length, k, i;
    if (blink || cfg.t.happyEyes) {
      var cl = []; for (i = 0; i < h; i++) cl.push('.......');
      if (cfg.t.happyEyes) { cl[h - 3] = '..LLL..'; cl[h - 2] = '.L...L.'; }
      else { cl[h - 3] = 'L......'; cl[h - 2] = '.LLLLL.'; cl[h - 1] = '..lll..'; }
      return cl;
    }
    if (cfg.t.tired && dem !== 'aloof') {
      for (k = 0; k < h; k++) if (base[k].indexOf('L') >= 0) break;
      var drop = dem === 'foxy' ? 1 : 2;
      for (i = 0; i < Math.min(h - 2, k + drop); i++) base[i] = '.......';
      if (k + drop < h - 1) base[k + drop] = base[k + drop].replace(/[^.]/g, 'L');
      base[h - 1] = base[h - 1].replace(/l/g, 'S');
    }
    return base;
  }
  function browPx(cfg, Gm) {
    var br = (cfg.t.stressed || cfg.t.upset || cfg.t.cold) ? BROW.worried : (BROW[cfg.dem] || BROW.gentle), by = Gm.hT + 14 + (cfg.t.tired ? 1 : 0), out = [];
    br.forEach(function (q) { out.push([17 + q[0], by + q[1]]); out.push([DW - 1 - (17 + q[0]), by + q[1]]); });
    return out;
  }
  function drawFace(buf, cfg, Gm, blink, skinR) {
    var hT = Gm.hT, FR = skinR('face'), iris = ramp(cfg.eye), lash = mixi(ramp(cfg.hair.col)[5], 0x1c1018, 0.6);
    var map = eyeMap(cfg, blink), h = map.length, EB = hT + 23, x0 = 17;
    var colr = { L: lash, l: FR[4], W: 0xf8f4f0, I: iris[2], D: iris[4], i: iris[0], P: mixi(iris[5], 0x101018, 0.5), H: 0xffffff, h: mixi(0xffffff, iris[1], 0.45), S: FR[3] };
    if (cfg.mk && cfg.mk.eye) { var ey = -1; for (var r0 = 0; r0 < h; r0++) if (map[r0].indexOf('L') >= 0) { ey = r0; break; } if (ey >= 0) for (var c0 = 0; c0 < 4; c0++) { var c1 = hex2i(cfg.mk.eye); px(buf, x0 + c0, EB - h + ey, mixi(FR[2], c1, 0.6)); px(buf, DW - 1 - (x0 + c0), EB - h + ey, mixi(FR[2], c1, 0.6)); } }
    for (var r = 0; r < h; r++) for (var c = 0; c < 7; c++) {
      var ch = map[r].charAt(c); if (ch === '.') continue;
      var y = EB - (h - 1) + r, col = colr[ch]; if (col == null) continue;
      px(buf, x0 + c, y, col); px(buf, DW - 1 - (x0 + c), y, col);
    }
    if (cfg.t.tired && !blink) { hline(buf, null, EB + 1, x0 + 1, x0 + 4, FR[3]); hline(buf, null, EB + 1, DW - 1 - (x0 + 4), DW - 1 - (x0 + 1), FR[3]); }
    // brows
    var bc = mixi(ramp(cfg.hair.col)[4], FR[5], 0.25);
    browPx(cfg, Gm).forEach(function (q) { px(buf, q[0], q[1], bc); });
    // nose
    px(buf, 27, hT + 25, FR[3]);
    // mouth
    var mt = cfg.t.upset ? 'wobble' : cfg.t.stressed ? 'frown' : cfg.t.blush >= 2 ? 'open' : cfg.t.cold ? 'wobble' : cfg.t.tired ? 'neutral' : cfg.t.happy ? 'big' :
      ({ gentle: 'smile', sweet: 'big', catty: 'cat', aloof: 'neutral', foxy: 'smirk' }[cfg.dem] || 'smile');
    var lip = cfg.mk && cfg.mk.lip ? hex2i(cfg.mk.lip) : null, mline = lip != null ? mixi(lip, FR[5], 0.25) : mixi(FR[5], 0x7a2c34, 0.5);
    MOUTH[mt].forEach(function (q) { px(buf, q[0], hT + 27 + q[1], q[2] === 'm' ? mline : q[2] === 't' ? 0xe0707a : 0x5a1e26); });
    // freckles
    if (cfg.freckles) [[14, 24], [16, 25], [18, 24], [15, 26], [17, 23]].forEach(function (q) { px(buf, q[0], hT + q[1], FR[3]); px(buf, DW - 1 - q[0], hT + q[1], FR[3]); });
    // blush / sunburn / cold
    var bl = cfg.t.blush || 0, mb = cfg.mk && cfg.mk.blush ? hex2i(cfg.mk.blush) : null;
    if (bl || mb != null || cfg.t.sunburn || cfg.t.cold) {
      var bcol = cfg.t.sunburn ? 0xd9573f : cfg.t.cold ? 0xe07a8a : bl ? 0xf06d86 : mb, t = cfg.t.sunburn ? 0.4 : bl >= 2 ? 0.5 : 0.32;
      for (var yy = hT + 24; yy <= hT + 25; yy++) for (var xx = 14; xx <= 19; xx++) {
        var edge = xx === 14 || xx === 19; if (edge && yy === hT + 25) continue;
        [xx, DW - 1 - xx].forEach(function (X) { var i = yy * DW + X; if (buf[i] >= 0) buf[i] = mixi(buf[i], bcol, edge ? t * 0.6 : t); });
      }
      if (bl >= 2) [[15, 25], [16, 24], [17, 25], [18, 24]].forEach(function (q) { px(buf, q[0], hT + q[1], mixi(FR[3], 0xd0405a, 0.5)); px(buf, DW - 1 - q[0], hT + q[1], mixi(FR[3], 0xd0405a, 0.5)); });
      if (cfg.t.sunburn || cfg.t.cold) { px(buf, 27, hT + 25, mixi(FR[3], 0xd9573f, 0.5)); px(buf, 28, hT + 25, mixi(FR[2], 0xd9573f, 0.3)); }
    }
    if (cfg.t.stressed || cfg.t.upset) { var dm = M(); px(dm, 0, 0, 0); ell(dm, 41.5, hT + 20.5, 1.3, 1.9); ms(dm, 41, hT + 18); paint(buf, dm, ramp('#a9d6f2'), { hl: false }); px(buf, 41, hT + 20, 0xffffff); }
    if (cfg.t.upset && !blink) { px(buf, 23, hT + 24, 0x9fd0f0); px(buf, 23, hT + 25, 0x7fb6e0); }
  }

  /* ---------------- main draw ---------------- */
  function draw(cfg, blink) {
    var buf = Buf(), Gm = geo(cfg), sy = Gm.sy, hT = Gm.hT, cr = Gm.cr, o = cfg.outfit || {}, mann = cfg.mann, t = cfg.t || {};
    var skinI = hex2i(cfg.skin), rc = {};
    function skinR(region) {
      if (rc[region]) return rc[region];
      var base = skinI, tv = cfg.tan ? num(cfg.tan[region], 0) : 0;
      if (tv) base = mixi(base, mixi(base, 0x5a3418, 0.55), tv / 100 * 0.6);
      if (t.sunburn && (region === 'face' || region === 'shoulders' || region === 'neck')) base = mixi(base, 0xd9573f, 0.18);
      if (t.cold) base = mixi(base, 0x8aa0d0, 0.06);
      rc[region] = mann ? ramp(base, { soft: true }) : skinRamp(base);
      return rc[region];
    }
    function bodyRegion(x, y) {
      if (y < sy - 3) return skinR('face'); if (y < sy + 1) return skinR('neck'); if (y < sy + 3) return skinR('shoulders');
      if (y < sy + 12) return skinR('chest'); if (y < sy + 19) return skinR('belly'); if (y < cr + 3) return skinR('hips');
      if (y < cr + 15) return skinR('thigh'); if (y <= Gm.ank) return skinR('shin'); return skinR('foot');
    }
    function armRegion(x, y) { return y < sy + 4 ? skinR('shoulders') : y < sy + 12 ? skinR('upperArm') : skinR('forearm'); }
    var hairI = hex2i(cfg.hair ? cfg.hair.col : '#5a3a22');
    if (cfg.hair && cfg.hair.faded) hairI = mixi(hairI, 0xc8bfae, 0.25);
    var HR = ramp(hairI); if (cfg.hair && cfg.hair.wet) HR = rampMix(rampMul(HR, 0.8), 0x203050, 0.06);
    var rootR = cfg.hair && cfg.hair.roots ? ramp(cfg.hair.roots) : null;
    var hairRp = rootR ? function (x, y) { return y <= hT + 1 + ((x * 7) % 3 === 0 ? 1 : 0) ? rootR : HR; } : HR;
    var end = cfg.hair ? hairEndY(cfg.hair.len, hT) : 0, sides = cfg.hair ? cfg.hair.sides : 'buzz', hr = rng(hashStr('hair' + (cfg.hair ? cfg.hair.len + sides : '')));
    var head = o.head && !mann ? o.head : (o.head || null);
    // --- 1. back layers
    if (!mann) {
      var bh = backHairMask(cfg, Gm, end, hr); if (count(bh)) paintHair(buf, bh, hairRp, Gm, { dark: true, strands: true, strandTop: hT + 20 });
      if (sides === 'ponytail') { var pt = M(); var pend = Math.max(end, hT + 26); line(pt, 41, hT + 5, 47, hT + 13, 3.8, 3.6); line(pt, 47, hT + 13, 48.5, hT + 24, 3.6, 3); line(pt, 48.5, hT + 24, 47, pend, 3, 1.3); paintHair(buf, pt, hairRp, Gm, { ring: false, strands: true }); var bd = M(); ell(bd, 42.5, hT + 6.5, 1.8, 2.2); paint(buf, bd, ramp('#c75a7a')); }
      if (sides === 'pigtails') { var pg = M(), pe = Math.max(end, hT + 26); line(pg, 10, hT + 11, 6.5, hT + 18, 3.6, 3.5); line(pg, 6.5, hT + 18, 6, hT + 28, 3.5, 2.8); line(pg, 6, hT + 28, 8, pe, 2.8, 1.2); mirror(pg); paintHair(buf, pg, hairRp, Gm, { ring: false, strands: true }); var tie = M(); ell(tie, 10.5, hT + 11, 1.6, 2); mirror(tie); paint(buf, tie, ramp('#c75a7a')); }
      if (sides === 'bun' && !(head && head.kind !== 'sunhat')) { var bn = M(); ell(bn, CX, hT - 3, 7, 5.5); paintHair(buf, bn, hairRp, Gm, { ring: false }); hline(buf, bn, hT - 1, CX - 4, CX + 3, HR[3], true); }
    }
    var hooded = (o.top && o.top.cat === 'hoodie' && !(o.outer && o.outer.cat !== 'cardigan' && o.outer.cat !== 'jacket' && o.outer.cat !== 'denim')) ? o.top : (o.outer && o.outer.cat === 'raincoat') ? o.outer : null;
    if (hooded) { var hd = M(); ell(hd, CX, sy - 3, hooded.cat === 'raincoat' ? 13 : 12, 6); paint(buf, hd, garmentRamp(hooded), { dark: true }); }
    if (!mann) { var gsh = M(); ell(gsh, CX, Gm.feet + 0.5, 13, 1.7); for (var gi = 0; gi < gsh.length; gi++) if (gsh[gi] && buf[gi] < 0) buf[gi] = -2; }
    // --- 2. body
    var body = M();
    for (var r = 0; r <= 27; r++) sym(body, sy + r, Gm.tw(r));
    for (var y = cr - 2; y <= Gm.ank; y++) span(body, y, Gm.legOuter(y), y <= cr ? CX - 1 : CX - 2);
    [[Gm.ank + 1, CX - 7, CX - 2], [Gm.ank + 2, CX - 8, CX - 2], [Gm.ank + 3, CX - 8, CX - 2], [Gm.feet, CX - 7, CX - 3]].forEach(function (q) { span(body, q[0], q[1], q[2]); });
    mirror(body);
    paint(buf, body, bodyRegion);
    if (!mann && Gm.bust > 0) bustShade(buf, body, skinR('chest'), Gm);
    if (!mann) { [CX - 7, CX - 5, CX - 3].forEach(function (x) { px(buf, x, Gm.feet - 1, skinR('foot')[3]); px(buf, DW - 1 - x, Gm.feet - 1, skinR('foot')[3]); }); px(buf, CX - 1, sy + 15, skinR('belly')[3]); }
    if (mann) { var pole = M(); rect(pole, CX - 1, cr + 2, CX, Gm.feet + 1); paint(buf, pole, ramp('#6b6f78'), { hl: false }); var base = M(); ell(base, CX, Gm.feet + 1.5, 10, 1.6); paint(buf, base, ramp('#55585f')); }
    var neck = M(); rect(neck, CX - 3, hT + 28, CX + 2, sy + 1); paint(buf, neck, skinR('neck'), { open: 'tb', dark: true });
    // --- 3-6. clothes on the torso/legs
    var bulge = !!(o.under_bottom && (o.under_bottom.cat === 'diaper') && (o._briefShows || num(o.under_bottom.bulk, 0) >= 3));
    if (o.under_bottom) underBottom(buf, o.under_bottom, Gm, cfg.penis, 'ub');
    var sleeves = [];
    if (o.under_top) { var s0 = drawTopLike(buf, o.under_top, Gm, 'ut'); if (s0) sleeves.push(s0); }
    if (o.shoes) drawShoes(buf, o.shoes, Gm, 'early');
    if (o.bottom) drawBottom(buf, o.bottom, Gm, bulge, 'bt');
    if (o.shoes) drawShoes(buf, o.shoes, Gm, 'late');
    if (o.outfit) { var s1 = drawTopLike(buf, o.outfit, Gm, 'of'); if (s1) sleeves.push(s1); }
    if (o.top) { var s2 = drawTopLike(buf, o.top, Gm, 'tp'); if (s2) sleeves.push(s2); }
    if (o.bottom && o.bottom.cat === 'overalls') overallBib(buf, o.bottom, Gm);
    if (o.outer) { var s3 = drawOuter(buf, o.outer, Gm, 'ot'); if (s3) sleeves.push(s3); }
    // --- 7. arms (in front of the torso), sleeves over them
    var pose = cfg.pose || 'down', PL = armPath(Gm, pose, false), PR = armPath(Gm, pose, true), sides2 = pose === 'hug' ? [['R', PR], ['L', PL]] : [['L', PL], ['R', PR]];
    sides2.forEach(function (sd) {
      var P = sd[1], am = armMask(P, 0, 1, 0); mor(am, handMask(P));
      paint(buf, am, armRegion);
      sleeves.forEach(function (sl) { drawSleeve(buf, P, sl, sd[0]); });
    });
    // --- 8. neck wear
    if (o.top && o.top.cat === 'turtle') turtleTube(buf, o.top, Gm);
    if (o.neck) drawScarf(buf, o.neck, Gm);
    // --- 9. head + face
    var earsShow = sides === 'tucked' || sides === 'ponytail' || sides === 'bun' || sides === 'pigtails' || sides === 'braids' || sides === 'buzz' || end < hT + 24;
    if (!mann && earsShow) { var ear = M(); ell(ear, 11.4, hT + 21.5, 2.3, 3.3); mirror(ear); paint(buf, ear, skinR('face')); px(buf, 11, hT + 21, skinR('face')[3]); px(buf, DW - 12, hT + 21, skinR('face')[3]); px(buf, 11, hT + 22, skinR('face')[3]); px(buf, DW - 12, hT + 22, skinR('face')[3]); }
    var hm = M(); for (var hr2 = 0; hr2 < HEAD.length; hr2++) sym(hm, hT + hr2, HEAD[hr2]);
    paint(buf, hm, skinR('face'));
    if (mann) { px(buf, CX - 1, hT + 27, skinR('face')[3]); px(buf, CX, hT + 27, skinR('face')[3]); }
    else drawFace(buf, cfg, Gm, blink, skinR);
    // --- 10. hair front
    if (!mann) {
      var buzz = sides === 'buzz' || cfg.hair.len < 2;
      var lk = lockMask(cfg, Gm, end); if (count(lk)) { mirror(lk); paintHair(buf, lk, hairRp, Gm, { ring: false, strands: true, strandTop: hT + 16 }); }
      if (sides === 'braids') {
        var be = Math.max(end, hT + 30);
        [false, true].forEach(function (rt) {
          var bm = M(); line(bm, 13, hT + 22, 14, be - 2, 2.6, 2.2); if (rt) bm = flipped(bm);
          paint(buf, bm, HR);
          for (var yb = hT + 23; yb < be - 2; yb++) { var ph = (yb - hT) % 3; for (var xb = 0; xb < DW; xb++) if (interior(bm, xb, yb)) { var lx = rt ? DW - 1 - xb : xb; if ((ph === 0 && lx <= 13) || (ph === 1 && lx === 14)) buf[yb * DW + xb] = HR[3]; else if (ph === 2 && lx === 12) buf[yb * DW + xb] = HR[1]; } }
          var tb = M(); ell(tb, rt ? DW - 14 : 14, be - 2, 1.8, 1.2); paint(buf, tb, ramp('#c75a7a'));
          var tuft = M(); ell(tuft, rt ? DW - 14 : 14, be, 1.6, 1.6); paint(buf, tuft, HR);
        });
      }
      if (o.face) drawGlasses(buf, o.face, Gm);
      var fh = frontHair(cfg, Gm, buzz);
      if (head) rowsOnly(fh, head.kind === 'sunhat' ? hT + 4 : hT + 5, DH);
      if (buzz) { var bR = ramp(mixi(hairI, skinI, 0.35)); paint(buf, fh, bR, { hl: false }); for (var bz = 0; bz < fh.length; bz++) if (fh[bz] && (bz % 2 === ((bz / DW) | 0) % 2) && interior(fh, bz % DW, (bz / DW) | 0)) buf[bz] = bR[3]; }
      else {
        paintHair(buf, fh, hairRp, Gm, {});
        // strands radiating from the crown down to each fringe lock tip
        fringeTips(cfg.hair.fringe).forEach(function (tp, ti) {
          var tx = tp[0], ty = hT + tp[1] - 1, sx = CX - 0.5 + (tx - CX + 0.5) * 0.3, sy0 = hT + 2;
          for (var q = 0; q <= 1; q += 0.04) { var lx = Math.round(sx + (tx - sx) * Math.pow(q, 1.4)), lyy = Math.round(sy0 + (ty - sy0) * q); if (lyy > hT + 6 && interior(fh, lx, lyy) && buf[lyy * DW + lx] !== HR[0]) buf[lyy * DW + lx] = (ti % 2 ? HR[3] : HR[4]); }
        });
        browPx(cfg, Gm).forEach(function (q) { if (mg(fh, q[0], q[1])) { var bi = q[1] * DW + q[0]; buf[bi] = mixi(buf[bi], HR[5], 0.55); } });
        if (cfg.hair.fringe === 'parted' || cfg.hair.fringe === 'curtain') vline(buf, fh, CX - 1, hT - 2, hT + 3, HR[4], true);
        if (cfg.hair.scruffy) [[CX - 6, hT - 4], [CX + 4, hT - 4], [CX + 5, hT - 5], [8, hT + 12]].forEach(function (q) { px(buf, q[0], q[1], HR[5]); });
      }
      if (cfg.hair.wet) { var dr = rng(7); for (var d = 0; d < 4; d++) { var dx2 = 12 + Math.floor(dr() * 32); px(buf, dx2, hT + fringeAt(cfg.hair.fringe, dx2 - 12, true) + 2, 0x9fd0f0); } px(buf, 12, Math.min(end, hT + 40) + 2, 0x9fd0f0); px(buf, DW - 13, Math.min(end, hT + 40) + 3, 0x8fc0e6); }
      if (head) drawHat(buf, head, Gm);
      if (o.ears) drawEarrings(buf, o.ears, Gm);
    } else {
      if (o.face) drawGlasses(buf, o.face, Gm);
      if (head) drawHat(buf, head, Gm);
      if (o.neck) { /* drawn above */ }
    }
    // --- 11. censor bars (always last). Chest bar when bare and there is a bust; lower bar whenever the lower half is bare.
    if (!mann && o._bareUpper && Gm.bust > 0) { var cu = M(); rect(cu, CX - Gm.chest - Gm.bustW, sy + 4, CX + Gm.chest + Gm.bustW - 1, sy + 9); overlay(buf, cu, 0x000000); }
    if (!mann && o._bareLower) { var cl = M(); rect(cl, CX - Gm.hip - 1, cr - 6, CX + Gm.hip, cr + 3); overlay(buf, cl, 0x000000); }
    return { buf: buf, Gm: Gm };
  }

  /* ---------------- sprite sheet ---------------- */
  function shifted(src, Gm, cold) {
    var out = new Int32Array(src.length), x, y; for (var i = 0; i < out.length; i++) out[i] = src[i];
    if (cold) { for (y = 0; y <= Gm.ank; y++) for (x = DW - 1; x >= 0; x--) out[y * DW + x] = x > 0 ? src[y * DW + x - 1] : -1; return out; }
    var cut = Gm.sy + 15;
    for (y = cut; y >= 0; y--) for (x = 0; x < DW; x++) out[y * DW + x] = y > 0 ? src[(y - 1) * DW + x] : -1;
    return out;
  }
  function toURL(frames) {
    var cv = document.createElement('canvas'); cv.width = DW * frames.length; cv.height = DH;
    var ctx = cv.getContext('2d'); if (!ctx) return '';
    var img = ctx.createImageData(cv.width, DH), d = img.data;
    frames.forEach(function (f, fi) {
      for (var y = 0; y < DH; y++) for (var x = 0; x < DW; x++) {
        var c = f[y * DW + x]; if (c === -1) continue; var j = (y * cv.width + fi * DW + x) * 4;
        if (c === -2) { d[j] = 10; d[j + 1] = 8; d[j + 2] = 16; d[j + 3] = 70; continue; }
        d[j] = (c >> 16) & 255; d[j + 1] = (c >> 8) & 255; d[j + 2] = c & 255; d[j + 3] = 255;
      }
    });
    ctx.putImageData(img, 0, 0);
    return cv.toDataURL('image/png');
  }
  function sheet(cfg) {
    var key = JSON.stringify(cfg);
    if (CACHE[key]) return CACHE[key];
    var a = draw(cfg, false), b = draw(cfg, true), cold = !!(cfg.t && cfg.t.cold);
    var res = { a: toURL([a.buf, shifted(a.buf, a.Gm, cold)]), b: toURL([b.buf, shifted(b.buf, b.Gm, cold)]), key: key };
    CACHE[key] = res; CACHE_KEYS.push(key);
    while (CACHE_KEYS.length > CACHE_MAX) delete CACHE[CACHE_KEYS.shift()];
    return res;
  }

  /* ---------------- public API ---------------- */
  var CSS = '.hb-doll{position:relative;display:inline-block;flex-shrink:0;vertical-align:top;image-rendering:pixelated;image-rendering:crisp-edges;background-repeat:no-repeat;background-position:0 0}' +
    '.hb-doll.hb-anim{animation:hbDollIdle 1.1s steps(2) infinite}' +
    '.hb-doll .hb-blink{position:absolute;left:0;top:0;width:100%;height:100%;background-repeat:no-repeat;background-position:0 0;image-rendering:pixelated;image-rendering:crisp-edges;opacity:0;animation:hbDollIdle 1.1s steps(2) infinite,hbDollBlink 4.4s step-end infinite}' +
    '@keyframes hbDollIdle{from{background-position:0 0}to{background-position:200% 0}}' +
    '@keyframes hbDollBlink{0%{opacity:0}92%{opacity:1}96%{opacity:0}}' +
    'html.hb-reduced-motion .hb-doll,html.hb-reduced-motion .hb-doll .hb-blink{animation:none!important}html.hb-reduced-motion .hb-doll .hb-blink{display:none}' +
    '#panel .hb-pdoll{float:left;margin:-6px 6px 2px -8px;line-height:0}#panel .hb-pdoll + .who{padding-top:4px}#panel .need,#panel #btn-char{clear:left}' +
    '@media(max-width:720px){#panel .hb-pdoll{margin:-4px 8px 2px -6px}}';
  function injectCSS() {
    if (typeof document === 'undefined' || document.getElementById('hb-doll-css')) return;
    var s = document.createElement('style'); s.id = 'hb-doll-css'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s);
  }
  function reduced() { var g = G_(); return !!(g && g.settings && g.settings.reducedMotion); }
  function describeDoll(p, opts) {
    if (!p || (opts && opts.mannequin)) return 'A plain grey mannequin' + (opts && opts.outfit && opts.outfit.length ? ' wearing ' + opts.outfit.map(function (id) { var d = catalog()[id]; return d ? d.name : id; }).join(', ') : '') + '.';
    try { if (window.Creation && Creation.describe) return Creation.describe(p); } catch (e) {}
    return (p.name || 'You');
  }
  /* html(player, {scale, outfit, mannequin, presentation, breastSize, frames, temps, pose}) -> HTML string */
  function html(p, opts) {
    opts = opts || {}; injectCSS();
    if (typeof document === 'undefined') return '';
    var cfg = resolve(p, opts), sh = sheet(cfg), S = Math.max(1, Math.round(num(opts.scale, 2)));
    var anim = opts.frames !== false && !reduced(), w = DW * S, h = DH * S;
    var st = 'width:' + w + 'px;height:' + h + 'px;background-image:url(' + sh.a + ');background-size:' + (w * 2) + 'px ' + h + 'px';
    var states = Object.keys(cfg.t || {}).join(' ');
    return '<div class="hb-doll' + (anim ? ' hb-anim' : '') + (opts.cls ? ' ' + esc(opts.cls) : '') + '" style="' + st + '" role="img" aria-label="' + esc(describeDoll(p, opts)) + '"' + (states ? ' data-states="' + esc(states) + '"' : '') + '>' +
      (anim ? '<div class="hb-blink" style="background-image:url(' + sh.b + ');background-size:' + (w * 2) + 'px ' + h + 'px"></div>' : '') + '</div>';
  }
  function render(el, p, opts) { if (typeof el === 'string') el = document.querySelector(el); if (el) el.innerHTML = html(p, opts); return el; }
  function panelHtml() {
    var g = G_(), s = g && g.state; if (!s || !s.creation || !s.creation.done || !s.creation.player) return '';
    try { return '<div class="hb-pdoll">' + html(s.creation.player, { scale: 2 }) + '</div>'; } catch (e) { return ''; }
  }
  /* extend the creator's colour lists so creation.js shows them too (skin tones 9, eye colours 13) */
  function extendCreationOptions() {
    var O = window.Creation && Creation.OPTIONS; if (!O) return;
    function merge(list, add) { if (!list) return; add.forEach(function (a, i) { if (!find(list, a[0])) { var at = Math.min(list.length, i); list.splice(at, 0, a.slice()); } }); }
    merge(O.skin, SKIN); merge(O.eyeColor, EYES);
  }

  var mod = {
    id: 'doll',
    init: function (state) {
      if (!state.doll || typeof state.doll !== 'object') state.doll = { temps: {} };
      if (!state.doll.temps) state.doll.temps = {};
      if (state.creation && state.creation.player) ensure(state.creation.player);
    },
    onTick: function (minutes, state) {
      var d = state && state.doll, now = nowMin();
      if (d && d.temps) Object.keys(d.temps).forEach(function (k) { if (!(d.temps[k] > now)) delete d.temps[k]; });
      var p = state && state.creation && state.creation.player;
      if (p && p.contacts && !(num(p.contacts.until, 0) > now)) p.contacts = null;
    },
    getOptions: function () { return { dialogue: [], actions: [], travel: [], other: [] }; }
  };

  var api = {
    VERSION: 3, W: DW, H: DH, OPTIONS: OPTIONS, PALETTE: { skin: SKIN, eyes: EYES, contacts: OPTIONS.contacts }, TEMPS: TEMP_NAMES, REGIONS: REGIONS,
    html: html, render: render, panelHtml: panelHtml,
    tan: tan, setTemp: setTemp, clearTemp: function (n) { return setTemp(n, 0); }, temp: tempOn, applyContacts: applyContacts,
    ensure: ensure, randomize: randomize, resolve: resolve, describe: describeDoll,
    sheet: function (p, opts) { return sheet(resolve(p, opts)); },
    clearCache: function () { CACHE = {}; CACHE_KEYS = []; },
    cacheSize: function () { return CACHE_KEYS.length; },
    module: mod
  };
  extendCreationOptions();
  function boot() {
    var g = G_();
    if (!g || !g.register) return setTimeout(boot, 20);
    g.doll = api;
    injectCSS();
    g.register(mod);
    if (g.addPanel) g.addPanel(panelHtml);
    if (g.on) {
      g.on('newDay', function () { var p = curPlayer(); if (p && p.tan > 0) tan(-1); });
      g.on('hairChanged', function (d) { var p = curPlayer(); if (!p || !d || d.what !== 'style') return; ensure(p); p.dollAuto.hairSides = true; p.dollAuto.hairFringe = true; ensure(p); });
    }
  }
  window.HBDoll = api;
  if (window.G) window.G.doll = api;
  boot();
})();
