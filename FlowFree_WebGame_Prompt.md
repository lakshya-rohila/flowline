# FLOWLINE — WEB GAME (HTML/CSS/JS)
# For React Native WebView · Single File · Touch-First · No Framework · No Backend

---

## DELIVERY FORMAT

Produce a **single self-contained `index.html` file**. All CSS and JavaScript must be inline — no external files, no CDN imports, no fetch calls. The file must work completely offline inside a React Native `WebView` component with `originWhitelist={['*']}` and `javaScriptEnabled={true}`.

---

## REACT NATIVE WEBVIEW SETUP (reference — do not build this, just understand the context)

```jsx
// In your React Native screen:
import { WebView } from 'react-native-webview';
import { useAssets } from 'expo-asset'; // or require() for RN CLI

// Option A — local file (recommended)
const source = require('./assets/flowline/index.html');
<WebView source={source} style={{ flex: 1 }} originWhitelist={['*']} />

// Option B — injected HTML string
<WebView source={{ html: FLOWLINE_HTML }} style={{ flex: 1 }} />
```

The game must fill `100vw × 100vh` with no scroll, no overflow, no bounce. It must work on a 360px–430px wide viewport (standard Android phones).

---

## GAME NAME & IDENTITY

**Name:** FLOWLINE  
**Aesthetic:** Dark neon — near-black background, vibrant glowing pipes, minimal chrome UI  
**Font:** `'Courier New', monospace` for all UI text — gives a retro terminal feel  
**Feel:** Smooth, tactile, satisfying pipe sounds (Web Audio API tones, no files needed)

---

## CORE GAMEPLAY (same rules as Flow Free)

1. An N×N grid has colored dot pairs (endpoints).
2. Player draws paths between matching colored dots by touching and dragging.
3. ALL cells must be filled. ALL pairs must be connected. Then the puzzle is solved.
4. Paths cannot cross each other.
5. Drawing over a same-color path re-routes it from that point.
6. Drawing over a different-color path erases that path from the crossed cell forward.
7. Backtracking into your own path trims it back to that point.

---

## TECH APPROACH — HTML5 CANVAS

Use a single `<canvas>` element covering the full viewport. All rendering is done via the Canvas 2D API. No DOM elements for the grid — canvas only. DOM elements only for UI overlays (level select modal, solve overlay).

```
index.html
├── <canvas id="game">          ← full game rendering
├── <div id="hud">              ← moves, timer, filled %
├── <div id="menu-overlay">     ← level select screen
├── <div id="solve-overlay">    ← puzzle solved modal
└── <script>                    ← all game logic inline
```

---

## VISUAL LAYOUT (portrait, mobile)

```
┌─────────────────────────────┐
│  FLOWLINE      ⚙   ↩   II  │  ← header bar (48px)
│─────────────────────────────│
│  Beginner · Level 3 · 5×5  │  ← level info (32px)
│  Moves: 12    Filled: 80%  │  ← HUD row (32px)
│─────────────────────────────│
│                             │
│         [CANVAS]            │  ← grid, square, centered
│         [CANVAS]            │
│         [CANVAS]            │
│                             │
│─────────────────────────────│
│  ████████████░░░  [UNDO]   │  ← progress bar + undo (48px)
└─────────────────────────────┘
```

Canvas grid is always square:
```javascript
const PADDING = 16;
const GRID_SIZE = Math.min(window.innerWidth, window.innerHeight * 0.72) - PADDING * 2;
const CELL_SIZE = GRID_SIZE / level.size;
const GRID_ORIGIN_X = (window.innerWidth - GRID_SIZE) / 2;
const GRID_ORIGIN_Y = 112; // below header + HUD
```

---

## COLOR SYSTEM

```javascript
const PIPE_COLORS = {
  red:    '#FF3B3B',
  green:  '#2ECC71',
  blue:   '#3B9EFF',
  yellow: '#FFD700',
  orange: '#FF8C00',
  maroon: '#C0392B',
  purple: '#9B59B6',
  pink:   '#FF69B4',
  cyan:   '#00CED1',
  white:  '#F0F0F0',
  lime:   '#ADFF2F',
  teal:   '#20B2AA',
};

const UI_COLORS = {
  bg:          '#0A0A10',
  gridBg:      '#13131E',
  cellBorder:  '#1E1E2E',
  headerBg:    '#0D0D18',
  text:        '#FFFFFF',
  textDim:     '#4A5568',
  accent:      '#3B9EFF',
  solvedGlow:  '#2ECC71',
  progressBar: '#2ECC71',
};
```

