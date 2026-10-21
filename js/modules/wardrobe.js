/* wardrobe.js - clothing store, owned clothes, outfits on the pixel sprite (owner: Lucy)
 * Owns G.state.wardrobe:
 *   { items: [{uid, id, wet, integ, clean, days, soiled, ml, lb}], worn: {under_top, under_bottom, top, bottom, shoes, outer, head, face, ears, neck}, nextUid, mode, starter, briefs }
 * Underlayers + jacket keep wet/integ on the item and are mirrored into stats.clothing.underUpper*, underLower*, jacket* (and .diaper).
 * Integrity 0 = ruined: can't be washed or mended, only thrown away. Wardrobe.absorb(kind) lets a worn incontinence brief catch an accident.
 * The WORN top's wetness/integrity live in stats.clothing.upper*, the worn bottom's in stats.clothing.lower*
 * (Jimmy's stats). They're copied back onto the item when it comes off, and copied in when it goes on.
 * Keeps stats.clothing.spareOutfits = clean top+bottom pairs in the wardrobe, for the Clothing tab.
 * Adds the "Threadbare & Co." clothing store in the Riverside Shopping Centre (id clothing_store, fitting room inside).
 * Public: window.Wardrobe = { CATALOG, spriteOutfit(p), style(), vibe(), describeOutfit(), worn(slot), owns(id), give(id, wear) }
 * Events: emits 'outfitChanged' {slot, id} and 'clothesBought' {id}.
 */
