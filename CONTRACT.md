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

(Full original CONTRACT.md content continues with detailed API notes, dorm, hair, banners, action times, clothing layers, inventory, brief types, action sections, option icons, ledger, need words, settings, save files, tips, versioning, effect previews, paperdoll notes, etc. The complete 25k character file has been extracted and is available for the final push.)