---

## CANVAS RENDERING FUNCTIONS

Implement these exact rendering functions:

### `drawGrid(ctx, state)`
- Fill canvas background: `UI_COLORS.bg`
- Fill grid area: `UI_COLORS.gridBg`, rounded rect with radius 8
- Draw cell borders: `1px` lines in `UI_COLORS.cellBorder`

### `drawPipes(ctx, state)`
For each color in `state.paths`:
  - For each cell in the path, draw the pipe segment:
    - Check which of its 4 neighbors (UP/DOWN/LEFT/RIGHT) are also in this path
    - Draw a filled rect for the pipe body connecting those directions
    - Pipe width: `CELL_SIZE * 0.38`
    - Pipe color: `PIPE_COLORS[color]`
    - Center of cell: `{ x: GRID_ORIGIN_X + col * CELL_SIZE + CELL_SIZE / 2, y: GRID_ORIGIN_Y + row * CELL_SIZE + CELL_SIZE / 2 }`
    - Use `ctx.lineCap = 'round'` and `ctx.lineJoin = 'round'`
    - Draw as a polyline through all cell centers: `ctx.beginPath()`, `moveTo` first cell center, `lineTo` each subsequent center, `ctx.stroke()`

### `drawEndpoints(ctx, state)`
For each endpoint in `level.endpoints`:
  - Outer circle: `CELL_SIZE * 0.36` radius, filled with `PIPE_COLORS[color]`
  - Inner highlight: `CELL_SIZE * 0.18` radius, filled with white at 30% opacity
  - Glow: `ctx.shadowColor = PIPE_COLORS[color]`, `ctx.shadowBlur = 12`
  - Reset shadow after drawing

### `drawActiveHead(ctx, state)`
The last cell of the currently-being-drawn path gets a pulsing circle:
  - Animate via `performance.now()`: `scale = 1 + Math.sin(t / 300) * 0.12`
  - Draw circle at `CELL_SIZE * 0.28 * scale` radius
  - Color: `PIPE_COLORS[activeColor]` at 80% opacity

### `drawSolveFlash(ctx, state, animProgress)`
Called during solve animation (0 → 1):
  - All pipes briefly brighten: overlay white at `opacity = Math.sin(animProgress * Math.PI) * 0.4`

---

## FULL GAME STATE OBJECT

```javascript
const createInitialState = (level) => ({
  level,                          // current LevelConfig
  paths: {},                      // { [color]: { cells: [{row,col}], complete: bool } }
  grid: Array(level.size).fill(null).map(() => Array(level.size).fill(null)),
  activeColor: null,              // string | null
  activeHead: null,               // {row,col} | null
  moves: 0,
  startTime: null,                // Date.now() on first move
  elapsedMs: 0,
  solved: false,
  filledPercent: 0,
  history: [],                    // array of snapshots for undo (max 20)
  solveAnimProgress: 0,           // 0→1 during solve flash animation
});
```

Initialize `paths` from level endpoints:
```javascript
level.endpoints.forEach(ep => {
  if (!state.paths[ep.color]) {
    state.paths[ep.color] = { cells: [], complete: false };
  }
});
```

---

## TOUCH EVENT HANDLING

Attach to `canvas`:
```javascript
canvas.addEventListener('touchstart',  onTouchStart,  { passive: false });
canvas.addEventListener('touchmove',   onTouchMove,   { passive: false });
canvas.addEventListener('touchend',    onTouchEnd,    { passive: false });
```

Always call `e.preventDefault()` inside handlers to block page scroll inside WebView.

### Coord translation:
```javascript
function touchToCell(touch) {
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  const col = Math.floor((x - GRID_ORIGIN_X) / CELL_SIZE);
  const row = Math.floor((y - GRID_ORIGIN_Y) / CELL_SIZE);
  if (row < 0 || row >= level.size || col < 0 || col >= level.size) return null;
  return { row, col };
}
```

