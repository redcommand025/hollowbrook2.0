# Slice-of-life sandbox: team contract (owner: Jenny)

Plain HTML5 + vanilla JS, no build step, no external CDNs. Open index.html directly.

## Content guardrails (non-negotiable)
- Setting: a small town with a residential COLLEGE ("Hollowbrook College"). Every character, player included, is 18+. Say "college/students", never high school or ages under 18.
- Romance is wholesome-to-sexual: dating, flirting, kissing, etc. 
- Bladder/bowels/accidents are survival-sim needs, written detailed (embarrassment, stress, wet clothes). 
- Skulduggery is light-touch petty crime with consequences, not violence.
- Grounded tone: creative but not outlandish. Non-human NNPCs are subtle folklore (e.g. a fox-eared florist), and beasts monsters.

## Files and owners
- index.html, css/style.css, js/engine.js (state, time ticks, screen render, save/load, notify)  -> Jenny
- js/modules/creation.js (world/character creation, paperdoll, NNPC gender/appearance tab)  -> Lucy
- js/modules/stats.js (skills tiers F..S, Beauty/Physique/Willpower/Awareness, traits, attitudes, transformations, needs: fatigue/stress/control/bladder/bowels/thirst/hunger, clothing wetness/integrity, character menu tabs)  -> Jimmy
- js/modules/world.js (set map + locations, travel times, clock/calendar, weather, random events)  -> Ron
- js/modules/school.js (classes, timetable, grades, delinquency, exams) + skulduggery + tending/farm  -> Ted
- js/modules/npcs.js (named NPCs: Influential, Teachers, Students, Neighbors, Outcasts, Non-Human; schedules, dialogue trees, reputation, romance, quests, journal)  -> Roy
- js/modules/doll.js (procedural pixel-art paperdoll, G.doll)  -> paperdoll owner; other modules only call its API

## Module API (engine.js exposes window.G)
G.state            single save-able object. Each module owns G.state.<module> (creation, stats, world, school, npcs).
G.register(mod)    mod = { id, init(state), onTick(minutes, state), getOptions(state) -> {dialogue:[], actions:[], travel:[], other:[]} }
   option = { label, run(state) -> { text: "story html", minutes: N } }
G.story(html)      replaces the story text (no log).
G.notify(msg, kind) appends a stat-change line under the story, e.g. "Stress +40", kind: "up"|"down"|"info".
G.change(path, delta) changes a numeric stat, clamps, and auto-notifies. e.g. G.change('stats.needs.bladder', 50)
G.on(event, fn) / G.emit(event, data)  events: 'tick', 'arrive', 'newDay', 'action'.
G.time             {day, hour, minute, weekday}; owned by world.js, read by everyone.

Main screen order: story text, then Dialogue / Actions / Travel / Other. Side panel: Money, Fatigue, Stress, Control, Bladder, Bowels, Thirst, Hunger, and a "Character" button (Characteristics, Status, Clothing, Journal tabs).
NNPC names are fixed constants; only gender/appearance are editable at creation.
Put questions for the user as "@red [question]"; ask Jenny everything else.

## Engine is live (Jenny, v0.1). Extra API beyond the above
- Meter directions: fatigue, stress, bladder, bowels are BAD WHEN HIGH. thirst, hunger, control are GOOD WHEN HIGH (1000 = fully hydrated/fed). Drinking/eating = positive G.change on thirst/hunger.
- Ranges: stats.needs.* clamp 0..1000, stats.clothing.* clamp 0..100, money >= 0. Override with G.limits['path'] = [min,max]; friendly notice names via G.labels['path'] = 'Name'.
- Starting state: money 40, needs {fatigue 0, stress 100, control 800, bladder 150, bowels 100, thirst 800, hunger 750}, clothing wetness 0 / integrity 100.
- G.addTab({ id, label, order, render(state) -> html }) adds a Character menu tab. Suggested orders: characteristics 10, status 20, clothing 30, journal 40.
- G.get(path) / G.set(path, v) read/write state paths. G.change(path, delta, {silent:true}) skips the notice.
- G.state.lock = { reason, allow: ['dialogue'] } hides other option groups (class in session, passed out). Options with always:true ignore locks. Clear with G.state.lock = null.
- G.interrupt({ text, minutes }) forces a scene outside the normal option flow (e.g. passing out).
- Option fields: label, run, disabled, hint (tooltip), always. Also time/icon/check/section/priority/sub (below), and `effects` / `reason` (see "Effect previews, locked choices, collapsible sections").
- Tick order: world.onTick first (owns the clock), then the other modules. Autosave to localStorage after every action.
- Number keys 1-9 pick visible options. Test harness: tests/engine-test.html.