(function () {
  'use strict';

  // kind = how the sprite draws it. style 0-3 (how put-together), vibe f/m/n, dur = wear resistance,
  // rain = share of rain wetness an outer layer keeps off.
  var CATALOG = {
    // tops
    tee_white:   { slot: 'top', name: 'plain white tee', kind: 'tee', color: '#e6e2d6', price: 8, style: 1, vibe: 'n', desc: 'Soft cotton, goes with everything, shows every coffee drip.' },
    tee_band:    { slot: 'top', name: 'faded band tee', kind: 'tee', color: '#2d2d35', price: 14, style: 2, vibe: 'n', desc: 'A band nobody in Hollowbrook has heard of, which is the point.' },
    tee_sage:    { slot: 'top', name: 'sage green tee', kind: 'tee', color: '#6f9a80', price: 10, style: 1, vibe: 'n', desc: 'A calm green that looks good in autumn light.' },
    tank_rib:    { slot: 'top', name: 'ribbed tank top', kind: 'tank', color: '#c46f6f', price: 10, style: 1, vibe: 'n', desc: 'Good for the gym or a warm afternoon. Chilly otherwise.' },
    blouse:      { slot: 'top', name: 'linen blouse', kind: 'blouse', color: '#efe4cc', price: 24, style: 3, vibe: 'f', desc: 'Light, a little floaty, and creases if you so much as look at it.' },
    oxford:      { slot: 'top', name: 'oxford shirt', kind: 'buttonup', color: '#9db7d6', price: 26, style: 3, vibe: 'm', desc: 'Crisp collar, pale blue. Professors nod approvingly.' },
    flannel:     { slot: 'top', name: 'flannel shirt', kind: 'buttonup', color: '#8b3a3a', price: 18, style: 2, vibe: 'n', dur: 1.4, desc: 'Red check, warm and hard-wearing. Half the farm crew owns one.' },
    hoodie:      { slot: 'top', name: 'Hollowbrook hoodie', kind: 'hoodie', color: '#7a1f2b', price: 22, style: 1, vibe: 'n', desc: 'Maroon with the college crest. The unofficial uniform of exam week.' },
    sweater:     { slot: 'top', name: 'cable-knit sweater', kind: 'sweater', color: '#c9a46a', price: 30, style: 2, vibe: 'n', desc: 'Chunky oatmeal wool. Like wearing a hug.' },
    sweater_nv:  { slot: 'top', name: 'navy turtleneck', kind: 'sweater', color: '#2f3d5c', price: 32, style: 3, vibe: 'n', desc: 'Very literature-seminar. You will feel like you have opinions about poetry.' },
    hoodie_cat:  { slot: 'top', name: 'cat-print hoodie', kind: 'hoodie', color: '#9a8fb8', price: 24, style: 1, vibe: 'n', pet: true, desc: 'Lilac with little sleeping cats on it, and already a few real hairs no lint roller will ever fully defeat.' },
    // bottoms
    jeans:       { slot: 'bottom', name: 'blue jeans', kind: 'pants', color: '#3d5a80', price: 20, style: 1, vibe: 'n', dur: 1.3, desc: 'Sturdy denim that breaks in nicely.' },
    jeans_black: { slot: 'bottom', name: 'black jeans', kind: 'pants', color: '#26282f', price: 22, style: 2, vibe: 'n', dur: 1.3, desc: 'Slim and dark. Hides stains, mostly.' },
    chinos:      { slot: 'bottom', name: 'khaki chinos', kind: 'pants', color: '#b59f74', price: 24, style: 2, vibe: 'm', desc: 'Smart enough for the dean\'s office, comfy enough for the library.' },
    sweats:      { slot: 'bottom', name: 'grey sweatpants', kind: 'sweats', color: '#8a8d94', price: 12, style: 0, vibe: 'n', desc: 'Peak comfort. Not peak anything else.' },
    shorts:      { slot: 'bottom', name: 'denim shorts', kind: 'shorts', color: '#4f6d96', price: 14, style: 1, vibe: 'n', desc: 'Great in summer, regrettable in November.' },
    skirt:       { slot: 'bottom', name: 'pleated skirt', kind: 'skirt', color: '#4a4e69', price: 20, style: 2, vibe: 'f', desc: 'Charcoal pleats that swish when you walk.' },
    midi:        { slot: 'bottom', name: 'green midi skirt', kind: 'longskirt', color: '#5e8a6a', price: 26, style: 3, vibe: 'f', desc: 'Mid-calf and flowing. Very florist-on-a-Sunday.' },
    overalls:    { slot: 'bottom', name: 'work overalls', kind: 'overalls', color: '#44607a', price: 28, style: 1, vibe: 'n', dur: 2.2, desc: 'Heavy canvas with a bib pocket. Built for mud and long days on the farm.' },
    // shoes
    sneakers:    { slot: 'shoes', name: 'canvas sneakers', kind: 'sneakers', color: '#b33a3a', price: 25, style: 1, vibe: 'n', desc: 'Red canvas high-tops, already a little scuffed.' },
    sneakers_w:  { slot: 'shoes', name: 'white trainers', kind: 'sneakers', color: '#d9d9d9', price: 35, style: 2, vibe: 'n', desc: 'Box-fresh white. Keeping them that way is a full-time job.' },
    boots:       { slot: 'shoes', name: 'leather boots', kind: 'boots', color: '#5a3b26', price: 45, style: 2, vibe: 'n', rainL: 0.3, desc: 'Lace-up and waterproofed. Puddles are no longer your problem.' },
    flats:       { slot: 'shoes', name: 'ballet flats', kind: 'flats', color: '#2a2a33', price: 22, style: 2, vibe: 'f', desc: 'Simple black flats that go with almost anything.' },
    loafers:     { slot: 'shoes', name: 'brown loafers', kind: 'flats', color: '#6b4226', price: 30, style: 3, vibe: 'm', desc: 'Polished leather. You walk a little straighter in them.' },
    // outerwear
    raincoat:    { slot: 'outer', name: 'yellow raincoat', kind: 'raincoat', color: '#d9b13f', price: 35, style: 1, vibe: 'n', rain: 0.7, rainL: 0.35, desc: 'Hooded and bright as a lemon. Rain beads right off.' },
    denim_jkt:   { slot: 'outer', name: 'denim jacket', kind: 'jacket', color: '#46658f', price: 30, style: 2, vibe: 'n', rain: 0.3, desc: 'A classic that looks better the more worn in it gets.' },
    wool_coat:   { slot: 'outer', name: 'wool coat', kind: 'wool_coat', color: '#3b3330', price: 55, style: 3, vibe: 'n', rain: 0.45, rainL: 0.2, desc: 'Long, dark, and warm. Makes you look like you have somewhere important to be.' },
    walk_jkt:    { slot: 'outer', name: 'dog-walking jacket', kind: 'jacket', color: '#4d6b3c', price: 38, style: 1, vibe: 'n', dur: 1.5, rain: 0.5, rainL: 0.15, pet: true, desc: 'Waxed olive cotton, a treat pouch on one hip and a clip for a lead. Every dog in Hollowbrook knows what the pouch means.' },
    // seasonal lines (only on the racks in their season; last season's go to the clearance rail at half price)
    thermal:     { slot: 'top', name: 'cream thermal henley', kind: 'sweater', color: '#e2d6bf', price: 26, style: 2, vibe: 'n', season: 'winter', warm: true, desc: 'Waffle-knit and toasty. The sleeves always end up pushed to your elbows.' },
    puffer:      { slot: 'outer', name: 'navy puffer jacket', kind: 'wool_coat', color: '#26324f', price: 60, style: 1, vibe: 'n', season: 'winter', warm: true, rain: 0.55, rainL: 0.15, desc: 'Like wearing a sleeping bag with sleeves. You will not be cold. You will rustle.' },
    floral_top:  { slot: 'top', name: 'floral print blouse', kind: 'blouse', color: '#e9a9b4', price: 24, style: 3, vibe: 'f', season: 'spring', desc: 'Little blue flowers on blush pink. Very first-warm-day-of-the-year.' },
    trench:      { slot: 'outer', name: 'stone trench coat', kind: 'wool_coat', color: '#b8a27a', price: 58, style: 3, vibe: 'n', season: 'spring', rain: 0.55, rainL: 0.25, desc: 'Belted, double-breasted, and made for April showers. You feel like a detective.' },
    rain_boots:  { slot: 'shoes', name: 'green wellies', kind: 'boots', color: '#3f6a3a', price: 28, style: 0, vibe: 'n', season: 'spring', rainL: 0.5, desc: 'Rubber boots that turn every puddle into an opportunity.' },
    linen_shorts:{ slot: 'bottom', name: 'linen shorts', kind: 'shorts', color: '#d9c9a3', price: 18, style: 2, vibe: 'n', season: 'summer', desc: 'Light, breezy, and creased within five minutes. Worth it.' },
    sandals:     { slot: 'shoes', name: 'leather sandals', kind: 'flats', color: '#8a5a32', price: 24, style: 1, vibe: 'n', season: 'summer', desc: 'For warm pavements and the riverbank. Useless in rain.' },
    cords:       { slot: 'bottom', name: 'rust corduroy trousers', kind: 'pants', color: '#9b4a25', price: 30, style: 2, vibe: 'n', season: 'autumn', dur: 1.4, desc: 'Wide-wale cord the colour of fallen leaves. They make a faint swish when you walk.' },
    // accessories
    beanie:      { slot: 'head', name: 'knit beanie', kind: 'beanie', color: '#a33b3b', price: 12, style: 1, vibe: 'n', season: 'winter', warm: true, desc: 'Red ribbed wool. Hat hair is a small price to pay.' },
    cap:         { slot: 'head', name: 'baseball cap', kind: 'cap', color: '#2f4d6e', price: 14, style: 1, vibe: 'n', desc: 'A plain navy cap. Good for bad hair days and bright mornings.' },
    sunhat:      { slot: 'head', name: 'straw sun hat', kind: 'sunhat', color: '#d8bf7a', price: 18, style: 2, vibe: 'n', season: 'summer', desc: 'Wide-brimmed and a little dramatic. Keeps the sun off your nose.' },
    glasses:     { slot: 'face', name: 'round glasses', kind: 'glasses', color: '#2a2320', price: 40, style: 2, vibe: 'n', desc: 'Tortoiseshell frames with clear lenses. Instantly look ten percent more studious.' },
    sunglasses:  { slot: 'face', name: 'sunglasses', kind: 'sunglasses', color: '#1a1a1a', price: 20, style: 2, vibe: 'n', desc: 'Dark lenses for bright days. Indoors, people will have questions.' },
    studs:       { slot: 'ears', name: 'silver stud earrings', kind: 'studs', color: '#d6d9de', price: 15, style: 1, vibe: 'n', desc: 'Small and simple. You forget you are wearing them.' },
    hoops:       { slot: 'ears', name: 'gold hoop earrings', kind: 'hoops', color: '#d4a93a', price: 22, style: 2, vibe: 'n', desc: 'Medium hoops that catch the light when you turn your head.' },
    scarf_wool:  { slot: 'neck', name: 'grey wool scarf', kind: 'scarf', color: '#7d7f86', price: 16, style: 2, vibe: 'n', season: 'winter', warm: true, desc: 'Long enough to wrap twice. Smells faintly of woodsmoke after a week.' },
    scarf_plaid: { slot: 'neck', name: 'plaid scarf', kind: 'scarf', color: '#a45a2a', price: 18, style: 2, vibe: 'n', season: 'autumn', desc: 'Rust and mustard tartan, the official pattern of October.' },
    cardigan:    { slot: 'outer', name: 'mustard cardigan', kind: 'jacket', color: '#c79a2e', price: 24, style: 2, vibe: 'n', rain: 0.1, desc: 'Cosy, slightly librarian, entirely charming.' },
    // underlayers (not drawn on the sprite). under: true keeps them in the underwear drawer.
    undershirt:  { slot: 'under_top', name: 'white undershirt', kind: 'under', color: '#f0ece2', price: 6, style: 0, vibe: 'n', under: true, desc: 'A plain cotton undershirt. Soaks up sweat before your shirt does.' },
    camisole:    { slot: 'under_top', name: 'cotton camisole', kind: 'under', color: '#e8d8d0', price: 8, style: 0, vibe: 'f', under: true, desc: 'Thin straps, soft cotton, invisible under almost anything.' },
    thermal_vest:{ slot: 'under_top', name: 'thermal undershirt', kind: 'under', color: '#d9cdb8', price: 12, style: 0, vibe: 'n', under: true, warm: 1, desc: 'A close-fitting waffle-knit layer that keeps the chill out.' },
    briefs:      { slot: 'under_bottom', name: 'cotton underwear', kind: 'under', color: '#e6e2d6', price: 5, style: 0, vibe: 'n', under: true, desc: 'Plain, comfortable, and sold in sensible colours.' },
    boxers:      { slot: 'under_bottom', name: 'boxer shorts', kind: 'under', color: '#5a6f8f', price: 6, style: 0, vibe: 'm', under: true, desc: 'Loose cotton boxers with a faded check.' },
    briefs_lace: { slot: 'under_bottom', name: 'seamless underwear', kind: 'under', color: '#d9b8b8', price: 9, style: 0, vibe: 'f', under: true, desc: 'Smooth and seamless, so nothing shows through.' },
    // incontinence briefs. absorb = what it holds before it leaks (ml of urine, lb of stool). bulk / noise 0-4 (grow as it fills).
    // cat: plastic (best protection, bulky, crinkly), pullup (average, fairly discreet), cloth (low protection, looks like thick underwear, washable)
    inc_brief:   { slot: 'under_bottom', name: 'Regular plastic-backed brief', kind: 'under', color: '#f2f2f2', price: 16, style: 0, vibe: 'n', under: true, disposable: true, pack: 10, cat: 'plastic', absorb: { ml: 1400, lb: 4 }, bulk: 2, noise: 2,
                   desc: 'The everyday plastic-backed brief. Bulky but low enough to hide under looser clothes. Four tapes, single leg cuffs.' },
    brief_large: { slot: 'under_bottom', name: 'Large plastic-backed brief', kind: 'under', color: '#f4f4f4', price: 22, style: 0, vibe: 'n', under: true, disposable: true, pack: 10, cat: 'plastic', absorb: { ml: 2200, lb: 6 }, bulk: 3, noise: 3,
                   desc: 'The workhorse. Thick padding and double leg cuffs, good for a school day or a work shift with a change or two. Clear crinkle when you move.' },
    brief_ultra: { slot: 'under_bottom', name: 'Ultra plastic-backed brief', kind: 'under', color: '#f6f6f6', price: 28, style: 0, vibe: 'n', under: true, disposable: true, pack: 6, cat: 'plastic', absorb: { ml: 4000, lb: 9.3 }, bulk: 4, noise: 3,
                   desc: 'Made to last a full day without a change. Six tapes and double cuffs. Very bulky, so it forces a wider stance and is hard to hide.' },
    brief_hyper: { slot: 'under_bottom', name: 'Hyper plastic-backed brief', kind: 'under', color: '#eef2f6', price: 30, style: 0, vibe: 'n', under: true, disposable: true, pack: 4, cat: 'plastic', absorb: { ml: 6000, lb: 12.9 }, bulk: 4, noise: 4,
                   desc: 'The largest brief made, for two-day stretches, camping, or when changing just isn\'t possible. Eight tapes and triple cuffs. Enormous, loud, and impossible to hide.' },
    pullup:      { slot: 'under_bottom', name: 'pull-up brief', kind: 'under', color: '#ecebf2', price: 15, style: 0, vibe: 'n', under: true, disposable: true, pack: 12, cat: 'pullup', absorb: { ml: 800, lb: 1.5 }, bulk: 1, noise: 1,
                   desc: 'Pulls on like underwear, with tear-away sides. Average protection, and fairly discreet under most clothes.' },
    cloth_brief: { slot: 'under_bottom', name: 'cloth brief', kind: 'under', color: '#e8e4da', price: 9, style: 0, vibe: 'n', under: true, cat: 'cloth', absorb: { ml: 600, lb: 1 }, bulk: 0, noise: 0,
                   desc: 'Looks like thick cotton underwear, so nobody can tell. Holds less than a disposable, but it goes in the laundry and gets worn again.' }
  };
  /* Clothing stats. maxI = integrity a brand-new piece starts at (cheap, thin things are lower).
   * warm / bag are levels 0-4 (none, low, normal, high, maximum). warmth scales down with integrity.
   * abs = how much liquid it holds, in ml (wetness % = how full that is). */
  var LEVEL = ['none', 'low', 'normal', 'high', 'maximum'];
  var CSTATS = {
    tee_white: [70, 1, 1, 150], tee_band: [80, 1, 1, 150], tee_sage: [75, 1, 1, 150], tank_rib: [65, 0, 0, 100], blouse: [70, 1, 2, 120],
    oxford: [85, 1, 1, 150], flannel: [100, 2, 2, 250], hoodie: [90, 2, 3, 400], sweater: [90, 3, 3, 450], sweater_nv: [90, 3, 2, 350],
    hoodie_cat: [90, 2, 3, 400], thermal: [85, 3, 1, 300], floral_top: [70, 1, 2, 120],
    jeans: [100, 2, 1, 500], jeans_black: [100, 2, 1, 500], chinos: [90, 2, 2, 350], sweats: [80, 2, 3, 450], shorts: [80, 0, 1, 250],
    skirt: [80, 1, 2, 200], midi: [85, 1, 3, 300], overalls: [100, 2, 4, 700], linen_shorts: [70, 0, 2, 200], cords: [100, 3, 2, 500],
    sneakers: [85, 1, 0, 150], sneakers_w: [90, 1, 0, 150], boots: [100, 3, 0, 100], flats: [70, 0, 0, 60], loafers: [85, 1, 0, 80],
    rain_boots: [90, 2, 0, 10], sandals: [70, 0, 0, 0],
    raincoat: [90, 1, 3, 50], denim_jkt: [100, 2, 2, 600], wool_coat: [100, 4, 3, 900], walk_jkt: [100, 3, 2, 150], puffer: [95, 4, 4, 300],
    trench: [100, 3, 3, 400], cardigan: [80, 2, 2, 500],
    beanie: [80, 2, 0, 80], cap: [85, 0, 0, 40], sunhat: [75, 0, 0, 40], glasses: [90, 0, 0, 0], sunglasses: [80, 0, 0, 0],
    studs: [100, 0, 0, 0], hoops: [100, 0, 0, 0], scarf_wool: [85, 2, 0, 150], scarf_plaid: [80, 1, 0, 150],
    undershirt: [60, 1, 0, 150], camisole: [55, 0, 0, 80], thermal_vest: [75, 2, 0, 200],
    briefs: [60, 0, 0, 100], boxers: [65, 0, 0, 120], briefs_lace: [55, 0, 0, 80], inc_brief: [30, 1, 0, 1400], brief_large: [30, 1, 0, 2200], brief_ultra: [30, 2, 0, 4000], brief_hyper: [30, 2, 0, 6000], pullup: [30, 0, 0, 800], cloth_brief: [80, 0, 0, 600]
  };
  Object.keys(CSTATS).forEach(function (id) { var v = CSTATS[id], d = CATALOG[id]; if (!d) return; d.maxI = v[0]; d.warm = v[1]; d.bag = v[2]; d.abs = v[3]; });
  var BLADDER_ML = 400;   // one full bladder accident, for absorption maths
  var POO_LB = 0.5;
  var CLOTH = ['under_top', 'under_bottom', 'top', 'bottom', 'shoes', 'outer'], ACC = ['head', 'face', 'ears', 'neck'], UNDER = ['under_top', 'under_bottom'];
  var SLOTS = CLOTH.concat(ACC);
  var SLOT_LABEL = { under_top: 'undershirts', under_bottom: 'underwear', top: 'tops', bottom: 'bottoms', shoes: 'shoes', outer: 'outerwear', head: 'hats', face: 'glasses', ears: 'earrings', neck: 'scarves' };

  // outfit sets: wear every piece (any of the listed ids per slot) for a small bonus
  var SETS = [
    { id: 'scholar', name: 'Library Scholar', pieces: { top: ['sweater_nv', 'oxford'], bottom: ['chinos', 'cords'], shoes: ['loafers'] }, bonus: 'Stress builds more slowly while you study in the library or lecture hall.', where: ['library', 'lecture_hall'], stress: -3 },
    { id: 'farmhand', name: 'Farmhand', pieces: { top: ['flannel'], bottom: ['overalls'], shoes: ['boots', 'rain_boots'] }, bonus: 'Less tiring to work the campus farm.', where: ['campus_farm'], fatigue: -3 },
    { id: 'cozy', name: 'Cosy Weekend', pieces: { top: ['hoodie', 'hoodie_cat', 'sweater'], bottom: ['sweats'] }, bonus: 'Extra relaxing at home.', home: true, stress: -4 },
    { id: 'rainready', name: 'Rain Ready', pieces: { outer: ['raincoat', 'trench'], shoes: ['boots', 'rain_boots'] }, bonus: 'Bad weather barely bothers you outdoors.', rainy: true, stress: -3 },
    { id: 'winter', name: 'Winter Layers', pieces: { outer: ['wool_coat', 'puffer'], top: ['sweater', 'sweater_nv', 'thermal', 'flannel'], neck: ['scarf_wool', 'scarf_plaid'] }, bonus: 'Cold days outdoors feel far less draining.', cold: true, stress: -2, fatigue: -2 },
    { id: 'dogwalker', name: 'Dog Walker', pieces: { outer: ['walk_jkt'], bottom: ['jeans', 'jeans_black', 'cords'], shoes: ['boots', 'rain_boots', 'sneakers'] }, bonus: 'Pets out with you are noticeably happier.', pets: 3 },
    { id: 'nightout', name: 'Night Out', pieces: { top: ['blouse', 'oxford', 'tee_band', 'floral_top'], bottom: ['jeans_black', 'skirt', 'midi'], ears: ['hoops', 'studs'] }, bonus: 'You make a better impression in public places.', beauty: 1 },
    { id: 'summer', name: 'Riverside Summer', pieces: { bottom: ['linen_shorts', 'shorts'], shoes: ['sandals'], head: ['sunhat', 'cap'] }, bonus: 'Hot days are much easier to bear.', hot: true, stress: -2, thirst: -3 }
  ];
  function setDone(set) { var w = W(); return Object.keys(set.pieces).every(function (sl) { var it = wornItem(sl); return it && set.pieces[sl].indexOf(it.id) >= 0; }); }
  function activeSets() { return W() && W().starter ? SETS.filter(setDone) : []; }
  function season() { var g = G_(); try { return g.world && g.world.season ? String(g.world.season()).toLowerCase() : 'autumn'; } catch (e) { return 'autumn'; } }
  function onRack(d) { return !d.season || d.season === season(); }
  function priceOf(id) { var d = CATALOG[id]; return onRack(d) ? d.price : Math.ceil(d.price / 2); }
  var STORE = 'clothing_store';

  function G_() { return window.G; }
  function W() { return G_().state.wardrobe; }
  function C() { var s = G_().state; s.stats = s.stats || {}; s.stats.clothing = s.stats.clothing || { upperWetness: 0, upperIntegrity: 100, lowerWetness: 0, lowerIntegrity: 100 }; return s.stats.clothing; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function item(uid) { var w = W(); for (var i = 0; i < w.items.length; i++) if (w.items[i].uid === uid) return w.items[i]; return null; }
  function def(it) { return it ? (CATALOG[it.id] || {}) : null; }
  function wornItem(slot) { var w = W(); return w && w.worn[slot] != null ? item(w.worn[slot]) : null; }
  function drawerOf(slot) { return ACC.indexOf(slot) >= 0 ? 'acc' : UNDER.indexOf(slot) >= 0 ? 'under' : 'main'; }
  function money() { return Number(G_().state.money) || 0; }
  function hereId() { return G_().world && G_().world.hereId ? G_().world.hereId() : (G_().state.world || {}).location; }
  function hereTags() { var l = G_().world && G_().world.here ? G_().world.here() : null; return (l && l.tags) || []; }
  function isOpen(id) { return G_().world && G_().world.isOpen ? G_().world.isOpen(id) : true; }
  function logMoney() {}   // the engine logs spending by location, so nothing to do here
  function opt(label, run, extra) { var o = { label: label, run: run }; if (extra) for (var k in extra) o[k] = extra[k]; return o; }

  function maxOf(id) { var d = typeof id === 'string' ? CATALOG[id] : def(id); return (d && d.maxI) || 100; }
  function warmOf(it) { var d = def(it); if (!d || !d.warm) return 0; var v = d.warm * Math.max(0, it.integ) / maxOf(it); if (d.slot === 'outer' && it.wet >= 100) v = v / 2; return Math.round(v * 10) / 10; }
  function lvl(n) { return LEVEL[clamp(Math.round(n), 0, 4)]; }
  function statLine(it) { var d = def(it); return 'Integrity ' + Math.round(it.integ) + '/' + maxOf(it) + ', warmth ' + lvl(warmOf(it)) + ', bagginess ' + lvl(d.bag || 0) + ', absorbs ' + (d.abs || 0) + ' ml'; }
  function shopLine(id) { var d = CATALOG[id]; return 'Integrity ' + maxOf(id) + ', warmth ' + lvl(d.warm || 0) + ', bagginess ' + lvl(d.bag || 0) + ', absorbs ' + (d.abs || 0) + ' ml.'; }
  /* how well your clothes hide things: 'lower' (a brief), 'chest', 'stash' (skullduggery). 0-4 */
  var LONG_COAT = { wool_coat: 1, trench: 1, raincoat: 1, puffer: 1 };
  function conceal(area) {
    var b = def(wornItem('bottom')), t = def(wornItem('top')), o = wornItem('outer'), od = def(o);
    if (area === 'lower') return Math.max(b ? b.bag || 0 : 0, od && LONG_COAT[o.id] ? od.bag || 0 : 0);
    if (area === 'chest') return Math.max(t ? t.bag || 0 : 0, od ? od.bag || 0 : 0);
    return Math.max(t ? t.bag || 0 : 0, od ? od.bag || 0 : 0, b ? (b.bag || 0) - 1 : 0);
  }
  function briefVisible() { var u = wornItem('under_bottom'); return !!(u && def(u).absorb && briefBulk() > conceal('lower')); }
  /* soak a worn layer with ml of liquid; returns the ml it couldn't hold */
  function soak(slot, ml) {
    var it = wornItem(slot), d = def(it); if (!it || !ml) return ml || 0;
    if (slot === 'top' || slot === 'bottom') pullLive();
    var cap = d.abs || 0, room = cap * (100 - it.wet) / 100, took = Math.min(room, ml);
    if (cap > 0) it.wet = Math.min(100, it.wet + took / cap * 100);
    if (slot === 'top' || slot === 'bottom') pushLive(slot);
    syncLayers(); return ml - took;
  }
  function newItem(id) { var w = W(); var it = { uid: w.nextUid++, id: id, wet: 0, integ: maxOf(id), clean: true, days: 0 }; w.items.push(it); return it; }

  /* copy live stats -> the worn item (top/bottom) */
  function pullLive() {
    var c = C(), t = wornItem('top'), b = wornItem('bottom');
    if (t) { t.wet = c.upperWetness; t.integ = Math.min(maxOf(t), c.upperIntegrity); c.upperIntegrity = t.integ; }
    if (b) { b.wet = c.lowerWetness; b.integ = Math.min(maxOf(b), c.lowerIntegrity); c.lowerIntegrity = b.integ; }
  }
  /* copy worn item -> live stats */
  function pushLive(slot) {
    var c = C(), it = wornItem(slot);
    if (slot === 'top') { c.upperWetness = it ? it.wet : 0; c.upperIntegrity = it ? it.integ : 100; }
    if (slot === 'bottom') { c.lowerWetness = it ? it.wet : 0; c.lowerIntegrity = it ? it.integ : 100; }
  }
  function syncSpare() {
    var w = W(), tops = 0, bots = 0;
    w.items.forEach(function (it) {
      if (!it.clean || it.integ < 5 || it.uid === w.worn.top || it.uid === w.worn.bottom) return;
      var d = def(it); if (!d) return;
      if (d.slot === 'top') tops++; else if (d.slot === 'bottom') bots++;
    });
    C().spareOutfits = Math.min(tops, bots);
  }

  function wear(uid) {
    var w = W(), it = item(uid), d = def(it); if (!d) return '';
    pullLive();
    var prev = wornItem(d.slot), note = '';
    if (prev) {
      var sf = G_().state.stats && G_().state.stats.flags;
      if (prev.wet >= 10 || prev.days >= 1 || prev.soiled || (d.slot === 'bottom' && sf && sf.dirty)) prev.clean = false;
      if (def(prev).disposable) { w.items.splice(w.items.indexOf(prev), 1); note = ' You bin the used brief.'; }
      else if (prev.integ < 5) { w.items.splice(w.items.indexOf(prev), 1); note = ' The old ' + def(prev).name + ' is past saving, so it goes in the bin.'; }
    }
    w.worn[d.slot] = uid; it.days = 0;
    pushLive(d.slot); syncSpare(); syncLayers();
    if ((d.slot === 'bottom' || d.slot === 'under_bottom') && briefVisible()) note += ' The brief shows a little under these. Something baggier would hide it.';
    G_().emit('outfitChanged', { slot: d.slot, id: it.id });
    return note;
  }
  function takeOff(slot) {
    var w = W(); pullLive();
    var was = item(w.worn[slot]); if (was && def(was).disposable) w.items.splice(w.items.indexOf(was), 1);
    w.worn[slot] = null; if (slot === 'top' || slot === 'bottom') pushLive(slot); syncLayers(); syncSpare(); G_().emit('outfitChanged', { slot: slot, id: null });
  }

  /* ---------- outfit read-outs ---------- */
  function style() {
    var total = 0, n = 0;
    SLOTS.forEach(function (s) { var it = wornItem(s); if (it) { total += ACC.indexOf(s) >= 0 ? def(it).style / 2 : def(it).style; n++; } });
    var c = C(), score = Math.round(total + (W().worn.outer != null ? 1 : 0) + Math.min(4, activeSets().length * 2) + (window.Salon && Salon.makeupStyle ? Salon.makeupStyle() : 0));
    if (window.G && G.salon && G.salon.scruffy && G.salon.scruffy()) score -= 1;
    if (soiled()) score -= 4;
    if (c.upperWetness + c.lowerWetness >= 40) score -= 3;
    if (c.upperIntegrity < 40 || c.lowerIntegrity < 40) score -= 3;
    return clamp(score, 0, 10);
  }
  function vibe() {
    var f = 0, m = 0;
    SLOTS.forEach(function (s) { var it = wornItem(s); if (it) { var v = def(it).vibe; if (v === 'f') f++; if (v === 'm') m++; } });
    return f > m ? 'feminine' : m > f ? 'masculine' : 'neutral';
  }
  /* Soiled: set on the worn bottoms by a bowel accident. Stays until the item goes through the laundry. */
  function soiledWorn() { var r = []; if (!W()) return r; ['under_bottom', 'bottom'].forEach(function (s) { var it = wornItem(s); if (it && it.soiled) r.push(it); }); return r; }
  function soiled() { return soiledWorn().length > 0; }
  function soiledHours() { var h = 0; soiledWorn().forEach(function (it) { if (it.soiledAt != null) h = Math.max(h, (absMin() - it.soiledAt) / 60); }); return Math.max(0, h); }
  function soilItem(it) { if (!it) return; if (!it.soiled) it.soiledAt = absMin(); it.soiled = true; it.clean = false; if (!def(it).disposable) damage(it, 15); }
  function damage(it, n) {
    if (!it) return; var w = W(), d = def(it);
    if (it.uid === w.worn.top || it.uid === w.worn.bottom) { pullLive(); G_().change(it.uid === w.worn.top ? 'stats.clothing.upperIntegrity' : 'stats.clothing.lowerIntegrity', -n, { silent: true }); pullLive(); }
    else it.integ = Math.max(0, it.integ - n);
    if (it.integ <= 0 && !it._ruinNote) { it._ruinNote = true; if (G_().notify) G_().notify('Your ' + d.name + ' is ruined. It can\'t be washed or mended now, only thrown away.', 'down', 'ruined-' + it.uid); }
  }
  function ruined(it) { return it.integ <= 0; }
  function absMin() { var t = G_().time || {}; return ((t.day || 1) - 1) * 1440 + (t.hour || 0) * 60 + (t.minute || 0); }
  function markSoiled(skipBottom) {
    var b = W() && wornItem('bottom'), u = W() && wornItem('under_bottom'); if (!b && !u) return false;
    soilItem(u); if (!skipBottom) soilItem(b);
    var sf = G_().state.stats && G_().state.stats.flags; if (sf) sf.dirty = true;
    return true;
  }

  /* Briefs: call absorb(kind) before an accident wets anything. One pee = BLADDER_ML ml, one poo = POO_LB lb.
     true = the brief caught it (no wetness, nothing to see). false = nothing to catch it, or it's full and leaks. */
  function bfill(b) { var d = def(b); if (!b || !d || !d.absorb) return 0; return Math.min(1, Math.max((b.ml || 0) / d.absorb.ml, (b.lb || 0) / d.absorb.lb)); }
  function absorb(kind, amount) {
    var w = W(); if (!w || !w.starter) return false;
    LAST = null;
    var b = wornItem('under_bottom'), d = def(b); if (!b || !d || !d.absorb) return false;
    var k = (kind === 'poo' || kind === 'soiled') ? 'bowels' : kind === 'pee' ? 'bladder' : kind;
    if (k !== 'bladder' && k !== 'bowels') return false;
    b.ml = b.ml || 0; b.lb = b.lb || 0;
    var amt = amount > 0 ? amount : (k === 'bladder' ? BLADDER_ML : POO_LB), cap = k === 'bladder' ? d.absorb.ml : d.absorb.lb, cur = k === 'bladder' ? b.ml : b.lb;
    var held = Math.max(0, Math.min(amt, cap - cur));
    if (held <= 0) { if (k === 'bladder') b.wet = 100; syncLayers(); LAST = { kind: k, category: d.cat, size: d.cat === 'plastic' ? d.name.split(' ')[0] : null, label: briefLabel(d), fill: 100, grew: false, held: 0, leaked: amt, text: 'Your ' + briefLabel(d) + ' diaper is already full and overflows.', growText: '' }; return false; }   // full: it all leaks
    b.clean = false;
    if (k === 'bladder') { b.ml += held; b.wet = Math.min(100, b.ml / d.absorb.ml * 100); }
    else { b.lb += held; if (!b.soiled) b.soiledAt = absMin(); b.soiled = true; var sf = G_().state.stats && G_().state.stats.flags; if (sf) sf.dirty = true; }
    var big = (b.ml >= GROW_ML || b.lb >= GROW_LB), grewNow = big && !b.grew; if (big) b.grew = true;
    var pct = Math.round(bfill(b) * 100), grewMsg = grewNow && d.cat !== 'cloth';
    LAST = { kind: k, category: d.cat, size: d.cat === 'plastic' ? d.name.split(' ')[0] : null, label: briefLabel(d), fill: pct, grew: grewMsg, held: held, leaked: amt - held,
             text: 'You used your ' + briefLabel(d) + ' diaper, filling it to ' + pct + '%.', growText: grewMsg ? 'Your diaper grows larger; it\'s getting harder to hide.' : '' };
    syncLayers();
    if (G_().emit) G_().emit('briefUsed', LAST);
    return held >= amt ? true : held;   // a number = only part of it held, the rest overflows
  }
  var LAST = null;   // details of the last absorb() for the accident text
  var GROW_ML = 1200, GROW_LB = 1;   // past either, a disposable swells a size
  function briefLabel(d) { return d.cat === 'plastic' ? 'plastic-backed ' + d.name.split(' ')[0] : d.cat === 'pullup' ? 'pull-up' : 'cloth'; }
  function fillWord(f) { return f <= 0 ? 'dry' : f < 0.25 ? 'barely used' : f < 0.5 ? 'partly used' : f < 0.75 ? 'about half full' : f < 1 ? 'mostly full' : 'full'; }
  function briefFull() { var b = wornItem('under_bottom'), d = def(b); return !!(b && d && d.absorb && ((b.ml || 0) + BLADDER_ML > d.absorb.ml || (b.lb || 0) + POO_LB > d.absorb.lb)); }
  function briefBulk() { var b = wornItem('under_bottom'), d = def(b); if (!b || !d || !d.absorb) return 0; var f = bfill(b), grow = ((b.ml || 0) >= GROW_ML || (b.lb || 0) >= GROW_LB ? 1 : 0) + (f >= 0.85 ? 1 : 0); if (d.cat === 'cloth') grow = Math.min(grow, 1); return Math.min(4, (d.bulk || 0) + grow); }
  function briefNoise() { var b = wornItem('under_bottom'), d = def(b); if (!b || !d || !d.absorb) return 0; return Math.min(4, (d.noise || 0) + (d.cat === 'plastic' && bfill(b) >= 0.5 ? 1 : 0)); }
  function briefWeight() { var b = wornItem('under_bottom'), d = def(b); if (!b || !d || !d.absorb) return 0; return Math.round(((b.ml || 0) / 453.6 + (b.lb || 0)) * 10) / 10; }
  function wearingBriefUsed() { var b = wornItem('under_bottom'); return !!(b && def(b).absorb && (b.ml || b.lb || b.soiled)); }
  function stock() { var w = W(); if (!w) return {}; if (!w.stock) w.stock = {}; if (w.briefs) { w.stock.inc_brief = (w.stock.inc_brief || 0) + w.briefs; w.briefs = 0; } return w.stock; }
  function supplies(id) { var st = stock(); if (id) return st[id] || 0; var n = 0; for (var k in st) n += st[k]; return n; }
  function freshBrief(id) {
    var st = stock(); if (!id) { var best = null; var cur = def(wornItem('under_bottom')); if (cur && st[wornItem('under_bottom').id]) best = wornItem('under_bottom').id; for (var k in st) if (!best && st[k] > 0) best = k; id = best; }
    if (!id || !st[id]) return null;
    st[id]--; var it = newItem(id); var note = wear(it.uid); return note;
  }
  /* mirror the underlayers and jacket into stats.clothing so the Clothing tab can show them */
  function syncLayers() {
    var c = C(); if (!c || !W()) return;
    function put(slot, wk, ik) { var it = wornItem(slot); c[wk] = it ? Math.round(it.wet) : null; c[ik] = it ? Math.round(it.integ) : null; }
    put('under_top', 'underUpperWetness', 'underUpperIntegrity');
    put('under_bottom', 'underLowerWetness', 'underLowerIntegrity');
    put('outer', 'jacketWetness', 'jacketIntegrity');
    var b = wornItem('under_bottom'); c.diaper = !!(b && def(b).absorb); c.diaperFill = c.diaper ? Math.round(bfill(b) * 100) : null;
  }
  /* what's covered: 'bare' = nothing at all, 'under' = only underwear/undershirt, null = dressed */
  function exposure() {
    var w = W(); if (!w || !w.starter) return { upper: null, lower: null };
    var up = wornItem('top') || wornItem('outer') ? null : wornItem('under_top') ? 'under' : 'bare';
    var lo = wornItem('bottom') ? null : wornItem('under_bottom') ? 'under' : 'bare';
    if (lo && wornItem('outer') && LONG_COAT[wornItem('outer').id]) lo = null;   // a long coat covers you
    return { upper: up, lower: lo };
  }
  function isNaked() { var e = exposure(); return e.upper === 'bare' && e.lower === 'bare'; }
  function inPublic() {
    var tags = hereTags(); if (tags.indexOf('home') >= 0) return false;
    var w = W(); if (w && w.hidingAt && w.hidingAt === hereId()) return false;
    var gw = G_().world; if (gw && gw.isPrivate && gw.isPrivate()) return false;
    if (w && w.mode && w.mode.indexOf('wardrobe') === 0) return false;   // fitting room curtain
    return tags.indexOf('public') >= 0 || tags.indexOf('outdoors') >= 0 || (G_().world && G_().world.onCampus && G_().world.onCampus());
  }
  function warmth() {
    var n = 0, jk = wornItem('outer');
    SLOTS.forEach(function (s) { var it = wornItem(s); if (it) n += warmOf(it); });
    return n;
  }

  function briefLine() {
    var b = wornItem('under_bottom'), d = def(b), f = bfill(b), t = ' Your ' + d.name + ' is ' + fillWord(f);
    if (briefVisible()) t += ', and the shape shows under what you\'re wearing'; 
    if (briefNoise() >= 3) t += '. It crinkles loudly when you move'; else if (briefNoise() >= 2) t += '. It crinkles in quiet rooms';
    if (briefWeight() >= 5) t += '. The weight slows you down';
    return t + (briefFull() ? '. It won\'t hold another accident.' : '.');
  }
  var LASTLINE = {};
  function line(key, arr) { var i = Math.floor(Math.random() * arr.length); if (arr.length > 1 && i === LASTLINE[key]) i = (i + 1) % arr.length; LASTLINE[key] = i; return arr[i]; }
  function hourNow() { var t = G_().time; return t && typeof t.hour === 'number' ? t.hour : 12; }
  function weatherNote() {
    var g = G_(); if (!g.world || !g.world.temp) return '';
    var t = g.world.temp(), wm = warmth(), wx = g.world.weather ? String(g.world.weather()) : '', jk = wornItem('outer');
    if (t < 0 && wm < 13) return line('wx', [' It\'s below freezing out, and you are not dressed for it.', ' The cold bites straight through what you\'re wearing.']);
    if (t < 10 && wm < 7) return line('wx', [' You\'ll feel the chill in this.', ' A warmer layer wouldn\'t hurt today.']);
    if (t >= 25 && wm >= 7) return line('wx', [' It\'s far too warm for this many layers.', ' You\'re going to cook in this.']);
    if (/rain|storm|drizzle/i.test(wx) && !jk) return line('wx', [' It\'s wet out and you have no jacket.', ' Nothing here will keep the rain off.']);
    return '';
  }
  function describeOutfit() {
    var parts = [], exd = exposure();
    if (exd.upper === 'bare' && exd.lower === 'bare') return 'You aren\'t wearing anything.' + (wornItem('shoes') ? ' Just your ' + def(wornItem('shoes')).name + '.' : '');
    ['top', 'bottom', 'outer', 'shoes', 'head', 'face', 'neck', 'ears'].forEach(function (s) { var it = wornItem(s); if (it) parts.push(def(it).name); });
    if (!parts.length) return 'You are not wearing much of anything.';
    var last = parts.pop(), txt = 'You\'re wearing ' + (parts.length ? parts.join(', ') + ' and ' : '') + last + '.';
    var st = style();
    txt += ' ' + (st >= 8 ? line('st', ['You look genuinely sharp today.', 'People are going to assume you have somewhere important to be.', 'Everything fits and everything goes. A rare day.'])
      : st >= 5 ? line('st', ['It\'s a put-together look.', 'Neat, considered, quietly confident.', 'You look like someone who owns an iron.'])
      : st >= 3 ? line('st', ['Casual, but it works.', 'Comfortable, and it doesn\'t look thrown on. Mostly.', 'A perfectly respectable student look of no particular effort.'])
      : line('st', ['It is, generously, an outfit.', 'Nothing matches, but at least it\'s all clean. Probably.', 'It covers you. That is about all it does.']));
    txt += weatherNote();
    var c = C();
    if (c.upperWetness + c.lowerWetness >= 40) txt += ' Your clothes are noticeably damp.';
    if (c.upperIntegrity < 40 || c.lowerIntegrity < 40) txt += ' A few seams are visibly giving up.';
    if (soiled()) { var so = soiledWorn()[0]; txt += def(so).disposable ? ' Your brief is soiled and needs changing.' : ' Your ' + def(so).name + ' are soiled and need changing and a proper wash.'; }
    var jk = wornItem('outer'); if (jk && jk.wet >= 100) txt += ' Your ' + def(jk).name + ' is soaked through.';
    if (exd.lower === 'under') txt += ' You\'re in your underwear from the waist down.'; else if (exd.lower === 'bare') txt += ' You have nothing on below the waist.';
    if (exd.upper === 'under') txt += ' Your top half is just your ' + def(wornItem('under_top')).name + '.'; else if (exd.upper === 'bare') txt += ' You have nothing on up top.';
    var ub = wornItem('under_bottom'); if (!ub && !exd.lower) txt += ' You aren\'t wearing any underwear.'; else if ((def(ub) || {}).absorb) txt += briefLine(); else if (false) txt += ' Your brief is full and won\'t hold another accident.';
    activeSets().forEach(function (st2) { txt += ' Full ' + st2.name + ' look.'; });
    return txt;
  }

  // starting clothes follow the creator's gender (male/female/neither); old saves fall back to appearance
  function startKey(p) { var g = p && p.gender; return g === 'male' ? 'male' : g === 'female' ? 'female' : g === 'neither' ? 'androgynous' : (p && p.appearance) || 'androgynous'; }
  function starterIds(p) {
    var app = startKey(p);
    var ids = ['tee_white', 'hoodie', 'jeans', 'sweats', 'sneakers'];
    if (app === 'female') ids.push('skirt', 'tee_sage'); else if (app === 'male') ids.push('flannel', 'chinos'); else ids.push('tee_band', 'jeans_black');
    return ids;
  }
  function look(id) { var d = CATALOG[id]; return { kind: d.kind, color: d.color }; }
  function spriteOutfit(p) {
    var g = G_(), w = g && g.state && g.state.wardrobe;
    if (!w || !w.starter) {      // creation preview: the outfit you'd start in
      var app = startKey(p);
      return { top: look(app === 'male' ? 'flannel' : 'tee_white'), bottom: look(app === 'female' ? 'skirt' : 'jeans'), shoes: look('sneakers') };
    }
    pullLive();
    var c = C(), o = { wetU: c.upperWetness, wetL: c.lowerWetness, integU: c.upperIntegrity, integL: c.lowerIntegrity, deg: {} };
    SLOTS.forEach(function (s) {
      var it = wornItem(s); o[s] = it ? look(it.id) : null;
      if (it) o.deg[s] = { f: it.integ / maxOf(it), wet: it.wet, soiled: !!it.soiled, days: it.days || 0 };
    });
    if (o.under_bottom) { var ubd = def(wornItem('under_bottom')); o.under_bottom.kind = ubd.absorb && ubd.bulk ? 'brief' : 'under'; o.under_bottom.bulk = briefBulk(); o.under_bottom.wet = wornItem('under_bottom').wet; }
    var ex = exposure(); o.bareUpper = ex.upper === 'bare'; o.bareLower = ex.lower === 'bare';
    return o;
  }

  function ensure(state) {
    if (!state.wardrobe) state.wardrobe = { items: [], worn: { under_top: null, under_bottom: null, top: null, bottom: null, shoes: null, outer: null }, nextUid: 1, mode: null, starter: false };
    var w = state.wardrobe;
    if (!w.starter && state.creation && state.creation.done) giveStarter(state);
    if (w.starter && !w.underlayers) giveUnder(state);
    if (!w.statsV) { w.statsV = 1; w.items.forEach(function (it) { if (CATALOG[it.id]) it.integ = Math.min(maxOf(it), it.integ); }); }
    return w;
  }
  function giveStarter(state) {
    var w = state.wardrobe; if (w.starter) return;
    w.starter = true;
    var p = (state.creation || {}).player || {}, ids = starterIds(p), app = startKey(p);
    ids.forEach(function (id) { newItem(id); });
    var first = function (id) { for (var i = 0; i < w.items.length; i++) if (w.items[i].id === id) return w.items[i].uid; };
    var c = C();
    w.worn.top = first(app === 'male' ? 'flannel' : 'tee_white');
    w.worn.bottom = first(app === 'female' ? 'skirt' : 'jeans');
    w.worn.shoes = first('sneakers');
    // whatever the engine started us in becomes the worn pieces' condition
    item(w.worn.top).wet = c.upperWetness || 0; item(w.worn.top).integ = c.upperIntegrity == null ? 100 : c.upperIntegrity;
    item(w.worn.bottom).wet = c.lowerWetness || 0; item(w.worn.bottom).integ = c.lowerIntegrity == null ? 100 : c.lowerIntegrity;
    syncSpare(); giveUnder(state);
  }
  function giveUnder(state) {
    var w = state.wardrobe; if (w.underlayers) return; w.underlayers = true;
    if (w.worn.under_top === undefined) w.worn.under_top = null;
    if (w.worn.under_bottom === undefined) w.worn.under_bottom = null;
    var app = startKey((state.creation || {}).player || {}), uid = app === 'male' ? 'boxers' : app === 'female' ? 'briefs_lace' : 'briefs';
    var a = newItem(uid); newItem(uid); newItem(uid);
    var t = newItem(app === 'female' ? 'camisole' : 'undershirt'); newItem('undershirt');
    w.worn.under_bottom = a.uid; w.worn.under_top = t.uid;
    syncLayers();
  }

  /* ---------- mannequin previews (G.doll) ---------- */
  function catIds(slot) {
    return Object.keys(CATALOG).filter(function (id) {
      var d = CATALOG[id]; if (d.pack) return false;
      if (slot === 'season') return !!d.season && d.season === season();
      if (slot === 'clearance') return !!d.season && d.season !== season();
      if (slot === 'acc') return ACC.indexOf(d.slot) >= 0 && !d.season;
      return d.slot === slot && !d.season;
    });
  }
  function manPres() {
    var w = W(); if (w.manPres) return w.manPres;
    var p = (G_().state.creation || {}).player || {}; return p.appearance === 'male' ? 'masc' : 'fem';
  }
  function mannequin(id, scale) {
    var g = G_(); if (!g.doll || !g.doll.html) return '';
    var p = (g.state.creation || {}).player || {};
    try { return g.doll.html(null, { mannequin: true, outfit: [id], presentation: manPres(), breastSize: p.breastSize, scale: scale || 3 }); } catch (e) { return ''; }
  }
  function mannequinGrid(slot) {
    if (!G_().doll) return '';
    var ids = catIds(slot); if (!ids.length) return '';
    return '<div class="hb-mannequins" style="display:flex;flex-wrap:wrap;gap:10px;margin:6px 0">' + ids.map(function (id) {
      var d = CATALOG[id];
      return '<figure style="margin:0;text-align:center;width:' + (56 * 3 + 4) + 'px">' + mannequin(id, 3) + '<figcaption style="font-size:.8em">' + esc(d.name) + ' ($' + priceOf(id) + ')</figcaption></figure>';
    }).join('') + '</div><p class="hint">Showing the ' + manPres() + ' mannequins.</p>';
  }

  /* ---------- store + wardrobe options ---------- */
  function storeOptions(out) {
    var w = W(), mode = w.mode || '';
    if (mode.indexOf('shop:') === 0) {
      var slot = mode.slice(5);
      var other = manPres() === 'fem' ? 'masc' : 'fem';
      if (G_().doll && catIds(slot).length) out.actions.push(opt('Show the ' + other + ' mannequins', function () {
        W().manPres = other;
        return { text: '<p>' + line('mannequin', ['A clerk wheels out the ' + other + ' mannequins and dresses them for you.', 'You swap to the ' + other + ' row of mannequins at the back.', 'The ' + other + ' mannequins stand in a patient line by the mirror.']) + '</p>' + mannequinGrid(slot), minutes: 1 };
      }, { time: 1, icon: '🧍', section: 'shop' }));
      catIds(slot).forEach(function (id) {
        var d = CATALOG[id];
        var price = priceOf(id);
        var owned = w.items.filter(function (it) { return it.id === id; }).length;
        out.actions.push(opt('Buy the ' + d.name + ' ($' + price + ')' + (owned ? ' (own ' + owned + ')' : ''), function () {
          if (money() < price) return { text: '<p>You count your cash twice. Not enough for the ' + esc(d.name) + '.</p>', minutes: 1 };
          G_().change('money', -price); logMoney('spend', 'Threadbare', price);
          newItem(id); syncSpare();
          G_().emit('clothesBought', { id: id });
          return { text: mannequin(id, 2) + '<p>' + line('buy', ['The clerk folds the ' + esc(d.name) + ' into a paper bag with a sprig of lavender. ', 'The clerk wraps the ' + esc(d.name) + ' in tissue paper. "Good choice," she says, and sounds like she means it. ', 'The ' + esc(d.name) + ' goes into a bag stamped with the Threadbare needle-and-thread logo. ', 'The clerk snips off the tag and tucks a loyalty card into the bag with one stamp on it. ']) + esc(d.desc) + '</p><p class="hint">You can change into it in the fitting room or at home.</p>', minutes: 5 };
        }, { time: 5, disabled: money() < price, hint: d.desc + ' ' + shopLine(id) }));
      });
      if (slot === 'under_bottom') briefPackOption(out, 'Threadbare & Co.');
      out.actions.push(opt('Step back from the racks', function () { w.mode = null; return { text: '<p>' + line('leave', ['You drift back toward the front of the shop.', 'You leave the racks a little messier than you found them.', 'You step away before you talk yourself into anything else.']) + '</p>', minutes: 1 }; }));
      return;
    }
    var cats = CLOTH.map(function (sl) { return [sl, 'Browse ' + SLOT_LABEL[sl], 'the ' + SLOT_LABEL[sl]]; });
    cats.push(['acc', 'Browse accessories (hats, glasses, earrings)', 'the accessories counter']);
    cats.push(['season', 'Browse the new ' + season() + ' line', 'this season\'s rail']);
    cats.push(['clearance', 'Check the clearance rail (half price)', 'last season\'s leftovers']);
    cats.forEach(function (ct) {
      out.actions.push(opt(ct[1], function () {
        w.mode = 'shop:' + ct[0];
        return { text: mannequinGrid(ct[0]) + '<p>You flick through ' + esc(ct[2]) + '.' + (ct[0] === 'season' ? ' A chalkboard sign reads "New in for ' + season() + '".' : '') + ' ' + line('browse', ['A radio behind the counter plays something from the seventies.', 'Hangers clack along the rail as you push them aside.', 'The shop cat is asleep in a basket of scarves and nobody has the heart to move her.', 'Someone in the next aisle is having a whispered argument about corduroy.', 'The tags are handwritten in looping blue ink.']) + '</p>', minutes: 3 };
      }));
    });
    // repairs
    pullLive();
    var torn = w.items.filter(function (it) { return it.integ < maxOf(it) * 0.8 && !ruined(it) && !def(it).disposable && CLOTH.indexOf(def(it).slot) >= 0; });
    if (torn.length) out.actions.push(opt('Have ' + torn.length + ' damaged item' + (torn.length > 1 ? 's' : '') + ' mended ($' + (torn.length * 5) + ')', function () {
      var cost = torn.length * 5; if (money() < cost) return { text: '<p>The tailor quotes you a price you can\'t cover today.</p>', minutes: 1 };
      G_().change('money', -cost); logMoney('spend', 'Threadbare', cost); torn.forEach(function (it) { it.integ = maxOf(it); it._ruinNote = false; }); pushLive('top'); pushLive('bottom'); syncLayers();
      return { text: '<p>The owner\'s nephew does alterations in the back. An hour later your clothes come back with neat, nearly invisible stitches.</p>', minutes: 60 };
    }, { time: 60, disabled: money() < torn.length * 5 }));
    if (!w.sewingKit) out.actions.push(opt('Buy a sewing kit ($10)', function () {
      if (money() < 10) return { text: '<p>Not today.</p>', minutes: 1 };
      G_().change('money', -10); logMoney('spend', 'Threadbare', 10); w.sewingKit = true;
      return { text: '<p>A little tin of needles, thread in twelve colours, and a thimble you will lose within the week. You can mend clothes at home now.</p>', minutes: 2 };
    }, { time: 2, disabled: money() < 10, hint: 'Lets you mend torn clothes yourself at home.' }));
    var junk = w.items.filter(function (it) { return it.integ < 40 && SLOTS.every(function (s) { return w.worn[s] !== it.uid; }); });
    if (junk.length) out.actions.push(opt('Drop worn-out clothes in the recycling bin (+$' + (junk.length * 2) + ' store credit)', function () {
      junk.forEach(function (it) { w.items.splice(w.items.indexOf(it), 1); });
      G_().change('money', junk.length * 2); logMoney('earn', 'Clothes recycling', junk.length * 2); syncSpare();
      return { text: '<p>The clerk weighs your tired old clothes on a little scale and hands over a few dollars. "They\'ll become insulation," she says, pleased.</p>', minutes: 3 };
    }));
  }

  function briefPackOption(out, where, sub) {
    var w = W();
    Object.keys(CATALOG).forEach(function (id) {
      var d = CATALOG[id]; if (!d.pack || !d.absorb) return;
      var price = priceOf(id), have = supplies(id);
      out.actions.push(opt('Buy ' + d.pack + ' ' + d.name + 's ($' + price + ')' + (have ? ' (have ' + have + ')' : ''), function () {
        if (money() < price) return { text: '<p>Not enough cash for a pack today.</p>', minutes: 1 };
        G_().change('money', -price); logMoney('spend', where === 'market' ? 'Hollowbrook Grocer' : 'Threadbare', price); stock()[id] = have + d.pack;
        return { text: '<p>A plain, discreet pack. The cashier rings it up without comment. You can change into one at home, in a restroom, or in the fitting room.</p>', minutes: 2 };
      }, { time: 2, disabled: money() < price, hint: d.desc + ' Holds about ' + Math.floor(d.absorb.ml / BLADDER_ML) + ' pees (' + d.absorb.ml + ' ml) or ' + d.absorb.lb + ' lb.', sub: sub }));
    });
  }
  function changeBriefOption(out) {
    var st = stock(), cur = wornItem('under_bottom'), used = cur && def(cur).absorb && ((cur.ml || cur.lb) || cur.soiled);
    Object.keys(st).forEach(function (id) {
      if (!st[id]) return; var d = CATALOG[id];
      out.actions.push(opt((used ? 'Change into a fresh ' : 'Put on a ') + d.name + ' (' + st[id] + ' left)', function () {
        var wasSoiled = cur && cur.soiled;
        var note = freshBrief(id);
        var sf = G_().state.stats && G_().state.stats.flags;
        if (wasSoiled && sf && !soiled()) sf.dirty = false;   // wipes come with the change
        return { text: '<p>You find somewhere private and change.' + esc(note || '') + '</p>', minutes: 4 };
      }, { time: 4, hint: d.desc }));
    });
  }

  /* Laundry in steps: load the washer, wait or leave it running, then dryer or drying rack. */
  function finishLaundry(w, hang) {
    var L = w.laundry, n = 0; w.laundry = null;
    w.items.forEach(function (it) { if (L.uids.indexOf(it.uid) >= 0 && SLOTS.every(function (s) { return w.worn[s] !== it.uid; })) { it.clean = true; it.wet = 0; it.days = 0; it.soiled = false; it.soiledAt = null; it.ml = 0; it.lb = 0; it.grew = false; n++; } });
    if (G_().stats && G_().stats.trainSkill) G_().stats.trainSkill('housekeeping', hang ? 7 : 6);
    syncSpare(); return n;
  }
  function laundryOptions(out, dirty) {
    var w = W(), L = w.laundry;
    if (!L) {
      if (!dirty.length) return;
      out.actions.push(opt('Do laundry: ' + dirty.length + ' item' + (dirty.length > 1 ? 's' : '') + ' ($3)', function () {
        if (money() < 3) return { text: '<p>The machines want quarters you don\'t have.</p>', minutes: 1 };
        G_().change('money', -3); logMoney('spend', 'Laundry', 3);
        w.laundry = { stage: 'wash', uids: dirty.map(function (it) { return it.uid; }), until: absMin() + 45 };
        return { text: '<p>' + line('laundryLoad', ['You haul the laundry bag down to the basement machines, load a washer and feed it quarters. It starts to churn.', 'The basement laundry room hums. Someone has left a single sock on top of the dryer with a note: "Is this yours?" It is not.', 'You claim the one washer that doesn\'t walk across the floor on spin. Ninety minutes and two podcast episodes later, you have a warm armful of clean clothes.', 'A floormate is folding at the next table and you trade complaints about the dryer that eats quarters. Your clothes come out soft and smelling faintly of lemon.']) + '</p><p class="hint">The wash takes about 45 minutes. You can wait, or leave it running.</p>', minutes: 5 };
      }, { time: 5, disabled: money() < 3, reason: money() < 3 ? 'Needs $3' : '', effects: ['!−$3', 'Starts a 45-minute wash'] }));
      return;
    }
    var left = Math.max(0, L.until - absMin());
    if (L.stage === 'wash' && left > 0) {
      out.actions.push(opt('Wait out the wash cycle', function () { L.stage = 'washed'; return { text: '<p>' + line('lwait', ['You sit on the folding table with a textbook while the machine thumps through its spin.', 'You scroll your phone and watch the suds go round. It is strangely calming.', 'Someone comes in, sighs at the full machines, and leaves again.']) + '</p>', minutes: left }; }, { time: left, effects: ['^Finishes the wash'] }));
      out.actions.push(opt('Leave it running', function () { w.mode = null; return { text: '<p>You leave the washer churning. Your laundry will be waiting when you come back.</p>', minutes: 1 }; }, { time: 1 }));
      return;
    }
    out.actions.push(opt('Put it in the dryer ($2)', function () {
      if (money() < 2) return { text: '<p>You\'re out of quarters for the dryer.</p>', minutes: 1 };
      G_().change('money', -2); logMoney('spend', 'Laundry', 2); var n = finishLaundry(w, false);
      return { text: '<p>Forty minutes in the dryer. ' + n + ' item' + (n === 1 ? '' : 's') + ' come out warm, soft and smelling of cheap detergent.</p>', minutes: 40 };
    }, { time: 40, disabled: money() < 2, reason: money() < 2 ? 'Needs $2' : '', effects: ['!−$2', '^Clean, dry clothes'] }));
    out.actions.push(opt('Hang it on the drying rack', function () {
      var n = finishLaundry(w, true);
      return { text: '<p>You drape ' + n + ' damp item' + (n === 1 ? '' : 's') + ' over the rack in your room. It takes a while, but it\'s free and nothing shrinks.</p>', minutes: 15 };
    }, { time: 15, effects: ['^Clean clothes', '^Free', '^+Housekeeping'] }));
  }
  function wardrobeOptions(out, where) {
    var w = W(), home = where === 'home';
    SLOTS.forEach(function (slot) {
      var cur = w.worn[slot];
      w.items.forEach(function (it) {
        var d = def(it); if (!d || d.slot !== slot || it.uid === cur || it.integ < 5) return;
        if (!it.clean) return;
        if (d.disposable) return;
        if (drawerOf(slot) !== (w.mode === 'wardrobe:acc' ? 'acc' : w.mode === 'wardrobe:under' ? 'under' : 'main')) return;
        out.actions.push(opt((ACC.indexOf(slot) >= 0 ? 'Put on the ' : 'Wear the ') + d.name + (it.integ < 60 ? ' (worn)' : ''), function () {
          var note = wear(it.uid);
          return { text: '<p>' + line('wear' + slot, slot === 'shoes' ? ['You lace up the ' + esc(d.name) + '.', 'You step into the ' + esc(d.name) + ' and test them with a little bounce.', 'You sit on the edge of the bed and pull on the ' + esc(d.name) + '.'] : slot === 'outer' ? ['You shrug on the ' + esc(d.name) + '.', 'You pull on the ' + esc(d.name) + ' and pat the pockets out of habit.', 'You zip up the ' + esc(d.name) + ' and roll your shoulders.'] : ['You change into the ' + esc(d.name) + '.', 'You pull on the ' + esc(d.name) + ' and check the mirror.', 'You swap into the ' + esc(d.name) + ' and smooth it down.', 'The ' + esc(d.name) + ' goes on. You turn side to side in the mirror.']) + esc(note) + '</p><p>' + esc(describeOutfit()) + '</p>', minutes: slot === 'shoes' ? 2 : 4 };
        }, { hint: d.desc, time: slot === 'shoes' ? 2 : 4 }));
      });
      if (cur != null && drawerOf(slot) === (w.mode === 'wardrobe:acc' ? 'acc' : w.mode === 'wardrobe:under' ? 'under' : 'main')) {
        var cd = def(item(cur));
        out.actions.push(opt('Take off the ' + cd.name, function () { takeOff(slot); return { text: '<p>' + line('off', ['You take off the ' + esc(cd.name) + '.', 'You peel off the ' + esc(cd.name) + ' and drop it over the chair.', 'Off comes the ' + esc(cd.name) + '.']) + '</p>', minutes: 1 }; }));
      }
    });
    if (w.mode === 'wardrobe:under') changeBriefOption(out);
    if (w.mode === 'wardrobe' && CLOTH.some(function (sl) { return w.worn[sl] != null; })) out.actions.push(opt('Get undressed', function () {
      CLOTH.forEach(function (sl) { if (w.worn[sl] != null) takeOff(sl); });
      return { text: '<p>You take everything off and fold it over the ' + (home ? 'chair' : 'little stool') + '.</p>', minutes: 3 };
    }, { time: 3 }));
    var dirty = w.items.filter(function (it) { return !it.clean && !ruined(it) && SLOTS.every(function (s) { return w.worn[s] !== it.uid; }); });
    var dead = w.items.filter(function (it) { return ruined(it) && SLOTS.every(function (s) { return w.worn[s] !== it.uid; }); });
    if (dead.length) out.actions.push(opt('Throw away ruined clothes (' + dead.map(function (it) { return def(it).name; }).join(', ') + ')', function () {
      dead.forEach(function (it) { w.items.splice(w.items.indexOf(it), 1); }); syncSpare();
      return { text: '<p>Some things are past saving. You bag them up and drop them in the bin.</p>', minutes: 2 };
    }, { time: 2 }));
    if (home) laundryOptions(out, dirty);
    if (w.mode === 'wardrobe:acc' || w.mode === 'wardrobe:under') out.actions.push(opt('Back to your clothes', function () { w.mode = 'wardrobe'; return { text: '<p>You close the drawer.</p>', minutes: 0 }; }));
    else out.actions.push(opt('Open the underwear drawer', function () { w.mode = 'wardrobe:under'; return { text: '<p>Underwear and undershirts, folded more neatly than anything else you own.' + (supplies() ? ' Your briefs are at the back (' + supplies() + ' left).' : '') + '</p>', minutes: 1 }; }));
    if (w.mode !== 'wardrobe:acc' && w.mode !== 'wardrobe:under' && w.items.some(function (it) { return ACC.indexOf(def(it).slot) >= 0; })) out.actions.push(opt('Open the accessories drawer', function () { w.mode = 'wardrobe:acc'; return { text: '<p>Hats, glasses, earrings and scarves, in a tangle that is almost organised.</p>', minutes: 1 }; }));
    pullLive();
    var mend = w.items.filter(function (it) { return it.integ < maxOf(it) * 0.8 && !ruined(it) && !def(it).disposable && CLOTH.indexOf(def(it).slot) >= 0; }).sort(function (a, b) { return a.integ - b.integ; }).slice(0, 3);
    if (home && !w.sewingKit && mend.length) out.actions.push(opt('Mend your clothes', function () { return { text: '', minutes: 0 }; }, { disabled: true, reason: 'Needs a sewing kit from Threadbare', time: 45 }));
    if (home && w.sewingKit && mend.length) out.actions.push(opt('Mend your clothes (' + mend.map(function (it) { return def(it).name; }).join(', ') + ')', function () {
      var skill = 0; try { var sk = G_().state.stats.skills.housekeeping; skill = (typeof sk === 'object' ? sk.value : sk) || 0; } catch (e) {}
      var fix = 30 + Math.round(skill / 40);
      mend.forEach(function (it) { it.integ = Math.min(maxOf(it), it.integ + fix); }); pushLive('top'); pushLive('bottom'); syncLayers();
      if (G_().stats && G_().stats.trainSkill) G_().stats.trainSkill('housekeeping', 5);
      G_().change('stats.needs.stress', -5);
      return { text: '<p>' + line('mend', ['You sit cross-legged on the bed with the sewing tin and patch up the worst of it. The stitches are not pretty, but they will hold.', 'You put on some music and mend by lamplight. You only stab yourself twice.', 'Thread, needle, patience. The repairs are lopsided but sturdy.']) + '</p>', minutes: 45 };
    }));
    out.actions.push(opt(home ? 'Close the wardrobe' : 'Leave the fitting room', function () { w.mode = null; return { text: '<p>' + esc(describeOutfit()) + '</p>', minutes: 0 }; }, { time: 0 }));
  }

  /* out in public without enough on: people notice, and reputation drops until you hide or get dressed */
  function tickExposure(minutes, state) {
    var w = W(), g = G_(), ex = exposure();
    if (w.hidingAt && w.hidingAt !== hereId()) w.hidingAt = null;
    var sev = (ex.lower === 'bare' ? 1 : ex.lower === 'under' ? 0.5 : 0) + (ex.upper === 'bare' ? 0.5 : 0);
    if (!sev || !inPublic()) { w._exAcc = 0; return; }
    var cover = g.stats && g.stats.noticeMult ? g.stats.noticeMult() : 1;
    g.change('stats.needs.stress', minutes / 60 * 20 * sev * (cover < 1 ? 0.7 : 1), { silent: true });   // the stress lives here (Jimmy dropped his)
    return;   // NPC + town rep (Roy) and school rep (Ted) read exposed(); no spotted rolls here so nothing is counted twice
    var acc = (w._exAcc = (w._exAcc || 0) + minutes); if (acc < 30) return; w._exAcc = acc % 30;
    var busy = g.world && g.world.crowd ? g.world.crowd() : 0.5;
    if (Math.random() > Math.min(0.95, 0.15 + busy * sev)) return;
    var campus = g.world && g.world.onCampus && g.world.onCampus();
    var what = ex.lower === 'bare' ? 'with nothing on' : ex.lower === 'under' ? 'in your underwear' : 'without a top';
    if (g.notify) g.notify('People are staring. You\'re out ' + what + '. Get dressed or find somewhere to hide.', 'down', 'exposed');
    if (g.emit) g.emit('spotted', { kind: 'exposed', by: campus ? 'students' : 'public', student: !!campus, src: 'wardrobe', severity: sev, what: what });
    if (g.emit) g.emit('exposed', { severity: sev, upper: ex.upper, lower: ex.lower, where: hereId() });
  }

  /* underlayers + jacket: drying, slow wear, wear from being soaked, and the cold */
  function tickLayers(minutes, state) {
    var w = W(), tags = hereTags(), out = tags.indexOf('outdoors') >= 0, g = G_();
    var wx = (g.world && g.world.weather) ? String(g.world.weather()) : '', raining = /rain|storm|drizzle|snow|sleet/i.test(wx);
    pullLive();
    var c = C();
    // anything sitting at 100% wetness loses a little integrity (about 1 point an hour)
    ['under_top', 'under_bottom', 'top', 'bottom', 'outer'].forEach(function (sl) {
      var it = wornItem(sl); if (!it || def(it).disposable) return;
      if (it.wet >= 100) damage(it, minutes / 60);
    });
    // underlayers dry toward the layer over them; a worn jacket dries when you're out of the rain
    var ut = wornItem('under_top'), ub = wornItem('under_bottom'), jk = wornItem('outer');
    if (ut) ut.wet = Math.max(Math.min(ut.wet, (c.upperWetness || 0) + 10), ut.wet - minutes * 0.15);
    if (ub && !def(ub).disposable) ub.wet = Math.max(Math.min(ub.wet, (c.lowerWetness || 0) + 10), ub.wet - minutes * 0.15);
    if (jk && !(out && raining)) jk.wet = Math.max(0, jk.wet - minutes * (out ? 0.08 : 0.15));
    // slow everyday wear on underlayers, and on a jacket worn outside
    if (ut) ut.integ = Math.max(0, ut.integ - minutes * 0.0007);
    if (ub && !def(ub).disposable) ub.integ = Math.max(0, ub.integ - minutes * 0.0007);
    if (jk && out) jk.integ = Math.max(0, jk.integ - minutes * 0.0005);
    [ut, ub, jk].forEach(function (it) { if (it && it.integ <= 0 && !it._ruinNote) damage(it, 0); });
    // the cold: outside below 10C you want warm layers, and a soaked jacket only does half its job
    var temp = (g.world && g.world.temp) ? g.world.temp() : 12;
    if (out && temp < 10) {
      var need = temp < 0 ? 13 : temp < 5 ? 10 : 7, short = Math.max(0, need - warmth()) / 2;
      if (short > 0) {
        g.change('stats.needs.stress', minutes / 60 * 3 * short, { silent: true });
        g.change('stats.needs.fatigue', minutes / 60 * 2 * short, { silent: true });
        if (g.notify) g.notify(jk ? (jk.wet >= 100 ? 'Your ' + def(jk).name + ' is soaked through and the cold gets in.' : 'You\'re shivering. Your ' + def(jk).name + ' isn\'t warm enough for this.') : 'You\'re cold. A jacket would help.', 'down', 'wardrobe-cold');
      }
    }
    syncLayers();
  }

  var mod = {
    id: 'wardrobe',
    init: function (state) { ensure(state); },
    onTick: function (minutes, state) {
      var w = ensure(state); if (!w.starter) return;
      pullLive();
      // soiled bottoms: stress builds while worn; a restroom clean-up or shower (Jimmy clears stats.flags.dirty) rinses them out
      var sw = soiledWorn();
      if (sw.length) {
        var sf = state.stats && state.stats.flags;
        if (sf && !sf.dirty) sw.forEach(function (it) {
          if (def(it).disposable) { var nb = supplies() ? freshBrief() : (takeOff('under_bottom'), null); if (G_().notify) G_().notify(nb != null ? 'You clean up and change into a fresh brief.' : 'You clean up and bin the used brief. You\'re out of fresh ones.', 'info', 'soiled'); return; }
          it.soiled = false; it.soiledAt = null; if (G_().notify) G_().notify('You rinse out your ' + def(it).name + '. It still needs a proper wash.', 'info', 'soiled');
        });
        else if (G_().change) G_().change('stats.needs.stress', minutes / 60 * 6, { silent: true });
      }
      tickLayers(minutes, state);
      tickExposure(minutes, state);
      w.items.forEach(function (it) { if (SLOTS.every(function (s) { return w.worn[s] !== it.uid; })) it.wet = Math.max(0, it.wet - minutes * 0.2); });
      syncSpare();
    },
    getOptions: function (state) {
      var out = { dialogue: [], actions: [], travel: [], other: [] }, w = ensure(state);
      if (!w.starter) return out;
      var hid = hereId(), tags = hereTags(), home = tags.indexOf('home') >= 0;
      if (hid !== STORE && w.mode && w.mode.indexOf('wardrobe') !== 0) w.mode = null;
      if (!home && hid !== STORE && w.mode && w.mode.indexOf('wardrobe') === 0) w.mode = null;

      if (w.mode && w.mode.indexOf('wardrobe') === 0) { wardrobeOptions(out, home ? 'home' : 'fitting'); return out; }
      if (hid === STORE) {
        if (!isOpen(STORE)) { out.actions.push(opt('Browse the racks', function () { return { text: '', minutes: 0 }; }, { disabled: true, reason: 'Closed. Open 9am to 7pm', section: 'shop', icon: '👀' })); return out; }
        storeOptions(out);
        if (!w.mode) out.other.push(opt('Use the fitting room', function () { w.mode = 'wardrobe'; return { text: '<p>' + line('fit', ['You pull the velvet curtain across. The mirror is kind; the lighting is not.', 'The fitting room smells of cedar and someone else\'s perfume. A hook, a stool, a long mirror.', 'You tug the curtain shut. It stops two inches short of the wall, as fitting room curtains always do.']) + '</p>', minutes: 1 }; }));
      }
      var exn = exposure();
      if ((exn.lower || exn.upper === 'bare') && inPublic()) out.other.unshift(opt('Find somewhere out of sight to hide', function () {
        w.hidingAt = hid; if (G_().world && G_().world.setPrivate) G_().world.setPrivate(true, 'hiding');
        return { text: '<p>You duck behind the nearest thing big enough to hide behind and stay very still. Nobody can see you here, but you can\'t stay forever. You need clothes, or to get home.</p>', minutes: 5 };
      }, { time: 5 }));
      var hr = G_().world && G_().world.here ? G_().world.here() : null;
      if (hr && hr.restroom && !home && supplies()) changeBriefOption(out);
      else if (hr && hr.restroom && !home && wearingBriefUsed()) out.actions.push(opt('Change your brief', function () { return { text: '', minutes: 0 }; }, { disabled: true, reason: 'No spare briefs. Buy a pack at the market or Threadbare', time: 4 }));
      if (hid === 'market' && isOpen('market')) briefPackOption(out, 'market', 'Groceries');
      if (home && w.laundry && w.mode !== 'wardrobe') out.actions.push(opt(w.laundry.until <= absMin() ? 'Collect your laundry' : 'Check on your laundry', function () { w.mode = 'wardrobe'; return { text: '<p>You head down to the laundry room.</p>', minutes: 2 }; }, { time: 2, icon: '🧺' }));
      if (home) out.other.push(opt('Open your wardrobe', function () {
        w.mode = 'wardrobe';
        var n = w.items.length, dirty = w.items.filter(function (it) { return !it.clean; }).length;
        var h = hourNow(), mood = h < 7 ? 'In the grey pre-dawn light you squint at the hangers.' : h < 11 ? line('wopen', ['Morning light falls across the hangers.', 'You stand in front of the wardrobe, already thinking about coffee.']) : h < 18 ? line('wopen', ['The wardrobe door sticks, as always.', 'You tug the wardrobe open. Something slides off a hanger and you leave it there.']) : h < 22 ? line('wopen', ['The desk lamp throws long shadows into the wardrobe.', 'You open the wardrobe and give tomorrow a moment of thought.']) : 'It\'s late, and every option looks the same in lamplight.';
        return { text: '<p>' + mood + ' You own ' + n + ' pieces of clothing' + (dirty ? ', and ' + dirty + ' of them are in the laundry pile' : '') + '.</p><p>' + esc(describeOutfit()) + '</p>', minutes: 1 };
      }));
      return out;
    }
  };

  function boot() {
    var g = G_();
    if (!g || !g.register) return setTimeout(boot, 20);

    if (g.world && g.world.addLocation) g.world.addLocation(STORE, {
      name: 'Threadbare & Co.', district: 'Town', indoor: true, open: [9, 19], restroom: false, tags: ['public', 'mirror'],
      desc: 'A narrow clothing shop with creaky floorboards, racks sorted by colour, and a velvet-curtained fitting room. The owner hums along to the radio.'
    }, [['shopping_centre', 1]]);

  function autoFx(o) {
    var l = o.label || '', m = /\(\$(\d+)\)/.exec(l);
    if (!o.effects) { var fx = [];
      if (m) fx.push(/^Sell/.test(l) ? '^+$' + m[1] : '!−$' + m[1]);
      if (/fresh .*brief|Put on a .*brief/i.test(l)) fx.push('^Fresh brief');
      if (/out of sight/.test(l)) fx.push('^Out of sight', '^Stops the reputation loss');
      if (/^Mend your clothes \(/.test(l)) fx.push('^Repairs clothes', '^+Housekeeping');
      if (/^Have your/.test(l)) fx.push('^Repairs clothes');
      if (/^Throw away/.test(l)) fx.push('Removes ruined clothes');
      if (fx.length) o.effects = fx; }
    if (o.disabled && !o.reason && m && money() < +m[1]) o.reason = 'Needs $' + m[1];
  }
  var ICON = function (o) { var l = o.label || ''; return /brief|diaper/i.test(l) ? (/^Buy/.test(l) ? '📦' : '🩲') : /out of sight|hide/i.test(l) ? '🫣' : /laundry/i.test(l) ? '🧺' : /^(Mend|Have your|Buy a sewing)/.test(l) ? '🪡' : /^(Sell|Throw away)/.test(l) ? '♻️' : /^Buy/.test(l) ? '🛍️' : /^(Browse|Check the clearance)/.test(l) ? '👀' : /fitting room/i.test(l) ? '🚪' : /wardrobe|drawer|Back to your clothes/i.test(l) ? '🚪' : /undressed|^Take off/.test(l) ? '👕' : /^Wear/.test(l) ? '👕' : /Step back/.test(l) ? '↩️' : '👕'; };
  (function (gofn, pick) { mod.getOptions = function (state) { var out = gofn.apply(this, arguments); if (out) ['actions', 'other', 'dialogue'].forEach(function (k) { (out[k] || []).forEach(function (o) { if (o && !o.section) o.section = pick(o, state); if (o && !o.icon) o.icon = ICON(o); autoFx(o); }); }); return out; }; })(mod.getOptions, function (o, st) { var l = o.label || '', m = (st.wardrobe && st.wardrobe.mode) || ''; if (/^Buy /.test(l)) return 'shop'; if (/brief|diaper|hide|out of sight/i.test(l)) return 'needs'; if (m.indexOf('shop') === 0 || /^(Browse|Check the clearance|Sell|Have your|Step back|Use the fitting room|Leave the fitting room)/.test(l)) return 'shop'; return 'self'; });
    g.register(mod);
    if (g.on) {
      g.on('start', function (state) { ensure(state); giveStarter(state); });
      g.on('accident', function (e) {
        if (!W() || !W().starter || (e && (e.absorbed || e.contained))) return;
        var k = e && (e.kind || e.type), ub = wornItem('under_bottom');
        if (ub) { soak('under_bottom', k === 'bladder' || k === 'pee' ? BLADDER_ML : 60); ub.clean = false; if (def(ub).absorb) { ub.ml = def(ub).absorb.ml; ub.wet = 100; } }
        syncLayers();
        if (k !== 'bowels' && k !== 'poo' && k !== 'soiled') return;
        if (markSoiled() && g.notify) g.notify('Your ' + (wornItem('bottom') ? def(wornItem('bottom')).name : 'underwear') + ' are soiled. Change and wash them before people notice the smell.', 'down', 'soiled');
        if (g.emit) g.emit('soiled', { id: wornItem('bottom') && wornItem('bottom').id });
      });
      // pet-themed clothes: pets out with you perk up a little each hour you wear them
      g.on('tick', function (m) {
        try {
          if (!g.pets || !g.pets.following) return;
          var n = 0; ['top', 'outer'].forEach(function (sl) { var d = def(wornItem(sl)); if (d && d.pet) n++; });
          if (!n) return;
          var acc = (W()._petAcc = (W()._petAcc || 0) + (m && m.minutes || m || 0));
          if (acc < 60) return; W()._petAcc = acc % 60;
          g.pets.following().forEach(function (p) { if (g.pets.addHappiness) g.pets.addHappiness(p.id, 2 * n); });
        } catch (e) {}
      });
      g.on('tick', function (m) {
        try {
          var w = W(); if (!w || !w.starter) return;
          var sets = activeSets(); if (!sets.length) { w._setAcc = 0; return; }
          var acc = (w._setAcc = (w._setAcc || 0) + ((m && m.minutes) || 0)); if (acc < 60) return; w._setAcc = acc % 60;
          var hid = hereId(), tags = hereTags(), out = tags.indexOf('outdoors') >= 0, wx = (g.world && g.world.weather) ? g.world.weather() : '';
          var temp = (g.world && g.world.temp) ? g.world.temp() : 12;
          sets.forEach(function (st) {
            var ok = (!st.where || st.where.indexOf(hid) >= 0) && (!st.home || tags.indexOf('home') >= 0) &&
              (!st.rainy || (out && /rain|storm|drizzle/.test(wx))) && (!st.cold || (out && (temp < 6 || season() === 'winter'))) && (!st.hot || temp >= 22);
            if (!ok) return;
            if (st.stress) g.change('stats.needs.stress', st.stress * 5, { silent: true });
            if (st.fatigue) g.change('stats.needs.fatigue', st.fatigue * 5, { silent: true });
            if (st.thirst) g.change('stats.needs.thirst', st.thirst * 5, { silent: true });
            if (st.beauty && tags.indexOf('public') >= 0 && g.stats && g.stats.train) g.stats.train('beauty', st.beauty);
            if (st.pets && g.pets && g.pets.following) g.pets.following().forEach(function (p) { if (g.pets.addHappiness) g.pets.addHappiness(p.id, st.pets); });
          });
        } catch (e) {}
      });
      g.on('newDay', function () {
        var w = W(); if (!w || !w.starter) return;
        pullLive();
        ['top', 'bottom'].forEach(function (s) { var it = wornItem(s); if (it) it.days++; });
        var st = style();
        if (st >= 6 && g.stats && g.stats.train) g.stats.train('beauty', Math.round(st / 2));
      });
      // Outer layers and boots keep some rain off. Accidents set wetness directly, so they never reach here.
      g.on('change', function (d) {
        if (!d || d.delta <= 0 || !W() || !W().starter) return;
        if (d.path !== 'stats.clothing.upperWetness' && d.path !== 'stats.clothing.lowerWetness') return;
        if (hereTags().indexOf('outdoors') < 0) return;
        var outer = def(wornItem('outer')), shoes = def(wornItem('shoes')), share = 0, by = '';
        var jk = wornItem('outer');
        if (d.path === 'stats.clothing.upperWetness' && outer && outer.rain) { share = outer.rain; by = outer.name; }
        if (d.path === 'stats.clothing.lowerWetness') {
          if (outer && outer.rainL) { share = outer.rainL; by = outer.name; }
          if (shoes && shoes.rainL && shoes.rainL > share) { share = shoes.rainL; by = shoes.name; }
        }
        if (jk && outer && by === outer.name) {
          if (jk.wet >= 100) share = share * 0.3;
          jk.wet = Math.min(100, jk.wet + d.delta * share * (d.path === 'stats.clothing.upperWetness' ? 1 : 0.5) * (300 / Math.max(def(jk).abs || 0, 100)) * (1 - (outer.rain || 0) * 0.8));
        }
        var back = Math.round(d.delta * share);
        if (back > 0) { g.change(d.path, -back); g.notify(jk && jk.wet >= 100 && by === outer.name ? 'Your ' + by + ' is soaked through.' : 'Your ' + by + ' kept some of the rain off.', 'info', 'wardrobe-rain'); }
        var thru = d.delta - Math.max(0, back), ul = wornItem(d.path === 'stats.clothing.upperWetness' ? 'under_top' : 'under_bottom');
        if (ul && thru > 0 && !def(ul).disposable) ul.wet = Math.min(100, ul.wet + thru * 0.5 * (150 / Math.max(def(ul).abs || 0, 50)));
        syncLayers();
      });
      // sturdier clothes lose integrity more slowly
      g.on('change', function (d) {
        if (!d || d.delta >= 0 || !W() || !W().starter) return;
        var slot = d.path === 'stats.clothing.upperIntegrity' ? 'top' : d.path === 'stats.clothing.lowerIntegrity' ? 'bottom' : null;
        if (!slot) return;
        var jk = wornItem('outer');
        if (slot === 'top' && jk && d.delta <= -2) { var half = -d.delta / 2; jk.integ = Math.max(0, jk.integ - half); g.change(d.path, half, { silent: true }); syncLayers(); if (jk.integ <= 0) damage(jk, 0); return; }
        var dd = def(wornItem(slot)); if (!dd || !dd.dur || dd.dur <= 1) return;
        var back = -d.delta * (1 - 1 / dd.dur);
        if (back > 0.05) g.change(d.path, back, { silent: true });
      });
    }
    if (g.addTab) g.addTab({
      id: 'wardrobe', label: 'Wardrobe', order: 36,
      render: function (state) {
        var w = ensure(state); if (!w.starter) return '<p class="flavor">Your bags are still packed.</p>';
        pullLive();
        var rows = SLOTS.map(function (slot) {
          var list = w.items.filter(function (it) { return def(it).slot === slot; }).map(function (it) {
            var d = def(it), on = w.worn[slot] === it.uid;
            var fr = it.integ / maxOf(it), cond = it.integ <= 0 ? 'ruined, throw it away' : fr >= 0.8 ? 'like new' : fr >= 0.5 ? 'worn' : fr >= 0.2 ? 'fraying' : 'falling apart';
            var wet = it.wet >= 100 ? ', soaked' : it.wet >= 50 ? ', wet' : it.wet >= 20 ? ', damp' : '';
            var load = d.absorb && (it.ml || it.lb) ? ', ' + fillWord(bfill(it)) : '';
            return '<li>' + (on ? '<b>' + esc(d.name) + '</b> (wearing)' : esc(d.name)) + ', ' + cond + (it.soiled ? ', soiled' : it.clean ? '' : ', needs washing') + wet + load + '<br><small class="flavor">' + esc(statLine(it)) + '</small></li>';
          }).join('');
          return '<div class="char-row"><b>' + SLOT_LABEL[slot].charAt(0).toUpperCase() + SLOT_LABEL[slot].slice(1) + '</b><ul style="margin:4px 0 0 18px;padding:0">' + (list || '<li><i>none</i></li>') + '</ul></div>';
        }).join('');
        var doll = window.Creation ? Creation.paperdollSVG(state.creation.player, 4) : '';
        return '<h3>Wardrobe</h3><p class="flavor">Everything you own, folded or otherwise. Change at home or in the fitting room at Threadbare &amp; Co. in the Riverside Shopping Centre.</p>' +
          '<div style="display:flex;gap:16px;align-items:flex-start">' + doll + '<div><p>' + esc(describeOutfit()) + '</p><p>Style: ' + style() + '/10, ' + vibe() + ' look.</p>' +
          (window.Salon && Salon.makeupNote && Salon.makeupNote() ? '<p>' + esc(Salon.makeupNote()) + '</p>' : '') + '</div></div>' + rows +
          '<h4>Outfit sets</h4><ul style="margin:4px 0 0 18px;padding:0">' + SETS.map(function (st) {
            var have = Object.keys(st.pieces).every(function (sl) { return st.pieces[sl].some(function (id) { return w.items.some(function (it) { return it.id === id; }); }); });
            return '<li>' + (setDone(st) ? '<b>' + esc(st.name) + '</b> (wearing)' : esc(st.name) + (have ? ' (you own the pieces)' : '')) + ': ' +
              esc(Object.keys(st.pieces).map(function (sl) { return st.pieces[sl].map(function (id) { return CATALOG[id].name; }).join(' or '); }).join(' + ')) + '. <i>' + esc(st.bonus) + '</i></li>';
          }).join('') + '</ul>' + (supplies() ? '<p class="flavor">Briefs in the drawer: ' + Object.keys(stock()).filter(function (k) { return stock()[k]; }).map(function (k) { return stock()[k] + ' ' + CATALOG[k].name + (stock()[k] > 1 ? 's' : ''); }).join(', ') + '.</p>' : '') + (w.sewingKit ? '<p class="flavor">You have a sewing kit for mending at home.</p>' : '');
      }
    });
  }

  window.Wardrobe = {
    CATALOG: CATALOG, spriteOutfit: spriteOutfit, style: style, vibe: vibe, describeOutfit: describeOutfit,
    worn: function (slot) { var it = wornItem(slot); return it ? it.id : null; },
    owns: function (id) { return !!(W() && W().items.some(function (it) { return it.id === id; })); },
    SETS: SETS, activeSets: function () { return activeSets().map(function (s) { return s.id; }); },
    accessory: function (slot) { var it = W() && wornItem(slot); return it ? it.id : null; },
    soiled: soiled, isSoiled: soiled, soiledHours: soiledHours, markSoiled: markSoiled,
    absorb: absorb, wearingBrief: function () { var b = W() && wornItem('under_bottom'); return !!(b && def(b).absorb); }, briefFull: briefFull, briefs: supplies, lastUse: function () { return LAST; }, briefFill: function () { return bfill(wornItem('under_bottom')); }, briefBulk: briefBulk, briefNoise: briefNoise, briefWeight: briefWeight, BLADDER_ML: BLADDER_ML, POO_LB: POO_LB,
    layer: function (name) { var sl = { jacket: 'outer', outer: 'outer', upper: 'top', lower: 'bottom', underUpper: 'under_top', underLower: 'under_bottom', under_top: 'under_top', under_bottom: 'under_bottom', top: 'top', bottom: 'bottom' }[name]; if (!sl || !W()) return null; pullLive(); var it = wornItem(sl); return it ? { id: it.id, name: def(it).name, wetness: Math.round(it.wet), integrity: Math.round(it.integ), soiled: !!it.soiled, warmth: warmOf(it), warmthLevel: lvl(warmOf(it)), maxIntegrity: maxOf(it), bagginess: def(it).bag || 0, absorption: def(it).abs || 0, bulk: sl === 'under_bottom' ? briefBulk() : 0, noise: sl === 'under_bottom' ? briefNoise() : 0, fill: def(it).absorb ? bfill(it) : null, status: def(it).absorb ? fillWord(bfill(it)) : null } : null; },
    exposed: function () { var e = exposure(); if (!(e.lower || e.upper === 'bare') || !inPublic()) return false; return { upper: e.upper, lower: e.lower, naked: e.upper === 'bare' && e.lower === 'bare' }; },
    exposure: exposure, isNaked: isNaked, exposedInPublic: function () { var e = exposure(); return !!((e.lower || e.upper === 'bare') && inPublic()); },
    conceal: conceal, briefVisible: briefVisible, soak: soak, stats: function (id) { var d = CATALOG[id]; return d ? { maxIntegrity: maxOf(id), warmth: d.warm || 0, bagginess: d.bag || 0, absorption: d.abs || 0 } : null; }, LEVEL: LEVEL,
    warmth: warmth, layers: function () { syncLayers(); var c = C(); return { underUpperWetness: c.underUpperWetness, underUpperIntegrity: c.underUpperIntegrity, underLowerWetness: c.underLowerWetness, underLowerIntegrity: c.underLowerIntegrity, jacketWetness: c.jacketWetness, jacketIntegrity: c.jacketIntegrity, diaper: c.diaper }; },
    give: function (id, andWear) { if (!CATALOG[id]) return; var it = newItem(id); if (andWear) wear(it.uid); syncSpare(); }
  };
  if (window.G) window.G.wardrobe = window.Wardrobe;   // alias so either name works
  boot();
})();