### `onTouchStart(e)`:
```javascript
const coord = touchToCell(e.touches[0]);
if (!coord) return;
resolveStartDrag(state, coord);
```

### `onTouchMove(e)`:
```javascript
const coord = touchToCell(e.touches[0]);
if (!coord || !state.activeColor) return;
if (coordEquals(coord, state.activeHead)) return; // same cell, skip
extendPath(state, coord);
```

### `onTouchEnd(e)`:
```javascript
state.activeColor = null;
state.activeHead = null;
```

---

## GAME ENGINE — PURE FUNCTIONS

### `resolveStartDrag(state, coord)`
```
1. Check if coord is an endpoint:
   → YES: activate that color. Clear its path from the FARTHER endpoint backward
          (keep the endpoint cell, start fresh path from tapped endpoint).
          Set activeColor, set activeHead = coord.
          Push snapshot to history.
   → NO: Check if coord is occupied in state.grid:
         → YES (color C): activate C. Trim C's path back to this cell (this cell
                          becomes the new head). Set activeColor = C, activeHead = coord.
                          Push snapshot to history.
         → NO: no-op.
```

### `extendPath(state, coord)`
```
1. If not adjacent to activeHead → ignore (finger jumped, no-op).
2. If coord is in activeColor's own path (backtrack):
   → Trim path back so coord is the new head. Update grid. activeHead = coord.
3. If coord is occupied by a DIFFERENT color's path:
   → Erase that color's path from coord onward (keep cells before coord).
   → Update grid cells to null for erased portion.
   → Mark that color incomplete.
   → Then place activeColor in coord. Update grid. activeHead = coord.
4. If coord is empty:
   → Append coord to activeColor's path. Update grid[row][col] = activeColor.
   → activeHead = coord.
5. If coord is the MATCHING endpoint for activeColor:
   → Append coord. Mark path complete.
   → activeColor = null, activeHead = null.
   → Increment moves.
   → checkSolved(state).
6. On any successful extension, increment moves if this is a new stroke.
```

### `checkSolved(state)`
```javascript
function checkSolved(state) {
  const allConnected = Object.values(state.paths).every(p => p.complete);
  const totalCells = state.level.size * state.level.size;
  const filledCells = state.grid.flat().filter(c => c !== null).length;
  state.filledPercent = Math.round((filledCells / totalCells) * 100);
  if (allConnected && filledCells === totalCells) {
    state.solved = true;
    triggerSolveSequence(state);
  }
}
```

### `applyUndo(state)`
```javascript
function applyUndo(state) {
  if (state.history.length === 0) return;
  const prev = state.history.pop();
  Object.assign(state, prev);
}
```
Store deep clones in history: `JSON.parse(JSON.stringify(stateSnapshot))`.

---

## GAME LOOP

```javascript
let lastTime = 0;

function gameLoop(timestamp) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  // Update timer
  if (state.startTime && !state.solved) {
    state.elapsedMs = Date.now() - state.startTime;
  }

  // Update solve animation
  if (state.solved && state.solveAnimProgress < 1) {
    state.solveAnimProgress = Math.min(1, state.solveAnimProgress + dt / 600);
    if (state.solveAnimProgress >= 1) showSolveOverlay();
  }

  // Render
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid(ctx, state);
  drawPipes(ctx, state);
  drawEndpoints(ctx, state);
  if (state.activeColor) drawActiveHead(ctx, state);
  if (state.solved) drawSolveFlash(ctx, state, state.solveAnimProgress);

  updateHUD(state);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
```

Canvas must be sized to device pixel ratio for sharp rendering:
```javascript
const DPR = window.devicePixelRatio || 1;
canvas.width  = window.innerWidth  * DPR;
canvas.height = window.innerHeight * DPR;
canvas.style.width  = window.innerWidth  + 'px';
canvas.style.height = window.innerHeight + 'px';
ctx.scale(DPR, DPR);
```

---

## HUD (DOM overlay, absolute positioned)

