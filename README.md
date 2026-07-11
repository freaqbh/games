# ASHGROVE: The Last Visit

A browser-based 3D horror game built with Three.js, HTML, and JavaScript. No external assets — all textures, audio, and 3D models are procedurally generated.

## Story

You play as Daniel Cross, a journalist investigating the disappearance of your sister Emily at the abandoned Ashgrove Children's Home. Dr. Victor Hale conducted experiments on children to contact "the other side," awakening **The Hollow One** — an entity that feeds on fear and memories. Find 5 ritual items, complete the banishing ritual, and survive.

## How to Run

This game uses ES modules and requires a local web server (opening `index.html` directly with `file://` will not work due to CORS restrictions).

### Option 1: Python (simplest)

```bash
cd horror_games_web
python3 -m http.server 8000
```

Then open your browser to: `http://localhost:8000`

### Option 2: Node.js

```bash
cd horror_games_web
npx http-server -p 8000
```

Then open your browser to: `http://localhost:8000`

### Option 3: VS Code

Install the "Live Server" extension, right-click `index.html`, and select "Open with Live Server."

## Controls

| Key | Action |
|-----|--------|
| WASD | Move |
| Mouse | Look around |
| Shift | Sprint (consumes stamina) |
| C | Crouch toggle |
| F | Toggle flashlight |
| E | Interact / Pick up items / Hide |
| Tab | Toggle inventory |
| Esc | Pause menu |
| Left Click | Interact (alternative to E) |

## Gameplay Tips

- **Flashlight battery drains over time** — find batteries to keep it running
- **Stay in light** — sanity drains in darkness, causing hallucinations and visual distortion
- **Hide in cabinets or under beds** when The Hollow One is near
- **Read all notes** — they contain story, safe codes, and ritual instructions
- **Safe code is 1953** (found in Dr. Hale's journal)
- **Collect 5 ritual items** to complete the banishing ritual:
  1. Ritual Dagger — Safe in Dr. Hale's Quarters (code: 1953)
  2. Silver Chalice — Dining Hall
  3. Black Candle — Dormitory B
  4. Ancient Book — Classroom
  5. Iron Key — Infirmary

## Endings

1. **The Banishing (Good):** Complete the ritual with all 5 items
2. **The Escape (Neutral):** Flee the building without completing the ritual
3. **Consumed (Bad):** The Hollow One catches you

## Technical Details

- **Engine:** Three.js r160+ (loaded via importmap from unpkg CDN)
- **Audio:** Web Audio API with 3D spatial positioning (PannerNode)
- **Textures:** Procedurally generated via Canvas 2D API
- **3D Models:** Built from Three.js primitives and custom geometry
- **AI:** Finite State Machine with A* pathfinding
- **Post-processing:** Custom shader passes (vignette, film grain, chromatic aberration, desaturation)

## File Structure

```
horror_games_web/
├── index.html          # Entry point, CSS, UI overlays
├── README.md           # This file
└── js/
    ├── config.js       # Game constants and tunables
    ├── utils.js        # Math, RNG, pathfinding, event system
    ├── textures.js     # Procedural Canvas texture generation
    ├── effects.js      # Post-processing, particles, hallucinations
    ├── world.js        # Level generation, rooms, collectibles
    ├── player.js       # FPS controls, flashlight, sanity, inventory
    ├── audio.js        # 3D spatial audio engine
    ├── entity.js       # The Hollow One AI (FSM)
    ├── shadow_children.js  # Secondary entities
    ├── story.js        # Notes, recordings, story progression
    ├── puzzles.js      # Puzzle and ritual mechanics
    ├── jumpscares.js   # Scripted and procedural scares
    ├── ui.js           # HUD, menus, journals, endings
    └── main.js         # Game initialization and main loop
```

## Warning

This game contains intense horror, jumpscares, flashing lights, blood/gore imagery, and disturbing themes (child experimentation, trapped souls). Play with headphones in a dark room for the full experience. Not recommended for those with heart conditions.

## Credits

ASHGROVE: The Last Visit — A horror experience built with Three.js and Web Audio API.
