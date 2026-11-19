# Arab Town

An original top-down 2D open-world crime game set in **Qamar City**, a sun-soaked
desert-coast Arab city. Built for the make.fun bounty "Make GTA 6" (gta6-01).

Drive, steal cars, run taxi fares, outrun the police — and finish all six story
missions. Everything in it is original: the city, the characters, the vehicles,
the story, the art and the sound. Nothing is taken from any commercial game.

## Play

Open `game/index.html` in a desktop browser (serve the `game/` folder with any
static server, e.g. `python3 -m http.server` from inside `game/`), or run
`node serve.ts` from the kit. No network connection is needed: the game is
plain static files, and all sound is synthesized with WebAudio.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot, drive |
| Shift | Run |
| E | Get in / out of a car, use a shop |
| Mouse + click | Aim and shoot the pistol |
| F | Punch |
| R | Reload |
| Space | Confirm |
| P / Esc | Pause |
| M | Mute |

## The city

Qamar City has six districts — the Old Souq, the Marina, Palm Heights, Date
Gardens, the Port and Al-Bahr — joined by a road grid along the western sea
and the southern desert dunes. Traffic drives the roads, people stroll the
sidewalks, and the police answer a five-star wanted level with cars and
officers on foot. At four stars and above the screen edges pulse red while
the whole city hunts you.

## The story

1. **Welcome Home** — Rashid's taxi, and a spice run to the Souq.
2. **The Package** — a delivery from the Port to Palm Heights, on the clock.
3. **Night Shift** — three taxi fares across town.
4. **The Debt** — chase Omar's coupe and collect what he owes.
5. **Dockside Trouble** — a shootout with the Sand Vipers at the Port.
6. **The Getaway** — steal the white sports car at the Marina and lose the police.

Progress (money, missions, the story) saves itself to localStorage, and again
the moment a mission is finished.

## Layout

- `game/index.html` — the page; `game/src/` holds the game's own source, one
  job per file: `config.js`, `city.js`, `traffic.js`, `police.js`,
  `missions.js`, `world.js`, `render.js`, `audio.js`, `input.js`, `save.js`,
  `shots.js`, `random.js`, `main.js`.
- `screenshots/` — four real renders of the game running in a browser.
- `main.ts` + `vendor/makefun-game.ts` — the make.fun hand-in program and its
  library (from the competition kit).

## License

MIT — see `LICENSE`.