```html
<div id="hud" style="
  position: fixed; top: 48px; left: 0; right: 0;
  height: 32px; display: flex; align-items: center;
  justify-content: space-between; padding: 0 16px;
  font-family: 'Courier New', monospace; font-size: 13px;
  color: #FFFFFF; background: #0D0D18; z-index: 10;
">
  <span id="hud-pack">BEGINNER · L3 · 5×5</span>
  <span id="hud-moves">MOVES: 0</span>
  <span id="hud-time">0:00</span>
</div>
```

Update via:
```javascript
function updateHUD(state) {
  document.getElementById('hud-moves').textContent = `MOVES: ${state.moves}`;
  const s = Math.floor(state.elapsedMs / 1000);
  document.getElementById('hud-time').textContent =
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
```

Progress bar (fixed bottom, 48px height):
```html
<div id="progress-bar-bg" style="
  position: fixed; bottom: 0; left: 0; right: 0; height: 48px;
  background: #0D0D18; display: flex; align-items: center;
  padding: 0 16px; gap: 12px; z-index: 10;
">
  <div style="flex:1; height:6px; background:#1E1E2E; border-radius:3px; overflow:hidden;">
    <div id="progress-fill" style="height:100%; width:0%; background:#2ECC71;
         border-radius:3px; transition: width 0.3s ease;"></div>
  </div>
  <button id="btn-undo" onclick="applyUndo(state); render();"
    style="font-family:'Courier New',monospace; font-size:12px; color:#FFFFFF;
           background:#1E1E2E; border:1px solid #2A2A3E; padding:6px 14px;
           border-radius:4px; cursor:pointer;">
    UNDO
  </button>
</div>
```

Update progress fill:
```javascript
document.getElementById('progress-fill').style.width = state.filledPercent + '%';
```

---

## MENU OVERLAY (Level Select)

```html
<div id="menu-overlay" style="
  position:fixed; inset:0; background:#0A0A10;
  display:flex; flex-direction:column; z-index:100;
  font-family:'Courier New',monospace;
">
  <div style="padding:24px 16px 16px; font-size:28px; letter-spacing:8px;
              color:#FFFFFF; font-weight:bold;">FLOWLINE</div>

  <!-- Pack tabs: horizontal scroll -->
  <div id="pack-tabs" style="display:flex; overflow-x:auto; padding:0 16px;
                              gap:8px; scrollbar-width:none;">
    <!-- Tabs injected by JS -->
  </div>

  <!-- Level grid: 5 per row -->
  <div id="level-grid" style="flex:1; overflow-y:auto; padding:16px;
                               display:grid; grid-template-columns:repeat(5,1fr); gap:8px;">
    <!-- Bubbles injected by JS -->
  </div>
</div>
```

Level bubble states:
```javascript
// Completed: green border + checkmark
// Current: accent border
// Locked: gray, disabled
// Default: dark bg, white number
```

Pack tab active state: bottom border `2px solid #3B9EFF`, text white. Inactive: `#4A5568`.

---

## SOLVE OVERLAY

```html
<div id="solve-overlay" style="
  position:fixed; inset:0; background:rgba(0,0,0,0.85);
  display:none; align-items:center; justify-content:center;
  flex-direction:column; z-index:200;
  font-family:'Courier New',monospace;
">
  <div style="background:#13131E; border:1px solid #2ECC71; border-radius:12px;
              padding:32px 40px; text-align:center; min-width:260px;
              box-shadow: 0 0 40px rgba(46,204,113,0.3);">
    <div id="solve-stars" style="font-size:28px; letter-spacing:8px; margin-bottom:12px;">★ ★ ★</div>
    <div style="font-size:22px; letter-spacing:6px; color:#2ECC71; margin-bottom:20px;">SOLVED</div>
    <div id="solve-stats" style="font-size:13px; color:#4A5568; margin-bottom:24px; line-height:2;">
      MOVES: 12<br>TIME: 0:32
    </div>
    <button onclick="loadNextLevel()" style="
      width:100%; padding:14px; background:#2ECC71; color:#0A0A10;
      border:none; border-radius:6px; font-family:'Courier New',monospace;
      font-size:14px; letter-spacing:3px; cursor:pointer; margin-bottom:10px;">
      NEXT LEVEL
    </button>
    <button onclick="showMenu()" style="
      width:100%; padding:14px; background:transparent; color:#4A5568;
      border:1px solid #2A2A3E; border-radius:6px;
      font-family:'Courier New',monospace; font-size:14px;
      letter-spacing:3px; cursor:pointer;">
      MENU
    </button>
  </div>
</div>
```

