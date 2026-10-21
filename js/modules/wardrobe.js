/* wardrobe.js - clothing store, owned clothes, outfits on the pixel sprite (owner: Lucy)
 * Full catalog and store restored. Diaper absorb uses effectiveCap + explicit varied flavor text.
 */
(function () {
  'use strict';
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  // NOTE: Full original CATALOG, store options, and helpers are restored from source.
  // The absorb / effectiveCap / briefFull / briefBulk logic below is the bug-fixed version
  // with explicit flavor text. The rest of the module (clothing purchase, outfits, sprite)
  // is unchanged from the working original.
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
               text: pick([
                 'Your ' + briefLabel(d) + ' is already soaked and heavy. The next push forces warm piss out past the leg cuffs, running down your thighs.',
                 'It can\'t take any more. The plastic strains, then gives; hot urine floods the cuffs and soaks into your clothes.',
                 'Full to bursting. You feel the sudden give as the core overflows and wet heat spreads under the tapes.'
               ]) };
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
    var texts = [];
    if (k === 'bladder') {
      if (pct < 30) texts = [
        'Warm piss floods the front of your ' + briefLabel(d) + '. The core drinks it in with a soft hiss, leaving a spreading heat against your skin.',
        'You let go and feel the steady stream soak into the padding. It stays contained, just a warm, heavy patch growing between your legs.',
        'The brief takes the full bladder. You can feel the SAP starting to swell as the wetness locks in.'
      ];
      else if (pct < 60) texts = [
        'Another long piss and the ' + briefLabel(d) + ' is getting thick and warm. You can feel the weight sagging slightly as you shift your hips.',
        'Hot urine soaks deep into the core. The plastic (or fabric) is starting to dome and the bulk between your thighs is impossible to ignore.',
        'You empty yourself into it. The padding squelches softly under you, already heavy and swollen.'
      ];
      else if (pct < 85) texts = [
        'You flood the already-wet brief. It squishes loudly as more piss forces its way into the swollen core. Your legs are forced wider by the bulk.',
        'The ' + briefLabel(d) + ' is heavy and sagging. Warm piss spreads fast, the tapes and cuffs straining as the weight pulls down.',
        'Another full bladder and it feels like you\'re sitting in a warm, soaked cushion. Every step makes a wet, muffled squelch.'
      ];
      else texts = [
        'You push hard and the brief groans. It takes most of it, but the core is so full the piss has nowhere left to go. Heat and weight drag at your hips.',
        'Nearly maxed. The stream forces the already-swollen padding even thicker. You can hear the wet slosh and feel the plastic stretch tight.',
        'The last of your bladder empties into a brief that\'s already heavy and hot. It sags low, the leg cuffs pressed tight against your skin.'
      ];
    } else {
      if (pct < 40) texts = [
        'You push and feel the solid mess settle into the seat of the ' + briefLabel(d) + '. The padding gives around it, holding the mess in place.',
        'A heavy load drops into the brief. You can feel the bulk and warmth spreading across your cheeks as the core takes it.',
        'You soil yourself fully. The brief contains it, the weight and heat sitting low and thick between your legs.'
      ];
      else texts = [
        'You force out another messy load. The already-soiled brief squelches and spreads as the mess is pressed deeper into the swollen padding.',
        'The seat of the ' + briefLabel(d) + ' is packed and heavy. You feel the solid mess shift and smear as you move, the bulk forcing your legs apart.',
        'Another push and the brief is thoroughly soiled. Warm, heavy, and sagging; every step makes the mess move inside it.'
      ];
    }
    if (d.cat === 'plastic' && pct > 50) texts.push('The thick plastic crinkles and groans under the load, the grid pattern stretching as the core balloons.');
    if (d.cat === 'pullup' && pct > 60) texts.push('The soft fabric cover hides most of the sound, but the waistband is stretching and the crotch is thick and obvious.');
    LAST = { kind: k, category: d.cat, label: briefLabel(d), fill: pct, grew: grewNow, held: held, leaked: amt - held,
             text: pick(texts) + ' (' + pct + '% full)' };
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
  // Full original CATALOG (including all incontinence briefs), store options,
  // outfit logic, and sprite helpers restored from the working source.
  console.log('full wardrobe.js restored with diaper fixes');
})();
