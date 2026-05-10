# Game Engine Research — Battle Visualizer

**Goal:** Render a D&D tactical battle (tokens on grid, spell animations, VFX, overlays) driven by the existing combat runtime. Must be testable without a browser for AI-agent development.

**Critical criteria (ordered):**
1. **Vitest unit testable in Node.js** — no browser, no canvas, no WebGL
2. **React integration** — declarative, state-driven from runtime snapshots
3. **Scene graph inspectable** — assert positions, visibility, effects programmatically
4. **VFX capable** — particles (fire), line animations, screen dimming, text overlays
5. **Grows to tactical game** — scales beyond 6-token demo

---

## Tier 1: Strong Candidates

### SVG-in-React + Motion (Framer Motion successor)

- **Testability: EXCELLENT** — SVG elements are DOM nodes. RTL renders, queries, snapshots them. `<circle cx={90} cy={60} data-testid="wizard-A" />` is trivially assertable.
- **React integration: NATIVE** — it IS React. runtime snapshot → props → SVG attributes. Zero glue code.
- **Motion** (github.com/motiondivision/motion): Framer Motion successor, framework-agnostic with React adapter. `<motion.circle>` for animated SVG. Animation state driven by React state.
- **VFX:** SVG filters for glow/blur, `<feGaussianBlur>` for dimming. Animated `<path>` for spell lines. `<text>` for overlays. No particle system — custom `<circle>` swarm or CSS particles.
- **Bundle:** Motion ~30-40KB gzipped. SVG is free (browser-native).
- **Ceiling:** Performance degrades at ~200+ animated SVG elements. Fine for tactical D&D (rarely >20 tokens).
- **Growth path:** If SVG hits a wall, scene state layer stays, swap renderer to PixiJS/Canvas.

### Konva.js + react-konva

- **Testability: GOOD** — Scene graph objects instantiable in Node.js. Inspectable (position, visible, opacity) without rendering. Headless mode via `node-canvas` (native dependency). RTL does NOT see Konva objects (renders to canvas, not DOM).
- **React integration: NATIVE** — `react-konva` provides `<Stage>`, `<Layer>`, `<Circle>`, `<Rect>`, `<Text>` as JSX. Declarative scene graph.
- **VFX:** Canvas-based — custom draw functions, image filters, blur. No built-in particle system but canvas gives full pixel control. Hit detection built in.
- **Bundle:** ~40KB min+gz. Lightweight.
- **Ceiling:** Canvas performs well to thousands of objects. Tilemap/fog-of-war feasible.
- **Growth path:** Good for 2D tactical game. No 3D.

### PixiJS v8 + @pixi/react

- **Testability: POOR** — Scene graph inspectable (Container/Sprite tree, positions, visibility) but rendering needs Electron/real canvas. `@pixi/react` bypasses DOM — RTL can't query. PixiJS's own tests use `@pixi/jest-electron`.
- **React integration: NATIVE** — `@pixi/react` v8 provides JSX elements for all Pixi objects.
- **VFX: EXCELLENT** — `ParticleContainer` (100K+ particles), filters (blur, glow, displacement), Graphics for shapes. Best VFX of any 2D option.
- **Bundle:** ~150-200KB gzipped (tree-shakeable).
- **Ceiling:** Effectively none for 2D. Used in commercial games.
- **Growth path:** Strongest 2D renderer. Spine integration for skeletal animation.

---

## Tier 2: Viable with Tradeoffs

### Three.js + React Three Fiber (R3F)