## dorm.js (Jenny)
Furniture at 'furniture_store', delivered 08:00 next day, 12 space units in dorm_room. Room tab at order 45.
G.dorm.has(id) for: topper, bed, curtains, lamp, chair, bookshelf, fridge, kettle, rug, lights, plants, mirror, records, mat, wardrobe, petbed, cattree, tank.
G.dorm.studyBonus() (0..0.25, multiply study gains: Ted), G.dorm.sleepBonus(), G.dorm.extraOutfitSpace() (Lucy), G.dorm.comfort().
Pets (Jimmy): petbed, cattree, tank are pet furniture; lizards should require tank.

## Hair (Lucy, js/modules/salon.js)
State `G.state.hair {length cm, natural, dyed, dyeDays, lastCut}`. Grows ~1 cm per game week; short cuts grow out into longer styles.
`G.salon.length()`, `band()` (buzzed|short|ear|chin|shoulder|midback|waist), `lengthWord()`, `scruffy()`, `rootsShowing()`, `faded()`, `dyed()`, `natural()`, `daysSinceCut()`, `note()`.
Event `hairChanged {what: cut|dye|grow|style, style, color}`. Location `hair_salon` (Ron).


## Banners
`G.addBanner(fn)`: fn() returns an HTML string or null, re-evaluated every render, and shown in a persistent strip above the story text (not replaced by turn text).


## Action times
Every option should declare `minutes` (aliases `mins`, `time`; a number or a function(state) returning one) matching the minutes its run() returns. The engine appends it to the label as (h:mm), e.g. `Nap for an hour (1:00)`, `Look around (0:05)`. Labels that already contain (h:mm) are left alone. For variable actions, declare the typical or minimum time. Instant UI options (menus, checks costing 0 minutes) can omit it.

### Soiled clothing (Lucy, wardrobe.js)
- On `accident` with `kind: 'bowels'` (or `'soiled'`), the worn bottoms get `soiled: true` and the event `soiled` is emitted.
- `G.wardrobe.soiled()` (alias `isSoiled()`) returns true while the worn bottoms are soiled. `G.wardrobe.soiledHours()` returns hours worn since, and `G.wardrobe.markSoiled()` sets it manually.
- Changing out of soiled bottoms, or a restroom clean-up or shower (when `stats.flags.dirty` is cleared), ends it. While soiled: style −4 and stress +6 per hour. The accident event can use `kind` or `type`. Soiled items can't be worn again until laundry.

### Inventory (Lucy, inventory.js)
- Builds on Jimmy's `G.groceries`, and sets `G.groceries.limit` to 24 portions, or 36 with a canvas tote bag ($8 at the grocer).
- The Bag tab lists `G.groceries.list()` with counts and anything gone off.
- `G.inventory.limit()`, `used()`, `room()` and `hasTote()`.

