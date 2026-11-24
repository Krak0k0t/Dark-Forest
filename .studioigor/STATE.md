# studioigor — NAV: Темнолесье

PROJECT: NAV: Темнолесье
PHASE: 0 — Start
UPDATED: 2026-11-23 09:26

## Now
Completed Campaign Chapters I–III (`CHAPTER_DEFS` + unlock progression + multi-monolith victory), Save/Load Battle (`persistence.ts` + Pause modal Save/Load + Title Continue Battle), Tactical Squad Formations (`line`, `wedge`, `box`), Control Groups (`Ctrl+1..3` / `1..3` + clickable HUD chips), and Hero Ability Autocast (`evaluateAbilityAutocast` + corner Auto toggles). 20/20 unit tests, build, lint, and Desktop/Mobile browser checks verified.

## Open questions
- none

## Session log
| date | phase | done | next |
|---|---|---|---|
| 2026-11-23 00:25 | 0 — Start | Built Phase 5-7 look-dev + core RTS vertical slice (Voivode hero Q/W/E, workers, Ratnik/Luchnik/Volkhv, 3 waves + Leshy boss, 3D PBR + unit tests) | Review playable vertical slice with user and refine style/mechanics |
| 2026-11-23 00:37 | 0 — Start | Applied AAA Visual Upgrade (PBR normal/roughness maps, twilight sky dome, multi-layer terrain shader, animated river, 3-tier wind-swaying taiga, volumetric sun shafts, flickering fire lights, ACES+Bloom+Vignette EffectComposer) | Playtest in preview and tune combat pacing, obsidian shader sheen, or new units/buildings |
| 2026-11-23 01:22 | 0 — Start | Completed AAA visual overhaul: calibrated envMapIntensity & chiaroscuro dusk lighting, volumetric 3-tongue brazier fires, gabled Barracks roof + heraldic shields, matte basalt Monolith + jagged menhirs + cracked emerald Nav decal, FBM moss/mud terrain shader, multi-directional shimmering river water, bridge lanterns, deformed conifer boughs, and 3D multi-frond forest ferns | Ready for next gameplay step (Fog of War, worker building construction, or 2nd hero) |
| 2026-11-23 02:00 | 0 — Start | Implemented 3D + minimap Fog of War (`fog.ts`, 48x48 shroud texture + culling), Worker building construction (Vezha, Kapishche, Kazarma with 3D ghost & timber scaffolding), and 2nd Hero Vedunya Lada (`[F2]`, Moroz Chill, Spirit Wolves, Sacred Mist, frost bolt + shared XP) | Expand tech upgrades, hero relics, or additional map encounters |
| 2026-11-23 02:40 | 0 — Start | Implemented Tech Tree & Druzhina Upgrades (`forged_blades`, `bodkin_arrows`, `oak_shields`, `rod_blessing`) with shared `getUnitEffectiveStats`, plus 4 guarded Nav Creep Camps dropping 3D Slavic Relic Chests (`living_water`, `perun_amulet`, `rod_ward`, `svarog_ring`, `veles_cloak`) and 4-slot Hero Relic Belt HUD | Add save/load campaigns, additional maps, or difficulty/boss expansions |
| 2026-11-23 09:26 | 0 — Start | Implemented 3-Chapter Campaign (`CHAPTER_DEFS` + unlock persistence + Victory Next Chapter), Save/Load Battle (`persistence.ts` + Title Continue + Pause Save/Load), Squad Formations (`line`, `wedge`, `box`), Control Groups (`Ctrl+1..3` / `1..3`), and Hero Ability Autocast | Ready for new maps, neutral merchants, or Steam/PWA packaging |