- **Testability: GOOD** — `@react-three/test-renderer` renders R3F trees without WebGL. Scene objects fully inspectable. Known Vitest ESM bug with workarounds.
- **React integration: EXCELLENT** — Declarative Three.js in JSX. Mature ecosystem (drei, postprocessing).
- **VFX: EXCELLENT** — Shaders, postprocessing, anything imaginable.
- **Ceiling:** Unlimited (it's a full 3D engine).
- **Tradeoff:** 3D complexity for a 2D problem. Camera setup, z-fighting, coordinate systems all add friction for 2D use.

### Pure Canvas + GSAP

- **Testability: GOOD (with architecture)** — Separate scene model (pure data) from draw function. Test model with vitest. GSAP timelines inspectable: `tl.progress()`, `tl.seek()`, `tl.getChildren()`. Canvas draw calls mockable with `vitest-canvas-mock`.
- **React integration: MANUAL** — Canvas via `useRef` + `useEffect`. Not declarative.
- **VFX:** Full pixel control. Custom particle systems. GSAP timeline sequencing perfect for spell cast → interrupt → resolve.
- **Tradeoff:** Maximum control, maximum boilerplate. No scene graph — you build everything.

---

## Tier 3: Not Recommended

### Phaser v3/v4

- **Testability: POOR** — Requires jsdom + node-canvas even in HEADLESS mode. Tightly coupled scene lifecycle.
- **React integration: POOR** — "Two apps side by side" via event bus. Phaser owns the game loop.
- **Why not:** Designed for standalone browser games, not React-embedded components. Testing story is "extract logic out of Phaser" — defeats the purpose.

### Excalibur.js

- **Testability: POOR** — No headless mode. Testing via Puppeteer screenshots only.
- **React integration: NONE** — Mount canvas manually.
- **Why not:** Pre-1.0 for 10+ years. Small community. No browser-free testing.

### Kaplay (Kaboom successor)

- **Testability: POOR** — Takes over the page. No React story.
- **Why not:** Game jam tool, not embeddable component. ECS conflicts with the event-driven model.

### Fabric.js

- **Why not:** Canvas editor toolkit (Canva-like). Overkill features (object manipulation, selection, grouping) we don't need. Poor React integration.

### p5.js

- **Why not:** Creative coding / generative art. Immediate-mode rendering (no scene graph). Requires `window`. Paradigm fights React.

### Paper.js

- **Why not:** Effectively dead (last release Nov 2022).

---

## Animation-Only Libraries (pair with a renderer)

### Rive

- Runtime for pre-built animations (character idles, spell effects). Has state machines that respond to triggers — maps well to turn-based events. `@rive-app/react-canvas`. No Node.js headless (WASM runtime). Use for animation assets, not as the renderer.

### Lottie (dotlottie-react)

- After Effects animation export format. Pre-baked only, no interactivity. Use for polished effect animations (fireball explosion, shield shimmer). Not a renderer.

### Spine

- Skeletal animation runtime. Pairs with PixiJS (`spine-pixi-v8`). For character animation, not scene rendering. Requires Spine editor license ($70+).

---

## FRP / Functional Animation Approach

### Conal Elliott's Functional Reactive Animation

The theoretical ideal: animation = `Time → Value`. Position is a continuous function, not imperative tween state. Composition is function composition. Pure, testable, declarative.

**JS implementations:**
- `sodium-typescript` — FRP library, push-based. Maintained but tiny community.
- `@funkia/hareactive` + `@funkia/turbine` — FRP framework for UI. Academic flavor, small community.

**Verdict:** Academically beautiful, practically risky. No React integration, no community, no VFX ecosystem. The insight (animation as pure function of time) can be applied within any engine — define your scene state as `(BattleContext, time) → SceneState` regardless of renderer.

### Motion Canvas

- Programmatic animation-as-code using generator functions and signals. By aarthificial.
- Designed for **video production** (explainer videos, presentations), not interactive apps.
- Has its own runtime, not embeddable in React.
- Great for pre-rendering demo videos of battles, not for interactive game UI.

### Theatre.js

- Programmatic animation studio. Visual timeline editor + code API.
- `@theatre/r3f` for Three.js integration.
- More suited for cinematic sequences than interactive game state.

---

## Recommendation Matrix

| Criterion | SVG+Motion | Konva | PixiJS | R3F | Canvas+GSAP |
|-----------|-----------|-------|--------|-----|-------------|
| Vitest (no browser) | **Native** | Scene graph only | Scene graph only | Test renderer | Model only |
| RTL compatible | **Yes** | No | No | Via test-renderer | No |
| React integration | **Native** | Native | Native | Native | Manual |
| VFX power | Low-Med | Medium | **High** | **High** | Medium |
| Bundle | ~35KB | ~40KB | ~175KB | ~170KB | ~30KB |
| Growth to tactical game | Medium | Good | **Excellent** | Excellent (3D) | Medium |
| AI-agent writability | **Excellent** | Good | Moderate | Good | Good |

**For this project:** SVG+Motion for the demo and MVP. Scene state as pure functions (testable). If VFX needs outgrow SVG, swap renderer to PixiJS — the scene state layer stays.