## Clothing layers and stats (Lucy, wardrobe.js)
- Slots: under_top, under_bottom, top, bottom, shoes, outer (jacket), plus head/face/ears/neck. stats.clothing.upper*/lower* = outer top/bottom (unchanged).
- Mirrored: stats.clothing.underUpperWetness/Integrity, underLowerWetness/Integrity, jacketWetness/Integrity, diaper.
- Every item: integrity (current/max; cheap thin pieces have a lower max), warmth 0-4 (scaled by integrity), bagginess 0-4, absorption in ml.
- Integrity 0 = ruined: no wash, no mend, only "Throw away". 100% wetness costs ~1/hour; soiling costs 15.
- G.wardrobe: absorb(kind), soak(slot, ml) -> overflow ml, layer(name) -> {wetness, integrity, maxIntegrity, warmth, warmthLevel, bagginess, absorption, soiled},
  conceal('lower'|'chest'|'stash') -> 0-4, briefVisible(), warmth(), stats(id), LEVEL, soiled(), wearingBrief(), briefFull(), briefs().
- Undressing (Lucy): any slot can be taken off at home or in the fitting room ("Get undressed" removes all). G.wardrobe.exposure() -> {upper, lower} each null | 'under' | 'bare'; isNaked(); exposedInPublic() (false at home, in the fitting room, or while hiding).
- In public while exposed: stress, and every 30 min a crowd-weighted chance of `spotted {kind:'exposed', by:'students'|'public', src:'wardrobe', severity}` plus an `exposed` event. "Find somewhere out of sight to hide" stops it until you move.
- Paperdoll: tears/holes by integrity fraction, darker when soaked, stain when soiled, underwear shown when bottoms are off, black censor bars when bare.

### Brief types (wardrobe.js, Lucy)
- One pee = 400 ml (`Wardrobe.BLADDER_ML`), one poo = 0.5 lb (`Wardrobe.POO_LB`). `absorb(kind, amount)` returns true (all held), a number (only that much held, the rest overflows), or false (none held).
- Types, with what each holds before leaking, plus bulk and noise (0–4):

  | id | Name | Holds | Bulk | Noise | Pack |
  |---|---|---|---|---|---|
  | `inc_brief` | Regular plastic-backed | 1400 ml / 4 lb | 2 | 2 | 10 for $16 |
  | `brief_large` | Large plastic-backed | 2200 ml / 6 lb | 3 | 3 | 10 for $22 |
  | `brief_ultra` | Ultra plastic-backed | 4000 ml / 9.3 lb | 4 | 3 | 6 for $28 |
  | `brief_hyper` | Hyper plastic-backed | 6000 ml / 12.9 lb | 4 | 4 | 4 for $30 |
  | `pullup` | Pull-up | 800 ml / 1.5 lb | 1 | 1 | 12 for $15 |
  | `cloth_brief` | Cloth | 600 ml / 1 lb | 0 | 0 | $9 each, reusable |

- Cloth briefs are reusable: they go through laundry, which empties them.
- Bulk grows as a brief fills: +1 at 50%, +1 more at 85%, and cloth grows by 1 at most. Plastic gets one step louder at 50%.
- Hooks: `briefFill()` (0..1), `briefBulk()`, `briefNoise()`, `briefWeight()` (lb), `briefVisible()` (bulk is greater than `conceal('lower')`), and `briefs(id?)` for stock.
- `stats.clothing.diaperFill` is the fill as a percentage.

## Action sections (priority order)
The engine groups every option into sections, top to bottom: `now` (Right now: class, shifts), `needs`, `here`, `people`, `shop`, `self` (Getting ready), `travel`.
Set `section: 'now'|'needs'|'here'|'people'|'shop'|'self'|'travel'` on an option to place it; otherwise it is guessed from the label, `sub`, and its group (`dialogue` goes to People, `travel` goes to Travel). `priority: 'top'` or `urgent: true` also puts it in Right now.
Mirror and forecast options only show in the dorm room (set `anywhere: true` to override).
Within a section, a numeric `priority` sorts higher first; `pin: true` or `priority >= 90` puts it in Right now.

