---
prd: true
id: PRD-20260309-string-bounce
status: CRITERIA_DEFINED
mode: interactive
effort_level: Extended
created: 2026-03-09
updated: 2026-03-09
iteration: 0
maxIterations: 128
loopStatus: null
last_phase: PLAN
failing_criteria: []
verification_summary: "0/42"
parent: null
children: []
---

# String Bounce — Musical Bouncing Ball Instrument

> An interactive web toy where balls fall under gravity, bounce off user-drawn strings, and each string plays a musical note tuned to its length. Physics meets music meets play.

## STATUS

| What | State |
|------|-------|
| Progress | 0/42 criteria passing |
| Phase | PRD written, awaiting implementation |
| Next action | Build implementation |
| Blocked by | Nothing |

## CONTEXT

### Problem Space
A creative interactive instrument where the joy comes from drawing strings and hearing the music that emerges as balls bounce through your creation. Inspired by Scratch-style playfulness but with real physics and real (synthesized) audio. The magic moment: you draw a few angled lines, drop balls, and a melody emerges.

### Reference / Inspiration
- Otomata by Batuhan Bozkurt (grid-based musical toy)
- Wintergatan Marble Machine (physical version of this concept)
- Patatap (sound + visual feedback)
- Scratch music projects

### Tech Stack
- **Language:** TypeScript (strict mode)
- **Rendering:** HTML5 Canvas 2D
- **Audio:** Web Audio API (OscillatorNode + GainNode)
- **Build:** Vite (fast dev, easy deploy)
- **Deploy:** GitHub Pages or Vercel (static)
- **No frameworks.** This is a self-contained creative toy. Vanilla TS + Canvas + Web Audio.

### Key Files (to be created)
- `src/main.ts` — Entry point, game loop, event handling
- `src/physics.ts` — Ball physics, gravity, collision detection
- `src/audio.ts` — Web Audio synthesis, scale mapping, string sounds
- `src/drawing.ts` — User interaction, line drawing, string management
- `src/renderer.ts` — Canvas rendering, visual effects
- `src/types.ts` — Shared type definitions
- `index.html` — Single page with canvas
- `vite.config.ts` — Build config