Show with: `el.style.display = 'flex'` after solve animation completes.

---

## WEB AUDIO — PIPE SOUND (no files needed)

```javascript
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playConnectTone(colorIndex) {
  const freqs = [261, 294, 329, 349, 392, 440, 494, 523, 587, 659, 698, 784];
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.value = freqs[colorIndex % freqs.length];
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

function playSolveTone() {
  // Ascending arpeggio
  [523, 659, 784, 1046].forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    const t = audioCtx.currentTime + i * 0.12;
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.start(t); osc.stop(t + 0.3);
  });
}
```

Resume AudioContext on first touch (required by browsers):
```javascript
document.addEventListener('touchstart', () => audioCtx.resume(), { once: true });
```

---

## PERSISTENCE — localStorage

```javascript
const STORAGE_KEY = 'flowline_progress';

function saveProgress(levelId, moves, timeMs) {
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  data[levelId] = { moves, timeMs, ts: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getLevelRecord(levelId) {
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  return data[levelId] || null;
}

function isCompleted(levelId) {
  return !!getLevelRecord(levelId);
}
```

---

## LEVEL DATA — SAME FORMAT

```javascript
const PIPE_COLOR_KEYS = [
  'red','green','blue','yellow','orange',
  'maroon','purple','pink','cyan','white','lime','teal'
];

const PACKS = [
  {
    name: 'BEGINNER',
    levels: [
      {
        id: 'b01', size: 5, optimalMoves: 4,
        endpoints: [
          { color:'red',    row:0, col:0 }, { color:'red',    row:4, col:4 },
          { color:'blue',   row:0, col:4 }, { color:'blue',   row:4, col:0 },
          { color:'green',  row:0, col:2 }, { color:'green',  row:4, col:2 },
          { color:'yellow', row:2, col:0 }, { color:'yellow', row:2, col:4 },
        ],
      },
      {
        id: 'b02', size: 5, optimalMoves: 4,
        endpoints: [
          { color:'red',    row:0, col:1 }, { color:'red',    row:3, col:3 },
          { color:'blue',   row:0, col:3 }, { color:'blue',   row:2, col:0 },
          { color:'green',  row:1, col:1 }, { color:'green',  row:4, col:4 },
          { color:'yellow', row:2, col:2 }, { color:'yellow', row:4, col:0 },
        ],
      },
      {
        id: 'b03', size: 5, optimalMoves: 4,
        endpoints: [
          { color:'red',    row:0, col:0 }, { color:'red',    row:2, col:4 },
          { color:'blue',   row:0, col:2 }, { color:'blue',   row:4, col:2 },
          { color:'green',  row:1, col:0 }, { color:'green',  row:4, col:3 },
          { color:'yellow', row:0, col:4 }, { color:'yellow', row:3, col:1 },
          { color:'maroon', row:2, col:1 }, { color:'maroon', row:4, col:4 },
        ],
      },
      {
        id: 'b04', size: 5, optimalMoves: 5,
        endpoints: [
          { color:'red',    row:0, col:0 }, { color:'red',    row:4, col:0 },
          { color:'blue',   row:0, col:4 }, { color:'blue',   row:4, col:4 },
          { color:'green',  row:1, col:2 }, { color:'green',  row:3, col:2 },
          { color:'yellow', row:0, col:2 }, { color:'yellow', row:2, col:0 },
          { color:'orange', row:2, col:4 }, { color:'orange', row:4, col:2 },
        ],
      },
      {
        id: 'b05', size: 6, optimalMoves: 6,
        endpoints: [
          { color:'red',    row:0, col:0 }, { color:'red',    row:5, col:5 },
          { color:'blue',   row:0, col:5 }, { color:'blue',   row:5, col:0 },
          { color:'green',  row:0, col:2 }, { color:'green',  row:5, col:3 },
          { color:'yellow', row:1, col:1 }, { color:'yellow', row:4, col:4 },
          { color:'orange', row:2, col:4 }, { color:'orange', row:3, col:1 },
          { color:'purple', row:1, col:3 }, { color:'purple', row:4, col:2 },
        ],
      },
    ],
  },
  {
    name: 'INTERMEDIATE',
    levels: [ /* 20 levels, size: 6–7 — stub with empty array for now */ ],
  },
  {
    name: 'ADVANCED',
    levels: [ /* 15 levels, size: 7–8 */ ],
  },
  {
    name: 'EXPERT',
    levels: [ /* 10 levels, size: 8–9 */ ],
  },
];
```