## Option icons & checks (engine, 20261019p)
- `icon: '🔒'` (emoji string) is prepended to the label in `span.ico` (after the number hint). Hidden when the player turns Settings > Icons off.
- `check: 'Skulduggery: Hard'` (a string, or `function(state)` returning one) is shown after the time as `span.chk.chk-<level>`. The class is taken from the last word(s): `chk-simple | chk-easy | chk-reasonable | chk-challenging | chk-hard | chk-veryhard` (anything else gets `chk-other`). Use the stats.js difficulty words (Simple .. Very Hard). HTML in the string is stripped.
- `activity: 'Work'` (optional) names the bucket the action's hours go to in the ledger (see below).
- `G.act(opt, {k: group})` is what the click handler calls; `meta` is optional for modules calling G.act themselves.

## Ledger: G.log(kind, key, amount)
- `kind`: `'earn'` (dollars, key = source e.g. job name), `'spend'` (dollars, key = place/shop), `'hours'` (hours, key = activity).
- Stored in `G.state.ledger.weeks[week] = { earn:{}, spend:{}, hours:{}, totals:{earn, spend, hours} }`, week = `floor((day-1)/7)+1` (`G.weekOf(day)`). Only the last 8 weeks are kept. `G.ledgerWeek(w)` reads one.
- Automatic logging (the engine guesses when you don't): `G.change('money', d)` logs spend (d < 0) or earn (d > 0) under the current location's name, and each action's elapsed minutes are logged as hours under `opt.activity` or a section-based name (Class and work, Travel, Socialising, Shopping, Getting ready, Looking after yourself, Out and about; Sleep / Waiting / Study by label).
- If a module calls `G.log` for a kind during an action, the engine's automatic entry for that kind is skipped for that action, so nothing is double-counted. Pass `G.change('money', d, {noLog:true})` for transfers that should never count (refunds, debug).
- Money set directly (`G.state.money = x`) is not logged.
- The Character menu "Stats" tab (id `ledger`, order 65) shows this week and last week: earnings by source, spending by place, hours by activity, totals and net.

## Need words (panel + mobile bar)
- The panel uses `G.stats.needWords(id, value)` (a string, or `{text, level}`) and `G.stats.needLevel(id, value)` (0 fine .. 6 critical) when they exist: `Bladder: You need to go soon`, raw number in the `title` tooltip.
- Bars are coloured on a 7-step scale, CSS classes `lvl0..lvl6`: green, teal, blue, purple, pink, orange, red. Without stats.js helpers the level is computed from value/1000 (direction-aware) and the number is shown.
- `G.needInfo(id, value) -> {text, level, value}` is the engine's guarded wrapper; use it for any UI.
- Setting `needDisplay: 'words'|'numbers'` (default words).
- Mobile (< 720px): a sticky `#mbar` at the top shows the time, money and the 2-3 worst needs (level >= 2). Tapping it toggles the full panel (`body.panel-open`); the panel is collapsed by default on phones. Desktop is unchanged.

## Stat-change pips
- Notices the engine formats in `G.change` (not money, not module free text from `G.notify`) show as pips when `changeStyle` is `'pips'` (default): |delta| <= 15 `+`, <= 40 `++`, otherwise `+++` (or `−` versions), with the exact number in the tooltip. `'numbers'` restores `Stress +32`. Merging repeated changes works as before. `G.pips(delta)` is exposed.

## Settings helpers: fmtClock / fmtTemp (extras.js)
- `G.settings` keys: `textSize, daySummary, numberHints, clock24 (true), tempUnit 'C'|'F' ('C'), lineHeight 'normal'|'relaxed', readableFont (false), reducedMotion (false), icons (true), needDisplay 'words'|'numbers', changeStyle 'pips'|'numbers'`. Stored in localStorage (via `G.store`), not in the save.
- `G.fmtClock(h, m)` -> `'17:05'` or `'5:05 pm'`. `G.fmtTemp(celsius)` -> `'12°C'` or `'54°F'`. Please format clocks and temperatures shown to the player through these (world.js `weatherLine` currently hard-codes °C).
- Root classes for CSS: `hb-relaxed`, `hb-readable`, `hb-reduced-motion`, `hb-noicons` on `<html>`.

## Save files
- Saves menu: Download save (.json) (Blob + `a[download]`, falling back to a copyable text box), Show save text, Load from file (`input[type=file]`), Paste save text. Loading asks for confirmation. `G.exportSave()`, `G.importSave(jsonText)`.
- `G.store.fallback` is true when real storage failed (memory only); the Saves menu then warns the player to download. It also nudges if no export in 3 in-game days (`G.state._exportDay`).

## Tips
- `G.TIPS` (array of short gameplay tips) and `G.randomTip()` (extras.js). One shows on the title screen and one at the end of each end-of-day summary. Add tips by pushing to `G.TIPS`; keep them short, grounded and true to the current game.

## Versioning
`G.version` in engine.js uses the format `vYY.MM.DD.#`, where # is the hotfix number for that day (starting at 0), e.g. `v26.10.19.0`, then `v26.10.19.1` for the first hotfix that day. Current: `v26.10.19.4`. It shows on the title screen and in the error bar. The `?v=` cache-bust in index.html uses the same string without the leading v (`?v=26.10.19.0`). Bump both on every deploy.

## Effect previews, locked choices, collapsible sections (engine, v26.10.19.1)
### `effects`: what a choice will do
- A string, an array of strings, or `function(state)` returning either. Shown as a small muted line after the label, time and check: `Wash up (0:20) +Hygiene · −$2`.
- Tokens are the array items; a string is also split on `·` or `|`. HTML is stripped.
- A token starting with `+` gets class `fx-up`, one starting with `−`, `-` or `–` gets `fx-down` (a leading `-` is shown as `−`). These are neutral on purpose: `+Stress` and `+Mood` both start with `+`.
- Prefix `!` marks a token as bad (red, `fx-bad`), `^` as good (green, `fx-good`). The prefix is not shown: `['^+Mood', '!+Fatigue', '!−$12']`.
- Don't put the duration in `effects`; declare `minutes`/`time` and the engine shows `(h:mm)`. If you do, a time-looking token (`1 hr`, `30 min`, `(0:30)`) is dropped when the engine already shows a time.
- Only show what the action really does (or usually does). Keep it to 2-4 tokens. Player setting `showEffects` (Settings > Display, default on) hides them all.
- Example: `{ label: 'Do a load of laundry', time: 45, effects: ['^Clean clothes', '!−$3'], run: ... }`

### `reason`: why a choice is locked
- A string or `function(state)`, used only when `disabled` is true. The option is greyed out, not clickable, skipped by the number keys, and the reason is shown under it in small italics with a 🔒: `🔒 Closed until 9am`. Don't add the 🔒 yourself (a leading one is stripped). HTML is stripped.
- Disabled options without a `reason` look as before (greyed, no number, `hint` as tooltip). Prefer giving a reason: `{ label: 'Buy coffee ($3)', disabled: money() < 3, reason: 'Not enough money ($3)' }`.
- Player setting `showLocked` (Settings > Display, default on): when off, every disabled option is hidden.

### Collapsible sections
- Every section heading except `now` (Right now) is a toggle button (`button.sec-tog`, `aria-expanded`). A folded section shows only its heading with a count, e.g. `Travel (6) ▸`; its options are not rendered, so number keys and hints skip them.
- Folded state lives in `G.settings.collapsed` (`{ travel: true, ... }`), saved with the other settings through `G.store` (not in the save). Settings > Display has "Expand all sections".
- `G.toggleSection(id, on?)`, `G.expandAllSections()`, `G.isSectionCollapsed(id)`. Modules shouldn't need these; use `section`/`priority` to place important choices, and urgent things in `now`, which never folds.

### Multi-step scenes (guidance for modules)
Long activities (washing up, laundry, a shopping trip, a job shift, a study session) should not be one click that eats three hours. Break them into short steps:
- Keep progress in your own module state, e.g. `G.state.school.study = { step: 2, of: 4, gained: 6 }`, and show the in-progress options only while it is active (put them in `section: 'now'` so they stay on top and can't be folded away).
- Each step is a normal option with its own `time` and `effects`, and its run() moves the step on and returns short text for that step.
- Offer a small, consistent set, in this order: **Keep going** (next step), **Take a break** (short rest, small relief, the activity stays open), **Leave / Stop** (end now, keep what you earned so far). **Leave is always last.**
- Example step options: `Keep studying (0:30) +Study · !+Fatigue`, `Take a break (0:10) ^−Stress`, `Stop studying`.
- Let needs interrupt: if a need is critical, disable Keep going with a `reason` (`You need the restroom first`) rather than hiding it.
- Clear the state when the activity finishes or the player leaves, travels, or sleeps, so a stale scene never comes back.

## Paperdoll (doll.js)
`js/modules/doll.js` is a procedural pixel-art paperdoll in ES5. It is loaded right after creation.js. Everything is drawn in code at a native 56x112 canvas and scaled up with `image-rendering:pixelated`. No image assets are used, and none may be added from other games. Style: chibi, front-facing, head about 1/3 of height, 1px outlines, 2-3 tone shading, highlights in hair and eyes.

**Guardrails.** Everyone is 18+. Bare chest (when bust > 0) and a bare lower body are always covered by black censor bars. Genitals and nipples are never drawn. Size fields change only silhouette, proportions and clothing fit. `penis` is a presentation/fit flag only: it switches the underwear to a trunk cut and slightly changes how bottoms fit. Diaper/brief fill at most adds a 1px silhouette bulge under bottoms. There are no supernatural transformations.

### Player fields (on `G.state.creation.player`; filled in by `G.doll.ensure(p)`)
| field | values | notes |
|---|---|---|
| `bodyShape` | classic, slender, curvy, soft | derived from `build`/`appearance` until the player picks one |
| `demeanor` | gentle, catty, aloof, sweet, foxy | eye shape + resting brow/mouth |
| `eyeColor` | brown, dark, hazel, amber, honey, green, emerald, teal, blue, sky, grey, steel, violet | existing creation field, extended |
| `contacts` | `{color, until}` or null | `until` is a `state.world.minutes` value; extra colours ice, rose, gold |
| `skin` (= skinTone) | porcelain, fair, light, olive, tan, golden, brown, deep, ebony | existing creation field, extended |
| `tan` | 0-100 | overall tan level |
| `tanLines` | `{region: missedTan}` | regions: face, neck, shoulders, chest, belly, hips, thigh, shin, foot, upperArm, forearm |
| `hairColor` / `hairStyle` | existing | salon dye, roots, fade and scruff are read from G.salon |
| `hairSides` | straight, wavy, curly, tucked, pigtails, ponytail, braids, bun | |
| `hairFringe` | blunt, swept, parted, curtain, spiky, wispy, choppy, none (swept back) | |
| `hairLength` | cm (optional override) | otherwise `G.salon.length()` once the game has started; stages: buzz, short, ear, chin, shoulder, mid-back, waist |
| `breastSize` | 0-4 | masc presentation is drawn flat |
| `hipSize` | 0-4 | |
| `penis` | boolean | optional; otherwise derived from `anatomy` (penis/both) |
| `freckles` | existing | |
| `dollAuto` | `{field:true}` | internal: fields still auto-derived; the creator deletes a key once the player picks |

### API (`G.doll`, also `window.HBDoll`)
- `G.doll.html(player, opts)` returns an HTML string: a `.hb-doll` div with a 2-frame sprite sheet plus a blink overlay. `opts`:
  - `scale` (default 3)
  - `outfit`: an array of item ids or `{id, wet, f, soiled, bulk}` objects, or a `spriteOutfit` object. If omitted, the live outfit is used.
  - `mannequin`, `presentation` ('fem'/'masc'), `breastSize`
  - `frames:false` for a static image
  - `temps` / `pose` for preview renders
- `G.doll.render(el, player, opts)` sets `el.innerHTML`.
- `G.doll.panelHtml(state)` is the small doll shown in `#panel`.
- `G.doll.tan(amount)` raises `p.tan` by `amount`. It records missed tan for every region currently covered by worn clothes, which creates tan lines. A negative amount fades the tan (doll.js calls `tan(-1)` each new day). It returns the new tan.
- `G.doll.setTemp(name, minutes)`, `clearTemp(name)`, `temp(name)`. Temp names: blush, tired, stressed, upset, cold, wetHair, sunburn, happy. They are stored in `G.state.doll.temps` and expire on tick.
- `G.doll.applyContacts(color, hours)` tints the eyes until expiry. `color` is any eye-colour key, including the contacts-only ice, rose and gold (`G.doll.PALETTE.contacts`).
- `G.doll.ensure(p)`, `randomize(p)`, `describe(p)`, `resolve(p, opts)` (returns the plain render config), `sheet(cfg)`, `clearCache()`, `cacheSize()`.
- `G.doll.OPTIONS` lists the creator choices. The `PALETTE` and `REGIONS` constants are also exported.
- Rendered sheets are cached by a hash of the resolved config (LRU, 90 entries), so calling `html()` on every render is cheap.

### Live states (derived automatically; no hook needed)
- tired: fatigue ≥ 700
- stressed: stress ≥ 650
- upset: stress ≥ 900
- blush:
  - `setTemp('blush')`
  - `G.wardrobe.exposedInPublic()` (strong)
  - a lock reason of `'npcs-scene'` (mild)
- cold shiver plus hugging pose: outdoors, and either temp ≤ 8 °C with warmth < 6, or temp ≤ 2 °C with warmth < 9
- wet hair: outdoors, `WEATHER[wx].wet ≥ 4`, no `state.world.umbrella`, no raincoat or hood, and no hat other than a sunhat
- covering-up pose: exposed in public, or `G.stats.covering()`
- Clothing wear:
  - integrity < 50% shows tears and a frayed hem
  - wetness darkens the item and adds drips
  - soiled adds a slight tint
  - bagginess widens the silhouette
- Breathing idle: 2 frames, CSS `steps(2)` at about 1.1s. Blink runs every ~4.4s. Both are off when `G.settings.reducedMotion` is set.

### Mannequin
`G.doll.html(null, {mannequin:true, outfit:[itemId], presentation:'fem'|'masc', breastSize})` draws a grey, featureless mannequin on a stand wearing the items. Masc is flat. Fem uses the player's breast size unless `breastSize` is given. Use it for shop previews.

### How other modules hook in
- Sunbathing, beach or park (world.js): `G.doll.tan(n)` while the player is in the sun. Add `G.doll.setTemp('sunburn', 600)` if they overdo it.
- Salon contacts (salon.js): `G.doll.applyContacts(color, hours)`. Dye, roots and length are already read from G.salon. Emitting `hairChanged {what:'style'}` lets sides/fringe re-derive.
- Scenes (npcs.js): `G.doll.setTemp('blush', 30)` for flustered moments. `'happy'` gives a big smile.
- Shops (wardrobe.js): use mannequin renders for previews.
- Panel: the engine exposes `G.addPanel(fn(state) -> html)`. Its output is prepended to `#panel` on each render. doll.js uses it for the side-panel doll, which on mobile (<720px) stays inside the collapsible panel.
- Creation: `Creation.paperdollSVG` delegates to `G.doll.html`, and the old SVG remains as a fallback. The "Look" fieldset edits the new fields.
- Tests: `tests/doll-test.html` renders 194 combinations and a contact sheet.