### Constraints
- Must work on desktop (mouse) AND mobile (touch)
- Web Audio requires user gesture to unlock — need a "tap to start" overlay
- Performance: must handle 50+ balls and 20+ strings at 60fps
- All audio must be synthesized (no sample files to load)
- Must feel musical — not random noise
- Canvas fills viewport, resizes on window resize/orientation change. Strings use absolute pixel coordinates (don't scale on resize). Ball positions clamp to new bounds.
- Scale canvas by `window.devicePixelRatio` for crisp rendering on HiDPI/retina displays
- Maximum 100 balls on screen at once (auto-spawn stops, oldest removed) to prevent saturation

### Decisions Made
- Pentatonic scale for string-to-pitch mapping (always sounds harmonious, no dissonance)
- Dark background (navy gradient, matching Perceptum aesthetic) so glowing elements pop
- Balls emit from top of screen at random x positions
- Strings persist until user deletes them

## PLAN

### Architecture

```
Game Loop (requestAnimationFrame)
  ├── Update Physics
  │     ├── Apply gravity to all balls
  │     ├── Move balls by velocity
  │     ├── Check ball-vs-string collisions
  │     │     ├── Reflect velocity off string normal
  │     │     ├── Apply energy loss (damping)
  │     │     └── Trigger audio + visual feedback
  │     ├── Check ball-vs-floor (remove or bounce)
  │     └── Check ball-vs-walls (bounce)
  ├── Render
  │     ├── Clear canvas
  │     ├── Draw strings (with vibration effect if recently hit)
  │     ├── Draw balls (with glow/trail)
  │     └── Draw UI (ball count, controls)
  └── Spawn new balls (on timer or user action)
```

### Physics Model

**Ball:**
- Position (x, y), velocity (vx, vy), radius (6px physics, 8px visual with glow)
- Gravity: vy += GRAVITY * dt where GRAVITY = 0.3 and dt = elapsed/16.67 (frame-rate independent)
- Air resistance: velocity *= 0.999 per frame
- Bounce damping: velocity *= 0.85 on string collision
- Remove when y > canvas.height + radius (fell off bottom)

**String (line segment):**
- Two endpoints: (x1, y1) → (x2, y2)
- Length computed as Euclidean distance
- Normal vector for reflection calculation
- Collision: point-to-line-segment distance < ball radius

**Collision Response:**
- Reflect ball velocity across the string's normal vector
- Choose normal direction facing the ball: `if (dot(v, n) > 0) n = -n` before reflection
- v_reflected = v - 2(v · n)n where n is the unit normal
- Apply damping factor (0.85) to simulate energy loss
- Push ball out of collision: move ball along normal to distance = ball radius from string
- **Anti-tunneling:** When ball speed exceeds ball radius per frame, subdivide the timestep (up to 4 substeps) to prevent balls skipping over strings entirely

### Audio Model

**String length → Musical pitch:**
- Compute string length in pixels
- Map to a pentatonic scale (C major pentatonic: C, D, E, G, A)
- Shortest possible string (~50px) → highest note (C6, 1047 Hz)
- Longest possible string (~full screen diagonal) → lowest note (C3, 131 Hz)
- Quantize to nearest pentatonic note (always sounds good)
- Multiple octaves: C3-C6 range

**String length → frequency mapping:**
- Use logarithmic mapping: longer strings map to lower frequencies, shorter to higher
- `freq = C3 * Math.pow(C6/C3, 1 - (length - MIN_LEN) / (MAX_LEN - MIN_LEN))`
- Quantize result to nearest pentatonic scale note frequency

**Sound synthesis:**
- OscillatorNode with "triangle" waveform (warm, string-like tone)
- GainNode for envelope: use `linearRampToValueAtTime` for attack (10ms), `exponentialRampToValueAtTime` for decay (300ms) — avoids audio clicks
- **Node cleanup:** Call `oscillator.stop(audioCtx.currentTime + 0.4)` after decay. On `onended`, call `disconnect()` on both oscillator and gain node to prevent memory leaks
- Optional: add slight detuning (+/- 2 cents) for warmth
- Optional: reverb via ConvolverNode or delay feedback

**Visual feedback:**
- String "vibrates" when hit (oscillate perpendicular to string, decaying amplitude)
- Ball emits a brief glow/flash on collision
- Color of string glow matches its pitch (low = warm/red, high = cool/blue)

### Drawing Interaction

**Desktop:**
- Click and drag to draw a string (mousedown → mousemove → mouseup)
- Right-click on a string to delete it
- Visual preview line while dragging

**Mobile:**
- Touch and drag to draw a string
- Long-press on string to delete (600ms hold, < 10px movement threshold — if finger moves > 10px, cancel long-press and begin drawing instead)
- Prevent scroll while drawing on canvas: `preventDefault()` on touchmove + CSS `touch-action: none` on canvas element

**Constraints:**
- Minimum string length: 50px (prevent micro-strings)
- Maximum strings: 30 (performance)
- Strings cannot intersect the UI area

### Visual Design

**Aesthetic:** Dark, glowing, musical. Think neon-on-dark.
- Background: navy gradient (matching Perceptum: #060d18 → #0c1929)
- Balls: glowing circles with subtle trail, blue primary, amber accent. Use pre-rendered radial gradient on offscreen canvas (stamp-based glow), NOT runtime `shadowBlur` which tanks mobile FPS
- Strings: thin white/blue lines, glow amber when vibrating
- UI: minimal, bottom bar with ball spawn rate, clear all button
- Ball spawn: gentle fade-in at top

### User Controls
- **Draw string:** click/touch drag
- **Delete string:** right-click / long-press
- **Spawn ball:** click "drop ball" button or automatic timer
- **Clear all:** button to remove all strings and balls
- **Ball rate:** slider for auto-spawn frequency (0 = manual only, up to 5/sec)

### MVP Scope (v1.0)
1. Canvas with dark background
2. Balls with gravity
3. Draw lines with mouse/touch
4. Ball-string collision with reflection
5. Audio playback on collision (pentatonic scale)
6. String vibration visual
7. Basic UI (spawn button, clear button)
8. Works on desktop and mobile

### Future Ideas (not in v1.0)
- Record and playback sequences
- Share creation via URL encoding
- Preset "instruments" (piano, marimba, harp sound)
- Multiple ball sizes with different tones
- Gravity direction control
- Obstacle blocks (silent, just redirect)
- MIDI output

## IDEAL STATE CRITERIA (Verification Criteria)

### Physics

- [ ] ISC-PHYS-1: Balls accelerate downward under constant gravity each frame | Verify: Browser: drop ball, observe accelerating descent
- [ ] ISC-PHYS-2: Balls reflect off strings at physically correct angles | Verify: Browser: draw horizontal line, drop ball, observe symmetric bounce
- [ ] ISC-PHYS-3: Balls lose energy on each string collision via damping factor | Verify: Browser: observe decreasing bounce height after successive hits
- [ ] ISC-PHYS-4: Balls bounce off left and right canvas walls correctly | Verify: Browser: throw ball at wall, observe reflection
- [ ] ISC-PHYS-5: Balls disappear when falling below the canvas bottom edge | Verify: Browser: observe balls removed after falling off screen
- [ ] ISC-PHYS-6: No ball tunneling through strings at high velocities | Verify: Browser: drop ball from max height onto thin string
- [ ] ISC-PHYS-7: Collision detection uses point-to-segment distance not infinite line | Verify: Browser: ball passes beyond string endpoint without colliding

### Audio

- [ ] ISC-AUD-1: Web Audio context activates after first user gesture interaction | Verify: Browser: tap overlay, confirm audio works
- [ ] ISC-AUD-2: Each string collision triggers a synthesized tone on impact | Verify: Browser: drop ball onto string, hear sound
- [ ] ISC-AUD-3: Shorter strings produce higher pitched notes than longer strings | Verify: Browser: draw short and long string, compare pitches
- [ ] ISC-AUD-4: All pitches quantized to C major pentatonic scale notes | Verify: CLI: inspect frequency table in audio.ts
- [ ] ISC-AUD-5: Tone envelope has fast attack and natural-sounding decay curve | Verify: Browser: listen for clean attack without click, smooth fade
- [ ] ISC-AUD-6: Triangle wave oscillator produces warm string-like timbre quality | Verify: Browser: listen for warmth, not harsh square/saw
- [ ] ISC-AUD-7: Multiple simultaneous collisions produce polyphonic layered audio correctly | Verify: Browser: multiple balls hit strings at once, hear multiple notes
- [ ] ISC-AUD-8: Pitch range spans C3 to C6 mapped across possible string lengths | Verify: CLI: verify frequency range 131-1047 Hz in code

### Drawing & Interaction

- [ ] ISC-DRAW-1: Mouse click-drag creates a string between start and endpoint | Verify: Browser: click-drag, see string appear
- [ ] ISC-DRAW-2: Touch drag creates a string on mobile devices correctly | Verify: Browser: test with mobile emulation touch events
- [ ] ISC-DRAW-3: Live preview line visible while user is actively drawing | Verify: Browser: observe dashed line following cursor during drag
- [ ] ISC-DRAW-4: Strings shorter than fifty pixels are rejected not created | Verify: Browser: tiny drag produces no string
- [ ] ISC-DRAW-5: Right-click on existing string deletes it from the canvas | Verify: Browser: right-click string, observe removal
- [ ] ISC-DRAW-6: Maximum thirty strings enforced with visual feedback when full | Verify: Browser: draw 31 strings, see rejection message
- [ ] ISC-DRAW-7: Canvas touch events prevent page scrolling during string drawing | Verify: Browser: touch-draw on mobile, page stays still

### Visual Rendering

- [ ] ISC-VIS-1: Dark navy gradient background matching Perceptum site aesthetic | Verify: Browser: screenshot, compare gradient colors
- [ ] ISC-VIS-2: Balls render as glowing circles with subtle motion trails | Verify: Browser: observe ball glow and trailing effect
- [ ] ISC-VIS-3: Strings visually vibrate with decaying amplitude when struck | Verify: Browser: observe oscillation animation on hit
- [ ] ISC-VIS-4: String glow color reflects its pitch from warm to cool | Verify: Browser: compare short string (blue) vs long string (warm)
- [ ] ISC-VIS-5: Ball emits brief flash of light on collision with string | Verify: Browser: observe flash at impact point
- [ ] ISC-VIS-6: Canvas renders at sixty frames per second without dropped frames | Verify: Browser: FPS counter or performance tab shows 60fps
- [ ] ISC-VIS-7: Balls fade in gently when spawning at top of screen | Verify: Browser: observe new ball alpha transition

### UI & Controls

- [ ] ISC-UI-1: Tap-to-start overlay unlocks Web Audio before any interaction | Verify: Browser: see overlay, tap, overlay disappears
- [ ] ISC-UI-2: Drop Ball button spawns a single ball at random x position | Verify: Browser: click button, ball appears at top
- [ ] ISC-UI-3: Clear All button removes every ball and string from canvas | Verify: Browser: click clear, canvas is empty
- [ ] ISC-UI-4: Auto-spawn rate slider controls balls per second from zero to five | Verify: Browser: slide to 3, observe ~3 balls/sec spawning
- [ ] ISC-UI-5: Ball count and string count displayed in minimal bottom bar | Verify: Browser: observe counters updating in real-time
- [ ] ISC-UI-6: UI elements do not overlap the drawing canvas interaction area | Verify: Browser: draw near UI, no interference

### Integration & Performance

- [ ] ISC-INT-1: Application loads and runs from single HTML page via Vite | Verify: CLI: `npm run dev` serves working page
- [ ] ISC-INT-2: Fifty balls and twenty strings maintain sixty fps frame rate | Verify: Browser: spawn 50 balls + 20 strings, check performance
- [ ] ISC-INT-3: Application works in Chrome Firefox and Safari latest versions | Verify: Browser: test in multiple browsers
- [ ] ISC-INT-4: Touch and mouse input both work without code path conflicts | Verify: Browser: test mouse then emulated touch
- [ ] ISC-INT-5: No console errors or warnings during normal application usage | Verify: Browser: check console after 2min of interaction

### Anti-Criteria

- [ ] ISC-A-AUD-1: No harsh clicking or popping artifacts in audio playback | Verify: Browser: listen carefully during rapid collisions
- [ ] ISC-A-AUD-2: No dissonant note combinations possible from string length mapping | Verify: CLI: verify all frequencies are pentatonic scale members
- [ ] ISC-A-PHYS-1: Balls never get stuck vibrating inside a string endlessly | Verify: Browser: observe ball behavior at various angles
- [ ] ISC-A-VIS-1: No visual glitches when multiple balls hit same string simultaneously | Verify: Browser: mass drop onto one string
- [ ] ISC-A-PERF-1: No memory leak from accumulating audio nodes over time | Verify: Browser: run 10min, check memory tab stability

## DECISIONS

*(To be filled during implementation)*

## LOG

### Iteration 0 — 2026-03-09
- Phase reached: PLAN (PRD written)
- Criteria progress: 0/42
- Work done: Full PRD with architecture, physics model, audio model, drawing interaction, visual design, and 42 ISC criteria across 7 domains
- Failing: All (not yet implemented)
- Context for next iteration: Ready to implement. Start with Vite project scaffold, then physics, then audio, then drawing, then visuals, then UI.
