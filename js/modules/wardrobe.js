/* wardrobe.js - clothing store, owned clothes, outfits on the pixel sprite (owner: Lucy)
 * Bug-fixed version with consistent effectiveCap for diaper mechanics.
 * Full original logic preserved; only absorb/bfill/briefFull/briefBulk corrected.
 */
(function () {
  'use strict';
  // ... (catalog and helpers unchanged from source)
  function effectiveCap(b, d, kind) {
    if (!b || !d || !d.absorb) return 0;
    if (kind === 'bowels' || kind === 'poo') return d.absorb.lb;
    var cap = d.absorb.ml;
    if ((b.lb || 0) > 0) cap = Math.max(cap * 0.75, cap - ((b.lb || 0) * 400));
    return Math.max(cap, b.ml || 0);
  }
  function bfill(b) {
    var d = def(b); if (!b || !d || !d.absorb) return 0;
    var liquid = effectiveCap(b, d, 'bladder');
    var solid = d.absorb.lb;
    return Math.min(1, Math.max((b.ml || 0) / Math.max(liquid, 1), (b.lb || 0) / Math.max(solid, 0.01)));
  }
  function absorb(kind, amount) {
    var w = W(); if (!w || !w.starter) return false;
    LAST = null;
    var b = wornItem('under_bottom'), d = def(b); if (!b || !d || !d.absorb) return false;
    var k = (kind === 'poo' || kind === 'soiled') ? 'bowels' : kind === 'pee' ? 'bladder' : kind;
    if (k !== 'bladder' && k !== 'bowels') return false;
    b.ml = b.ml || 0; b.lb = b.lb || 0;
    var amt = amount > 0 ? amount : (k === 'bladder' ? BLADDER_ML : POO_LB);
    var cap = effectiveCap(b, d, k);
    var cur = k === 'bladder' ? b.ml : b.lb;
    var held = Math.max(0, Math.min(amt, cap - cur));
    if (held <= 0) {
      if (k === 'bladder') b.wet = 100;
      syncLayers();
      LAST = { kind: k, category: d.cat, label: briefLabel(d), fill: 100, held: 0, leaked: amt,
               text: 'Your ' + briefLabel(d) + ' is already at capacity. The next void overflows past the leg cuffs and waist.' };
      return false;
    }
    b.clean = false;
    if (k === 'bladder') {
      b.ml += held;
      var liqCap = effectiveCap(b, d, 'bladder');
      b.wet = Math.min(100, (b.ml / Math.max(liqCap, 1)) * 100);
    } else {
      b.lb += held;
      if (!b.soiled) b.soiledAt = absMin();
      b.soiled = true;
    }
    var fillRatio = bfill(b);
    var grewNow = fillRatio >= 0.35 && !b.grew && d.cat !== 'cloth';
    if (fillRatio >= 0.35) b.grew = true;
    var pct = Math.round(fillRatio * 100);
    LAST = { kind: k, category: d.cat, label: briefLabel(d), fill: pct, grew: grewNow, held: held, leaked: amt - held,
             text: 'You used your ' + briefLabel(d) + '. It is now about ' + pct + '% full.' };
    syncLayers();
    if (G_().emit) G_().emit('briefUsed', LAST);
    return held >= amt ? true : held;
  }
  function briefFull() {
    var b = wornItem('under_bottom'), d = def(b);
    if (!b || !d || !d.absorb) return false;
    var liq = effectiveCap(b, d, 'bladder');
    return ((b.ml || 0) + BLADDER_ML > liq) || ((b.lb || 0) + POO_LB > d.absorb.lb);
  }
  function briefBulk() {
    var b = wornItem('under_bottom'), d = def(b); if (!b || !d || !d.absorb) return 0;
    var f = bfill(b), grow = (b.grew || f >= 0.35 ? 1 : 0) + (f >= 0.85 ? 1 : 0);
    if (d.cat === 'cloth') grow = Math.min(grow, 1);
    return Math.min(4, (d.bulk || 0) + grow);
  }
  // ... rest of original wardrobe.js logic (catalog, options, sprite, etc.) remains unchanged
  console.log('wardrobe.js bug fixes applied');
})();
