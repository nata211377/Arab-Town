# Arab Town

A sun-soaked open-world crime game set in Qamar City, a desert-coast Arab
city of six districts — Old Souq, Marina, Palm Heights, Date Gardens, Port
and Al-Bahr. Explore it on foot and by car, in the spirit of GTA Chinatown
Wars, as an original game with its own city, characters and story.

## Play

Open `game/index.html` in a desktop browser (or serve `game/` with any
static file server). No network is needed; everything is local files and
synthesized sound.

- **WASD / arrows** — walk, or drive when in a car (W accelerate, S brake
  and reverse, A/D steer, Space handbrake)
- **E** — get in or out of a car, start a mission, buy ammo, repaint
- **Mouse** — aim; **click** shoots the pistol, **F** punches, **R** reloads
- **P / Esc** — pause; **Q** on the pause screen saves and quits to title
- **M** — mute

## The city

- Six districts with their own ground, colours and landmarks, a road grid,
  a harbour and the Port's container yards
- Traffic cars and pedestrians on the streets; cars can be stolen (E)
- A wanted level of 0–5 stars: steal, shoot or run someone over and the
  police come after you. Get caught on foot and you are BUSTED — fined and
  sent to the clinic. Lose the heat at Qamar Customs (repaint, $200) or by
  lying low.
- Combat: pistol with a magazine and reserve ammo, and a punch
- Money: mission rewards ($150–$800), taxi fares when driving a cab, cash
  pickups, health and ammo pickups, an ammo shop and a repaint garage
- Six story missions with dialogue: Rashid, Layla and Omar against the Sand
  Vipers — a taxi homecoming, a police escape, a timed delivery, a dockside
  shootout, a car-theft job and a finale at the Vipers' hideout
- HUD with health, money, wanted stars, ammo, speedometer and a minimap
  with mission, police and shop blips; title, pause, BUSTED and KNOCKED OUT
  screens; progress saves to localStorage automatically

## Structure

`game/src/` is one small module per job:

| file | job |
| --- | --- |
| `rng.js` | seeded random numbers (the city is deterministic per seed) |
| `tune.js` | world size, roads, districts, places, prices |
| `state.js` | the whole game state in one object |
| `city.js` | city generation and collision geometry |
| `sfx.js` | synthesized WebAudio sound (engine, siren, shots, coins) |
| `keys.js` | keyboard and mouse input |
| `walker.js` | the player on foot, shooting, punching, bullets |
| `driver.js` | cars: the player, traffic, police, pedestrians |
| `wanted.js` | the wanted level, police response, BUSTED / KNOCKED OUT |
| `jobs.js` | the six missions, dialogue and rival AI |
| `economy.js` | pickups, taxi fares, ammo shop, repaint garage |
| `paint.js` | all drawing: city, cars, HUD, minimap, screens |
| `save.js` | localStorage save and load |
| `stage.js` | the playtest staging handle (`window.__arab`) |
| `boot.js` | wiring and the game loop |

`main.ts` (Node 22) copies `game/` and `screenshots/` to the output
directory and writes `dossier.json` with the kit's `buildDossier`.

## License

MIT — see `LICENSE`.