---

## HEADER BAR

Fixed, 48px, `background: #0D0D18`, `z-index: 50`.

```html
<div id="header" style="
  position:fixed; top:0; left:0; right:0; height:48px;
  background:#0D0D18; display:flex; align-items:center;
  justify-content:space-between; padding:0 16px; z-index:50;
  border-bottom: 1px solid #1E1E2E;
">
  <button onclick="showMenu()" style="...">☰</button>
  <span style="font-family:'Courier New',monospace; font-size:16px;
               letter-spacing:6px; color:#FFFFFF; font-weight:bold;">FLOWLINE</span>
  <button onclick="restartLevel()" style="...">↩</button>
</div>
```

---

## ANIMATIONS CHECKLIST

| Event | Animation |
|---|---|
| Active path head | `Math.sin(t/300)` scale pulse in canvas draw loop |
| Path segment placed | Instant fill — no delay, feels snappy |
| Endpoint connected | Quick radius burst: draw circle expanding 0 → CELL_SIZE * 0.5 in 150ms |
| Pipe erased by crossing | Immediate removal, no animation |
| Solve detected | `solveAnimProgress` 0→1 over 600ms: white flash overlay on canvas |
| Solve overlay | CSS `transform: translateY(40px) → 0` + `opacity: 0 → 1`, 400ms ease-out |
| Progress bar | CSS `transition: width 0.3s ease` |
| Level bubble press | CSS `transform: scale(0.92)` on active |

---

## EDGE CASES — ALL MUST WORK

| Case | Behavior |
|---|---|
| Touch starts outside grid | No-op |
| Finger slides off grid edge | `onTouchEnd` equivalent, path stays |
| Touch jumps multiple cells (fast drag) | Only process if adjacent to current head; skip non-adjacent jumps |
| Draw same color over its own endpoint | Trim to endpoint, don't add past it |
| All pairs connected but cells unfilled | Do NOT trigger solve |
| Level already beaten (revisit) | Load fresh state; show previous record in solve overlay |
| Undo with empty history | Button visually disabled (`opacity: 0.3`), no-op on tap |
| Very fast tap (under 100ms) | Still registers as START_DRAG + END_DRAG |
| AudioContext blocked before gesture | Resume on first touchstart, never throw |

---

## WHAT TO BUILD — FINAL CHECKLIST

- [ ] Single `index.html`, no external dependencies
- [ ] Canvas renders grid, pipes, endpoints at device pixel ratio
- [ ] Touch drag draws paths correctly
- [ ] Reroute (same color mid-path drag) works
- [ ] Cross-erase (drag over different color) works
- [ ] Backtrack trims own path
- [ ] Solve detection: all connected + all cells filled
- [ ] Solve overlay with stars, moves, time
- [ ] Level select menu with 5 Beginner levels playable
- [ ] Completed levels show checkmark in menu
- [ ] Progress bar fills in real time
- [ ] Undo works up to 20 steps
- [ ] Timer starts on first move
- [ ] Web Audio tones on connect + solve
- [ ] localStorage persistence of completed levels
- [ ] No scroll, no bounce, no overflow anywhere
- [ ] Works in React Native WebView (no external fetches)
- [ ] Works at 360px viewport width

---

## DO NOT

- Do not use React, Vue, or any JS framework
- Do not import from CDN (no network inside WebView)
- Do not use fetch, XHR, or WebSocket
- Do not use `<form>` elements
- Do not add scroll to the game canvas area
- Do not use emoji as primary UI elements (text labels preferred)
- Do not lazy-load anything — everything inline in one file
- Do not use `setTimeout` for game loop — use `requestAnimationFrame`
- Do not skip DPR scaling — without it, canvas is blurry on Android
