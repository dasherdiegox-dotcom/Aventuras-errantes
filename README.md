# Niko and the Wandering Isles

An original, browser-playable exploration platformer starring Niko, a small island explorer. The first release is a complete, compact journey across 30 procedurally varied isles. It uses original canvas-drawn art and synthesized sound—no external game assets or gameplay network requests.

## Requirements

- A modern browser with WebAssembly support.
- Python 3 for the local static server.
- Emscripten (`emcc`) to compile the C++ movement/collision core. Install the official Emscripten SDK and activate its environment before building (`source emsdk_env.sh` on macOS/Linux, or `emsdk_env.bat` in Windows Command Prompt). No SDL, raylib, npm packages, or downloaded assets are required.

## Build and run

From the repository root:

```sh
mkdir -p build
emcc src/game.cpp -O2 -std=c++17 -s WASM=1 -s MODULARIZE=1 -s EXPORT_NAME=createGameCore -s ENVIRONMENT=web -s FILESYSTEM=0 -s EXPORTED_FUNCTIONS='["_reset_player","_clear_solids","_add_solid","_set_checkpoint","_move_player","_hurt_player","_player_x","_player_y","_player_vx","_player_vy","_player_width","_player_height","_player_grounded","_respawn_count"]' -s EXPORTED_RUNTIME_METHODS='["cwrap"]' -o build/game-core.js
python3 -m http.server 8000
```

Open <http://localhost:8000>. Serve over HTTP rather than opening `index.html` directly so the browser can load the WebAssembly module. The generated `build/` files are ignored by git and are not committed.

## Controls

- **Move:** Left/Right arrows or **A / D**
- **Jump:** **Space** or Up arrow (release early for a shorter hop)
- **Pause / resume:** **Escape** or **P**
- **Restart the current isle:** **R**
- **Start / continue:** **Enter** or click/tap the game
- **Sound:** use the visible Sound button; sound starts muted and only plays after interaction

Click the canvas first to focus it. The game pauses when its browser tab loses visibility.

## What’s in this slice

Niko explores 30 named, procedurally varied island destinations in sequence, starting at Windfall Coast. Each journey includes a scrolling multi-screen route, jumps and ledges, a moving lift, marked spike gaps and wind gusts, patrol creatures, wind-shards, a checkpoint, a clue-marked cave nook, and a lantern goal. The C++/WebAssembly core handles delta-time movement, forgiving jump timing, and solid collision; JavaScript owns input, world progression, camera, procedural canvas art, UI, and presentation.

## Debugging and checks

There is no native debug build configured. For a native C++ compiler smoke check, use `c++ -std=c++17 -Wall -Wextra -pedantic -c src/game.cpp -o /tmp/niko-game.o`. The browser build command above is the authoritative integration build. Manual play-test checklist:

1. Start with Enter/click, move with both keyboard layouts, jump and release early.
2. Traverse the camera-scroll route; confirm gaps, ledges, lift and collectibles behave as shown.
3. Touch a marked hazard or creature and confirm the player respawns; activate the mid-route checkpoint first and check the respawn location.
4. Collect shards, visit the cave, reach the lantern, and continue until the 30th isle completion screen.
5. Pause/resume, restart, resize the browser, and switch tabs to check focus and pause behavior.

## Notes

The 30 isles share the same readable core route with deterministic palette/layout variations; they are a prototype journey rather than 30 individually authored campaigns. There is no gamepad support in this initial slice. Google Fonts are an optional presentation enhancement; the game itself uses local system-font fallbacks and makes no runtime asset requests.
