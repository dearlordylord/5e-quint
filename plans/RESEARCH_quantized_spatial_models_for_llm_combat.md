# Quantized Spatial Models for Authoritative LLM Combat

Date: 2026-08-02

## Question

Can an authoritative multiplayer RPG server expose spatial state in a form that
LLM clients can read and reason about, while retaining mechanically meaningful
distinctions such as different reach thresholds, without requiring a full grid
or continuous geometry?

This is a tracked research note, not an architecture decision. In particular, the
repository currently assigns spatial modeling to the table/caller. Changing
that ownership for an adversarial hosted game would require an explicit owning
architecture decision rather than treating this note as authority.

## Short answer

Yes, but the software survey changes the emphasis of the earlier tabletop
survey.

The strongest software pattern is **not** “make pairwise range bands the world.”
It is:

1. keep one authoritative environment state owned by the server or simulator;
2. accept actions or intents, never client-authored consequences;
3. expose a task-relevant, often egocentric projection rather than the entire
   canonical world;
4. expose admissible actions or validate proposed actions in the environment;
5. return execution feedback and let the agent replan.

Mature spatial software usually keeps coordinates, cells, occupancy/cost grids,
or waypoint/place graphs underneath that interface. LLM and text-agent systems
then make those worlds readable by projection: room descriptions, nearby
objects, cropped symbolic maps, summarized distances, JSON subgraphs, and
admissible commands. They generally do **not** replace the canonical world with
independently mutable pairwise qualitative distances.

That does not rule out genuinely quantized canonical geometry for this game.
It means the defensible software-native version is a small finite **place/anchor
graph** with one authoritative location per combatant, plus separately modeled
passage, visibility, cover, and area relations. Creature-to-creature bands are
then derived observations. A pure all-pairs band matrix would be a novel game
state model whose transition consistency we would have to design and verify,
not an established software-industry pattern.

“Range bands,” “qualitative distance,” “topological map,” “place graph,” and
“scene graph” are all relevant terms. They refer to different layers and should
not be collapsed into one representation.

## Software state of the art

This section is the primary answer for the proposed hosted game. The tabletop
survey below is retained only as evidence about useful combat vocabularies and
mechanical abstractions.

### Evidence tiers

The sources below fall into three different categories:

- **Production/industry infrastructure and games:** Colyseus, Unity Netcode,
  Nakama, Evennia, Boston Dynamics GraphNav, ROS Nav2, and Darkest Dungeon.
  These establish deployed software patterns, but none is an LLM combat
  system.
- **Released research environments and agent systems:** TextWorld, ALFWorld,
  ScienceWorld, MiniHack/NLE, BALROG, TextArena, Voyager, SayPlan,
  ConceptGraphs, and Hydra. These provide working software or evaluated
  prototypes, but are not evidence of broad industry adoption.
- **Inference for this project:** the finite tactical-anchor model proposed
  below. No source is claimed to ship that exact combination.

### Authoritative multiplayer software separates state from requests

Colyseus documents its room state as the game’s continuous shared reality. The
server mutates that state; clients send messages requesting changes and listen
for synchronized updates. Its examples use canonical player `x`/`y` positions,
but the authority pattern is independent of the chosen geometry.
[Colyseus state synchronization](https://docs.colyseus.io/state) and
[core concepts](https://docs.colyseus.io/concepts)

Unity's Netcode for Entities is explicitly server-authoritative, with the server
executing the fixed simulation timestep and clients using prediction around
that authority. [Unity multiplayer netcode](https://docs.unity.com/multiplayer/netcode/netcode)
and [multiplayer gameplay](https://docs.unity.cn/Packages/com.unity.netcode%401.9/manual/creating-multiplayer-gameplay.html)

Nakama's authoritative match handler similarly gives server runtime code the
match loop and state-transition responsibility.
[Nakama authoritative match handler API](https://heroiclabs.com/docs/nakama/server-framework/typescript-runtime/function-reference/match-handler/)

The direct implication is about trust, not geometry: an LLM client should send
`approach enemy-2`, `move anchor-7`, or `attack enemy-2`. The match process must
authenticate the seat, check the expected revision and turn, validate the
transition, mutate canonical state, and publish the result. A client-supplied
`enemy-2 is now Near` is not state synchronization; it is an untrusted claim.

### Text software uses topological containment, commands, and validation

Evennia, a framework for online text worlds/MUDs, represents rooms as locations
and exits as directed objects with a source and destination. Traversal checks an
access lock and pre-move hooks before changing the character's single
`location`; objects in a location become that location's contents.
[Evennia exits](https://www.evennia.com/docs/latest/Components/Exits.html),
[objects](https://www.evennia.com/docs/1.x/Components/Objects.html), and
[locks](https://www.evennia.com/docs/latest/Components/Locks.html)

This is strong software precedent for a canonical named-place graph that is
human- and LLM-readable. It is also direct evidence that a room graph alone
does not answer this problem: Evennia's default model has containment and
traversal, not meaningful 5/10/15-foot distinctions inside a room.

TextWorld keeps the current world as logical facts and rules. Its `State` can
enumerate all rule instantiations applicable in that state, and the environment
derives a sorted set of admissible commands from its valid actions.
[TextWorld logical state](https://textworld.readthedocs.io/en/stable/textworld.logic.html)
and [environment implementation](https://textworld.readthedocs.io/en/1.6.2/_modules/textworld/envs/tw.html)

ALFWorld aligns a high-level TextWorld environment with embodied AI2-THOR tasks;
its official example reads `admissible_commands` from the environment and steps
the chosen command. The text abstraction is useful for high-level policy while
the embodied environment retains lower-level actuation.
[ALFWorld official repository](https://github.com/alfworld/alfworld)

ScienceWorld is another executable text simulator rather than free narration,
and TextArena's multiplayer environment contract explicitly separates state,
observations, `step`, validation, and invalid-move handling.
[ScienceWorld official repository](https://github.com/allenai/ScienceWorld) and
[TextArena environment authoring](https://www.textarena.ai/docs/create-game)

These systems support a concrete interface lesson: readable prose is an
observation, not the database. The environment owns facts and transitions and
may expose legal commands. This is particularly important when the agents are
different, potentially adversarial users.

### Commercial formation combat makes quantization canonical

Darkest Dungeon is a useful software-native counterexample to the usual hidden
grid or coordinate model. Each side is arranged into four ordered ranks. A
combat skill declares the ranks from which it can be launched and the opposing
ranks it may target; the interface highlights eligible targets. Push, pull,
shuffle, and movement skills change those discrete positions. Large enemies
occupy multiple contiguous ranks but an area attack still affects such an enemy
only once. [Darkest Dungeon official wiki, getting
started](https://darkestdungeon.wiki.gg/wiki/Getting_Started) and
[size/rank rules](https://darkestdungeon.wiki.gg/wiki/Size)

This is not a distance model in feet, and it cannot reproduce arbitrary 2D
movement. It is nevertheless strong commercial evidence for a **canonical
tactical slot lattice**: the software deliberately discards most geometry and
defines targeting directly over a tiny, comprehensible positional vocabulary.
For an LLM-first game, ranks or slots could preserve mechanically chosen
distinctions such as adjacent melee, extended reach, and back-line targeting
without claiming that every slot corresponds to a universal number of feet.

### Agent environments preserve exact worlds and vary the observation

MiniHack/NLE retains NetHack's cell map. It can expose a full or egocentric
cropped grid as glyph IDs, terminal characters, pixels, or per-cell textual
descriptions. The same world therefore supports several observation
granularities without changing its canonical geometry.
[MiniHack observation spaces](https://minihack.readthedocs.io/en/stable/getting-started/observation_spaces.html)

BALROG's MiniHack evaluation is sobering evidence about interface difficulty:
its published language-model results show very low progress on corridor,
combat, box-pushing, and quest tasks. BALROG calls MiniHack a grid-world and
uses a language wrapper for LLM interaction; it does not solve spatial
reasoning by changing NetHack's canonical map into prose.
[BALROG MiniHack documentation](https://balrog-ai.github.io/docs/envs/minihack.html)

Voyager is an especially useful software precedent. It leaves Minecraft's voxel
world and coordinate-based execution intact, but its LLM-facing observation is
lossy and task-oriented. The released observer reports exact self-position,
summarizes time into names such as `day` and `night`, reports only entities
within 32 blocks, and keeps the nearest numeric distance for each entity name;
the voxel observer reports nearby block _types_ rather than serializing every
block coordinate. Execution errors and environment feedback drive iterative
code repair.
[Voyager overview](https://github.com/MineDojo/Voyager),
[status observer](https://github.com/MineDojo/Voyager/blob/main/voyager/env/mineflayer/lib/observation/status.js), and
[voxel observer](https://github.com/MineDojo/Voyager/blob/main/voyager/env/mineflayer/lib/observation/voxels.js)

Voyager therefore supports “quantize for the LLM” but not “pairwise bands are
canonical.” Its abstraction is a projection over a more exact software world.
It is a research prototype, not an adversarial multiplayer authority model.

### Robotics uses multiple spatial layers, not one universal graph

Production robotics makes the separation even clearer. ROS Nav2 calls a regular
2D costmap—cells marked unknown, free, occupied, or inflated cost—its current
environmental representation for planning and control. It also has a route
server that plans over named nodes and directed edges for lanes, permitted
areas, or teach-and-repeat routes. Robot footprint geometry remains available
to local planning.
[Nav2 navigation concepts](https://docs.nav2.org/concepts/) and
[route server](https://docs.nav2.org/configuration/packages/configuring-route-server.html)

Boston Dynamics GraphNav is a deployed place-based navigation service whose
maps contain waypoints, edges, and sensor snapshots. The robot follows the
graph but localizes its pose against recorded metric sensor data and adapts to
obstacles inside an edge corridor. An absent edge prohibits direct GraphNav
travel even if two places appear physically close.
[GraphNav service](https://dev.bostondynamics.com/docs/concepts/autonomy/graphnav_service.html),
[map structure](https://dev.bostondynamics.com/docs/concepts/autonomy/graphnav_map_structure), and
[technical summary](https://dev.bostondynamics.com/docs/concepts/autonomy/graphnav_tech_summary.html)

The mature pattern is hierarchical: a small topological graph expresses route
choice while a metric/cell layer handles local feasibility. A graph is not
evidence that geometry disappeared.

Hydra constructs hierarchical 3D scene graphs in real time, with layers for
objects, places, rooms, and other spatial concepts, while deriving its place
topology from a Euclidean signed-distance field. ConceptGraphs builds an
object-centric graph with open-vocabulary semantic descriptors and inter-object
relations from posed RGB-D data.
[Hydra official repository](https://github.com/MIT-SPARK/Hydra) and
[ConceptGraphs project](https://concept-graphs.github.io/)

SayPlan is the closest match to the LLM-readability requirement. It gives an LLM
a JSON representation of a hierarchical 3D scene graph, lets the LLM expand and
contract nodes to focus on a task-relevant subgraph, delegates long navigation
sequences to a classical path planner, and checks proposed plans in a scene
graph simulator so infeasible actions produce feedback and replanning.
[SayPlan project](https://sayplan.github.io/)

These are academic systems. Their useful lesson is architectural: use semantic
graphs as attention and planning interfaces, and retain a deterministic
feasibility checker beneath the LLM.

### Qualitative spatial reasoning exists as software, usually as abstraction

QSRlib computes qualitative spatial relations and calculi from perceptual input
and aggregates them for inference. Its documented use case begins with RGB-D,
object recognition, and tracked entities, then abstracts those observations
into qualitative relations for activity recognition or planning.
[QSRlib documentation](https://qsrlib.readthedocs.io/)

GQR is a solver for binary qualitative constraint networks such as RCC-5 and
RCC-8. Such tools show that pairwise qualitative relations can be checked and
reasoned over; they do not provide the movement semantics, D&D range calculus,
or authoritative match protocol needed here.
[Generic Qualitative Reasoner](https://openscience.org/gqr/)

This distinction matters. A relation graph can be:

- a derived description of an underlying metric world;
- an uncertain belief/constraint network about a world; or
- the world's canonical game state.

The first two are established research uses. The third is a game-design choice
whose valid transitions must be specified explicitly.

### Are pairwise range bands canonical in software?

No convincing example was found in the surveyed production multiplayer stacks,
text worlds, agent benchmarks, robotics systems, or released LLM embodied-agent
software.

Software certainly uses _range bands_, but typically as thresholds derived from
coordinate or cell distance—for weapon falloff, sensor ranges, goal tolerances,
or an LLM observation. Software also uses pairwise qualitative relations in
scene graphs and qualitative-reasoning tools, but normally as derived semantic
facts or constraint/belief state rather than the sole authoritative dynamics of
a competitive game.

This is a bounded survey result, not a proof that no such game exists. The lack
of precedent is nonetheless a warning: independently storing
`band(a,b)`, `band(a,c)`, and `band(b,c)` shifts the hard problem into relation
consistency and multi-object movement updates.

### Software-native candidates for this game

For movement-rich encounters, the best-supported synthesis is a **finite
tactical place graph**, not a creature-pair matrix:

```text
NAVE
  west-doorway -- center-aisle -- fallen-pew -- altar-step
                         |
                     side-chapel
```

Canonical facts:

```text
occupies(fighter-1, center-aisle)
occupies(goblin-2, fallen-pew)
moveEdge(center-aisle, fallen-pew, oneStep)
separation(center-aisle, fallen-pew, Reach10)
visibility(center-aisle, fallen-pew, Clear)
coverFrom(fallen-pew, center-aisle, Half)
```

Only locations and environmental features mutate. Creature-to-creature reach,
visibility, cover, opportunity exposure, and candidate area membership are
derived from the occupied anchors. A move changes one combatant's location and
recomputes its projections. This weakens the distant connascence of a mutable
all-pairs creature matrix.

`separation` need not pretend to be Euclidean. It can be an authored relation
between stable tactical anchors, or derived from graph cost where the game
accepts path-distance semantics. This is genuine canonical quantization: the
server never needs hidden `(x,y)` coordinates if encounters are authored and
mechanics are deliberately defined over these finite relations.

The LLM receives a smaller egocentric observation:

```text
You occupy CENTER AISLE.

Enemies:
- goblin-2 at FALLEN PEW: within 10 ft reach, visible, half cover
- cultist-1 at ALTAR STEP: within 30 ft, visible, no cover

Legal movement:
- WEST DOORWAY: 1 step
- FALLEN PEW: 1 step, occupied by goblin-2
- SIDE CHAPEL: 1 step

Legal intents:
- attack goblin-2 with glaive
- approach cultist-1
- move side-chapel
```

This borrows four proven software ideas without pretending the combination is
already standard:

1. one server-owned state and request/transition protocol (multiplayer stacks);
2. one location plus directed exits/links (MUDs and route graphs);
3. task-relevant semantic projection and admissible actions (text-agent
   environments);
4. simulator validation and feedback-driven replanning (SayPlan and Voyager).

If preserving free movement matters less than maximum legibility, a second
candidate is a **formation/slot battlefield** modeled after software such as
Darkest Dungeon. It is more aggressively quantized than the place graph:

```text
ALLIES:  [rear-2: wizard] [rear-1: cleric] [front-2: fighter] [front-1: rogue]
ENEMIES: [front-1: orc] [front-2: ogre(size 2)] [rear-2: shaman]

glaive legal targets: enemy front-1, front-2
longbow legal targets: enemy front-1, front-2, rear-2
```

Here “within 5/10/15 feet” is replaced by explicit rule-relevant launch and
target sets. This is extremely readable and mechanically crisp, but it is a
larger departure from D&D spatial semantics than finite encounter anchors.

The main design choice is therefore not “coordinates or prose.” It is where to
place the quantization:

- quantizing only the **observation** is the established, lower-risk software
  pattern;
- quantizing the **canonical arena** is viable for a deliberately simplified
  rules profile, but becomes a new domain model that must define movement,
  reach, visibility, cover, and areas over the same finite vocabulary;
- quantizing independently per **creature pair** is the least local and least
  evidenced option.

## Discrete geometry kernels and LLM-facing spatial descriptions

This follow-up asks a narrower software question: if the canonical arena uses
cells plus semantic anchors, how much mature implementation can be reused, and
what representation should an LLM actually receive? The answer is encouraging
but not “install one complete tactical-geometry package.” Mature kernels cover
important subsets. The game still has to choose its own discrete geometry and
rule semantics.

### What can be reused today

The reusable software falls into two different roles that should not be
collapsed into one type. An editor/interchange format is **structured input**;
the package parses it into its smaller canonical arena. A coordinate, path, or
FOV library is an **algorithmic kernel** over that arena. Neither should become
the LLM-facing runtime projection merely because it already has a JSON shape.

For arena authoring, [Tiled's JSON map format](https://doc.mapeditor.org/en/latest/reference/json-map-format/)
is the strongest mature interchange candidate. Tiled supports orthogonal,
isometric, staggered, and hexagonal maps; finite and infinite tile layers;
object layers; custom properties; and chunked storage. A deliberately
restricted Tiled profile could provide a good editor and import boundary for a
five-foot square arena. The runtime should not adopt the full rendering/editor
schema: parse selected layers and properties into the package-owned cell,
boundary, anchor, and vertical-link variants. [LDtk's JSON format](https://ldtk.io/json/)
is a credible alternative with explicit grid, IntGrid, and entity layers, but
Tiled covers more grid topologies and has a broader interchange ecosystem.

| Kernel                                                                                       | Evidence tier                                               | Useful capability                                                                                                                                   | Fit for an isolated TypeScript package                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [rot.js](https://ondras.github.io/rot.js/manual/)                                            | Released production-oriented OSS toolkit; BSD               | JavaScript/TypeScript roguelike toolkit with A\* and Dijkstra pathfinding, several FOV algorithms, and 4-, 6-, and 8-neighbour topology             | Strong source of directly reusable grid algorithms. It does not provide a complete immutable arena, footprints, cover, or 3D elevation semantics. Wrap it behind pure functions rather than expose its mutable callback-oriented objects. |
| [Honeycomb](https://github.com/flauwekeul/honeycomb)                                         | Released OSS library; TypeScript, MIT                       | Axial/cube hex coordinates, grid construction and traversal helpers                                                                                 | Strong reuse candidate if the arena chooses hex cells. Its own backlog says pathfinding and LOS/FOV are examples rather than core facilities, so it is coordinate infrastructure, not the whole engine.                                   |
| [libtcod](https://github.com/libtcod/libtcod)                                                | Mature production-oriented OSS toolkit; C/C++, BSD-3-Clause | A\*/Dijkstra-style pathfinding and a large menu of FOV algorithms including basic, diamond, permissive, restrictive, and symmetric shadowcasting    | Excellent reference and test oracle for square-cell LOS/FOV semantics; awkward as a dependency for an otherwise portable TS library unless brought in through WASM/native bindings.                                                       |
| [Godot `AStarGrid2D`](https://docs.godotengine.org/en/latest/classes/class_astargrid2d.html) | Production engine facility; MIT engine                      | Partial square/isometric grids, solid cells, per-cell weight scaling, several heuristics, and four explicit diagonal/corner policies                | Strong evidence for the API decisions a grid kernel must expose. Not reusable independently of Godot.                                                                                                                                     |
| [Grid Engine](https://github.com/Annoraaq/grid-engine)                                       | Released game middleware; TypeScript, MIT                   | Tile movement, collision groups, multi-tile characters, multiple layers and Phaser integration                                                      | Useful implementation evidence for occupancy and footprints. Its Phaser lifecycle and movement system are broader than the desired dependency-free geometry core, so inspiration is safer than direct adoption.                           |
| [Recast/Detour](https://github.com/recastnavigation/recastnavigation)                        | Industry-standard production OSS; C++, zlib                 | Generates polygonal navmeshes by voxelizing triangle meshes; runtime path queries, tiled streaming/rebaking, temporary obstacles and crowd movement | Best available choice if arbitrary imported 3D level geometry becomes a requirement. It is a different abstraction and much heavier than an authored five-foot cell arena.                                                                |
| [recast-navigation-js](https://github.com/isaac-mason/recast-navigation-js)                  | Released OSS port; TypeScript-facing WASM, MIT              | Web/Node Recast and Detour APIs, runtime/offline navmesh generation, path queries, crowds, and temporary box/cylinder obstacles                     | A credible direct dependency for polygonal 3D maps. WASM initialization, bundle size, navmesh asset generation and native-style handles conflict with the smallest immutable portable slice.                                              |

Red Blob Games is not a packaged engine, but its primary-author
[hex-grid guide](https://www.redblobgames.com/grids/hexagons/) and
[implementation guide](https://www.redblobgames.com/grids/hexagons/implementation.html)
are unusually complete references for cube/axial coordinates, neighbours,
distance, rings, ranges, rotation, line drawing and map storage, with companion
TypeScript implementations. For a deliberately small kernel, those algorithms
plus property tests may be safer than adopting a game engine.

The reusable conclusion is therefore conditional:

- For **quantized authored combat space**, choose square or hex cells and reuse
  a narrow coordinate/path/FOV kernel. `rot.js` is the closest JS implementation;
  Honeycomb is the cleanest TypeScript hex-coordinate dependency.
- For **arbitrary continuous or imported 3D levels**, use Recast/Detour through
  `recast-navigation-js`; do not rebuild navmesh generation.
- Do not use a generic graph library as the geometry model. It can implement
  shortest path, but does not decide line traversal, corner blocking, area
  rasterization, footprint clearance, elevation, or cover.
- Voxel/octree structures are justified for destructible three-dimensional
  volume or very large sparse worlds. For a bounded encounter, they add a
  spatial-indexing problem without improving the LLM interface. Recast itself
  illustrates the normal use of voxels here: an intermediate representation
  from which walkable polygonal regions are generated, not necessarily the
  gameplay API.

### The hidden choices are semantic, not algorithmic

The libraries reveal why implementing even a small grid carelessly can bog
down. Godot exposes Euclidean, Manhattan, octile, and Chebyshev heuristics and
four diagonal modes. That is not API decoration: a diagonal may always pass,
never pass, pass if one adjacent orthogonal cell is open, or pass only if both
are open. [Godot `AStarGrid2D`](https://docs.godotengine.org/en/latest/classes/class_astargrid2d.html)

Line of sight has the same issue. A thin rasterized line and a _supercover_
line touch different cell sets; a line through a cell corner can be allowed if
either adjoining side is clear or only if both are clear. Red Blob's
[grid line-drawing guide](https://www.redblobgames.com/grids/line-drawing/)
shows these alternatives. libtcod goes further and deliberately ships many FOV
algorithms with different permissiveness. [libtcod FOV API](https://libtcod.readthedocs.io/en/latest/group___f_o_v.html)

Other easily hidden concerns are:

- **Distance is plural.** Straight-line range, rule-counted cell distance,
  shortest traversable path cost, and vertical separation can all disagree.
- **Footprints are sets of cells, not cell capacities.** A large body must be
  placeable at every occupied cell, traverse each transition with clearance,
  and calculate distance/LOS from a specified boundary or origin. Production
  navmeshes encode agent radius and height for exactly this reason; Grid Engine
  explicitly supports multi-tile characters.
- **Walls belong on boundaries as well as cells.** An edge can block traversal
  but permit sight, or block sight but not imply that either adjacent cell is
  intrinsically opaque.
- **Dynamic topology is separate from token occupancy.** Doors, movable cover,
  hazards and destroyed walls change passability or sight. Unity documents the
  performance/consistency tradeoff explicitly: moving obstacles use local
  avoidance, while stationary obstacles may carve a navmesh hole whose update
  is delayed to reduce CPU cost.
  [Unity NavMesh obstacles](https://docs.unity3d.com/2018.3/Documentation/Manual/class-NavMeshObstacle.html)
- **Elevation is not merely a `z` added to 2D distance.** Stairs, drops,
  overhead clearance, stacked cells, flight and which boundary a ray crosses
  require explicit semantics. A layered cell complex with authored vertical
  transitions is much smaller than continuous 3D while remaining honest.
- **Areas need a declared rasterization rule.** Center-in-area, any-overlap,
  every touched cell, and target-footprint intersection produce different
  memberships at boundaries.
- **Deterministic tie-breaking matters.** Equal-cost paths and rays through
  corners must return stable results so a replay does not depend on map
  iteration order.

These are reasons to keep the package small, not reasons to avoid it. A bounded
integer lattice with explicit policies is substantially easier to specify and
property-test than continuous geometry. The mistake would be calling those
policies implementation details.

### State of the art for LLM spatial observations

Production simulators normally expose structured metric state rather than
expecting an agent to reconstruct it from prose. AI2-THOR, for example, uses a
configurable movement grid (0.25 m by default), global agent position and yaw,
and per-object metadata including exact distance, visibility, position and
bounding boxes. Its movement commands are egocentric (`MoveAhead`, `MoveBack`,
`MoveLeft`, `MoveRight`).
[AI2-THOR navigation](https://ai2thor.allenai.org/ithor/documentation/navigation/)
and [environment state](https://ai2thor.allenai.org/ithor/documentation/environment-state/)

Habitat uses the same separation even more directly: its PointGoal sensor can
report a goal in the agent's frame as polar distance and bearing rather than
requiring the policy to infer them from a map image.
[Habitat PointGoal-with-compass sensor](https://aihabitat.org/docs/habitat-lab/habitat.config.default_structured_configs.PointGoalWithGPSCompassSensorConfig.html)

There is also an established symbolic vocabulary for the coarser rendering.
QSRlib implements cardinal-direction relations and user-defined qualitative
distance thresholds. That combination is close to “south, 90 ft,” but it
should be treated as an observation calculus over exact state, not as the
authoritative geometry: retain the numeric distance and expose the qualitative
direction/band beside it.
[QSRlib qualitative-distance calculus](https://qsrlib.readthedocs.io/en/latest/rsts/handwritten/qsrs/argd.html)

That example distinguishes two frames of reference that the proposed contract
must not blur:

- `south`, `north-east`, or bearing `180°` is **arena-relative/allocentric**;
- `ahead`, `rear-left`, or `5 o'clock` is **viewer-relative/egocentric** and
  changes when the viewer turns.

Thus “this enemy is south of me, 90 ft” is only egocentric in the loose sense
that the viewer is the origin. `south` itself requires a stable arena north. If
facing is not mechanically modeled, cardinal/octant direction is preferable to
clock-face language because it does not invent orientation state. If facing is
modeled, both forms can be derived, but each field needs an explicit frame.

Research evidence increasingly favors structured symbolic projections over
visual maps or improvised prose, though it does not establish one universal
format:

- The ICLR 2026 paper _Do LLMs Build Spatial World Models?_ reports Gemini
  accuracy of 80–86% on small 5x5–7x7 mazes using tokenized adjacency
  representations versus 16–34% using visual grids. It also finds that strong
  apparent semantic coverage does not produce a stable cumulative world model.
  [Paper and data description](https://arxiv.org/abs/2604.10690)
- _From Text to Space_ compares text encodings in grid navigation and reports
  consistently higher success and path efficiency for Cartesian
  representations. This is a 2025 research preprint, not production evidence,
  but it argues against hiding all coordinates from an LLM merely because they
  look low-level. [Paper](https://arxiv.org/abs/2502.16690)
- BALROG finds current LLMs/VLMs struggle in complex dynamic game environments
  and that several models perform worse when given visual representations.
  [BALROG, ICLR 2025](https://arxiv.org/abs/2411.13543)
- BLINDER finds that exhaustive high-dimensional language descriptions can
  impair performance and increase inference cost; learned task-conditioned
  concise descriptions improve success while reducing inputs and compute.
  [Selective Perception](https://arxiv.org/abs/2307.11922)
- SayPlan does not dump its full 3D scene. It sends an LLM a hierarchical JSON
  scene graph, permits task-driven expansion and contraction, delegates route
  details to Dijkstra, and validates the plan in a simulator.
  [SayPlan](https://sayplan.github.io/)
- SpatialVLM's large metric-space training effort starts from the opposite
  observation: general VLMs are weak at quantitative 3D relations such as
  physical distance and size. Better metric reasoning required targeted data;
  it should not be assumed from generic language ability.
  [SpatialVLM](https://arxiv.org/abs/2401.12168)

The empirical results are not contradictory. Cartesian/adjacency formats help
when the LLM must reason about topology; selective semantic facts help avoid
overloading it; deterministic software should still compute paths, distances,
LOS, target sets and action legality. The LLM should choose tactics, not serve
as a geometry kernel.

### Recommended canonical model

For the isolated reusable spatial package, the strongest current hypothesis is
a **bounded integer cell complex with semantic anchors**, not an all-pairs
anchor matrix:

```text
ArenaDefinition
  topology: square-8 | hex-6
  quantum: authored physical length per horizontal step
  cells: integer cell coordinates with terrain and elevation
  boundaries: local traversal and sight properties between cells
  verticalLinks: authored stairs, climbs, drops, portals
  anchors: named non-authoritative groupings of cells
  policies: diagonal, distance, LOS/corner, and area-rasterization choices

SpatialState<TokenId>
  token placements/footprints
  dynamic boundary and obstacle state
```

`square-8` and `hex-6` should be distinct parsed arena variants, not optional
fields on a universal coordinate record. An arena has one topology, quantum and
policy set. Semantic anchors label/project cells; they do not duplicate or
override their geometry. Static definition and dynamic occupancy/obstacles
remain separate immutable values from the caller's perspective.

The first prototype should deliberately stop at 2.5D: integer horizontal cells,
an elevation per cell, and explicit vertical transitions. That preserves exact
5/10/15-foot quantization and “south, 90 ft” without accepting the complexity of
arbitrary polygonal solids. Recast becomes the escape hatch if imported 3D
levels later become a real requirement.

### Recommended observation contract

Do not make the prose form the contract. Return versioned structured facts from
which the adjudicator can relay JSON, terse text, or a diagram. A relation from
one visible token to another should resemble:

```json
{
  "target": "enemy-7",
  "from": "viewer-2",
  "arenaDirection": {
    "octant": "south",
    "bearingDegrees": 180
  },
  "relativeDirection": null,
  "range": {
    "ruleDistanceFeet": 90,
    "horizontalFeet": 90,
    "verticalFeet": 0,
    "pathCostFeet": 110
  },
  "visibility": "clear",
  "cover": "none",
  "anchor": "south-balcony"
}
```

The values must be derived together from one arena snapshot. In particular,
`ruleDistanceFeet`, geometric horizontal/vertical separation, and traversable
path cost are deliberately not aliases. `relativeDirection` is absent unless
the query includes a facing/orientation. A clock value, if ever exposed, is a
renderer-derived label over relative bearing, never another canonical field.

The default player observation should contain:

1. the viewer's own cell, anchor and arena orientation reference;
2. visible/revealed entities as structured relative facts, sorted stably;
3. locally relevant terrain, boundaries and anchors;
4. reachable destinations or legal movement endpoints for the current budget;
5. server-derived legal targets/actions where requested;
6. the arena/state revision used to derive every fact.

It should not contain the entire cell array every turn. Provide a separate
on-demand map projection—adjacency JSON and optionally ASCII—for planning or
debugging. This combines the strongest empirical signals: stable coordinates
and adjacency for topology, concise egocentric facts for moment-to-moment
choice, and executable legal actions so model spatial errors cannot become
authoritative state.

### Practical decision

There is enough mature prior art that we should not build pathfinding, hex
coordinate arithmetic, or FOV algorithms from intuition. There is not a
drop-in library that defines the desired immutable tactical domain, D&D-style
distance, cover, areas, footprints and LLM observations together.

The lowest-risk route is:

1. choose one topology for the prototype (square cells if compatibility with
   familiar battle maps matters; hex cells if uniform neighbour distance
   matters more);
2. adopt or port one mature narrow kernel (`rot.js`, or Honeycomb plus a chosen
   FOV/path implementation) behind package-owned pure interfaces;
3. name and test every policy listed above;
4. derive anchors and LLM observations from canonical cells;
5. benchmark observation variants rather than assuming prose is best:
   adjacency JSON, Cartesian entity table, local ASCII crop, and concise
   relation list with cardinal direction plus numeric distance.

This is materially less novel than the earlier pairwise-anchor proposal. The
novel part is the compact combat-domain and LLM observation contract, not the
underlying discrete geometry algorithms.

## Tabletop-derived combat vocabularies (secondary evidence)

The following material predates the software survey. It is useful for choosing
readable combat terms and deciding what detail to collapse, but it is not
evidence about authoritative server architecture.

### Three candidate state models

These approaches should not be conflated merely because all three can render as
short textual range facts:

1. **Pure pairwise range-band state** stores a band for each relevant pair of
   creatures or objects. L5R shows its expressiveness and readability. It is the
   weakest authoritative-server model because moving one creature has no
   intrinsic rule for updating all of its other relationships.
2. **Zones plus engagement** stores one macro zone per creature and a finer
   local engagement relation. YZE and 13th Age show variants of this pattern.
   It has good canonical locality and cheap movement, but one engagement bit is
   too coarse if several distinct reach thresholds must survive.
3. **Named tactical positions/range graph** stores one named anchor per creature
   and derives bands from paths between anchors. This is the most promising
   competitive-server adaptation: one authoritative location changes on move,
   the rest is derived, and the graph can still be rendered as ordinary place
   names and a short egocentric list. This final model is a synthesis from the
   precedents, not a claim that one cited game uses this exact representation.

In every case, the LLM-facing facts and admissible commands are projections.
They are not client-authored spatial truth. The server owns canonical position,
barriers, revisions, legal transitions, and resolution.

### Tabletop design precedents

| System                        | Spatial representation                                                               | Movement and reach                                                                                                              | LOS, cover, and areas                                                                                                                                                                           | Fit for authoritative LLM play                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Year Zero Engine              | Named zones plus five bands: Engaged, Short, Medium, Long, Extreme                   | A fast action crosses one zone or changes Engaged ↔ Short inside the same zone; retreating from Engaged is mechanically special | Open/blocked zone borders govern movement and sight; cover is a zone-local object; explosions affect Short/same-zone targets, deal more at Engaged, and can spill into unblocked adjacent zones | Strongest off-the-shelf conceptual match: compact, textual, and more expressive than zones alone                                                          |
| Legend of the Five Rings beta | Seven nonlinear pairwise range bands: Touch, Sword, Spear, Throw, Bow, Volley, Sight | Weapons and effects declare band ranges; movement changes bands                                                                 | Terrain and effects occupy ranges around positions; effects can target everyone within a band interval of a point                                                                               | Best precedent for preserving several distinct melee/reach thresholds, but its human tracking rules do not by themselves define consistent server updates |
| Daggerheart                   | Melee, Very Close, Close, Far, Very Far, Out of Range                                | Bands have approximate fictional ranges; movement under pressure uses bands; weapons state maximum bands                        | Group effects place targets within Very Close of one origin; LOS is required and partial/total obstruction yields cover/no sight                                                                | Very readable and modern; still leaves obstruction and relative placement to table judgment unless the server adds a canonical scene model                |
| 13th Age                      | General whereabouts (Nearby/Far Away) plus engagement with specific foes             | Nearby is one move, Far Away two; leaving engagement or using many ranged actions while engaged has consequences                | Many area attacks select a count of enemies “in a group” instead of measuring a template                                                                                                        | Excellent cognitive compression, but too coarse for multiple D&D-style reach thresholds without another band                                              |
| Fate Condensed                | A graph of usually 2–4 zones                                                         | Anyone in the same zone can physically interact; moving to an adjacent zone is normally free                                    | Zone connections and situation aspects express obstruction, smoke, ladders, cover, and similar facts                                                                                            | Excellent scene readability, but exactly too coarse for meaningful 5/10/15-foot distinctions inside a zone                                                |

#### Year Zero Engine: the strongest hybrid precedent

The official Year Zero Engine SRD says a zone is normally a room, corridor, or
area of ground, ranging from a few steps to roughly 25 metres. It separately
defines Engaged as “right next to you,” Short as a few metres away in the same
zone, Medium as an adjacent zone, Long as roughly four zones, and Extreme as up
to roughly a kilometre. Thus zone membership is not the distance model by
itself. [Year Zero Engine SRD, maps, borders, and range categories, pp. 15–16](https://freeleaguepublishing.com/wp-content/uploads/2023/11/YZE-Standard-Reference-Document.pdf)

The operational rules make the abstraction executable: one fast action either
crosses into a neighboring zone or changes between Short and Engaged inside a
zone. Moving away from an active Engaged enemy invokes retreat rules. Weapons
also use these bands; for example, ordinary close-combat weapons are Engaged
while a spear can reach Short. [Year Zero Engine SRD, movement and weapons,
pp. 17, 20](https://freeleaguepublishing.com/wp-content/uploads/2023/11/YZE-Standard-Reference-Document.pdf)

The same representation reaches beyond targeting. Borders are open or blocked
and normally govern both passage and line of sight. Cover is something a
character takes in their current zone and it has its own protection rating.
Explosions affect everyone at Short range (the same zone), add damage at
Engaged range, and sufficiently powerful blasts spill into adjacent zones if
unblocked. [Year Zero Engine SRD, pp. 15, 21,
24](https://freeleaguepublishing.com/wp-content/uploads/2023/11/YZE-Standard-Reference-Document.pdf)

This is important evidence against treating “zone” as synonymous with “one
distance.” The practical pattern is two-level: macro topology plus a finer
local relationship.

#### Legend of the Five Rings: semantic melee bands

Fantasy Flight Games' official beta rules explicitly describe range bands as
approximate spatial relationships used instead of discrete measured units. The
first four are especially relevant: range 0, Touch (direct contact/arm's
reach); range 1, Sword (about 1–2 metres); range 2, Spear (about 3–4 metres);
and range 3, Throw (about 5–10 metres). The remaining bands expand nonlinearly
to Bow, Volley, and Sight. [Legend of the Five Rings beta rulebook, pp.
165–166](https://images-cdn.fantasyflightgames.com/filer_public/dc/2f/dc2f92bb-bfd2-4f12-99eb-1d084491de65/l5r00_beta_rulebook.pdf)

That is direct industry evidence that touch, ordinary melee, extended melee,
and short ranged distance can be separate qualitative values rather than feet
or squares. Weapons have minimum/maximum useful bands, terrain can occupy
bands, and effects can apply to every character within a band interval of a
chosen point.

The limitation is equally instructive. The book tells a human GM to track
bands mentally, on paper, or with relative token placement to keep the picture
consistent. That is adequate cooperative table procedure, but not a complete
transition system for an adversarial server. If the server stores independently
claimed pairwise bands, it can admit contradictory or underspecified movement
outcomes. The server needs one canonical spatial state from which these bands
are projected.

This is an older beta rather than a claim about the exact current L5R rules. It
is cited as a first-party shipped design precedent for semantic banding.

#### Daggerheart: current range bands across the whole combat surface

Daggerheart's official SRD uses Melee, Very Close (about 5–10 feet), Close
(about 10–30 feet), Far (about 30–100 feet), Very Far (about 100–300 feet), and
Out of Range. These categories govern target range and movement; the SRD also
offers an optional square conversion for groups that prefer more precision.
[Daggerheart SRD 1.0, “Maps, Range, and Movement,” pp.
39–40](https://www.daggerheart.com/wp-content/uploads/2025/06/DH-SRD-1.0-June-26-2025.pdf)

It defines a group effect as targets within Very Close of a single origin point
inside the effect's range. Ranged attacks require line of sight; partial
obstruction creates cover and total obstruction removes line of sight. This is
a useful example of quantizing distance and area membership while keeping
visibility and obstruction as separate predicates rather than pretending that
distance determines them.

#### 13th Age: whereabouts plus engagement

The official 13th Age SRD says its combat system cares about position only in
simple approximate terms, emphasizing “where people are and who's fighting
whom.” It represents general whereabouts as Nearby (normally one move) or Far
Away (normally two moves), while engagement is a separate relation to one or
more specific enemies. [13th Age Archmage Engine SRD, pp.
330–332](https://pelgranepress.com/media/SRD/13thAgeArchmageEngineSRD.pdf)

This separation is valuable: engagement is a mechanically meaningful relation,
not merely a synonym for sharing a broad place. The system also avoids geometric
templates for many abilities; for example, attacks commonly target a bounded
number of nearby enemies in a group. That is very legible, though it sacrifices
the reach distinctions needed here unless another local band is added.

#### Fate: useful topology, insufficient local resolution

Fate Condensed recommends only two to four zones for most conflicts. Everyone
in a zone can physically interact, movement normally reaches an adjacent zone,
and ranged attacks depend on zone connectivity and established fiction.
[Fate Condensed, “Setting Up Scenes”](https://fate-srd.com/fate-condensed/challenges-conflicts-and-contests)

Fate is therefore a strong model for naming and serializing macro locations,
but a poor complete answer to this question: it intentionally collapses all
within-zone reach. Its value here is as the top layer of a hybrid, not as the
whole spatial model.

Fate's own Space Toolkit makes the spectrum explicit. It presents detailed
vectors at one end and an eight-to-ten-band range-zone compromise at the other;
same-band and band-count relationships then determine weapon and sensor use.
[Fate Space Toolkit, “Vector Diagrams and Range
Zones”](https://fate-srd.com/fate-space-toolkit/vector-diagrams-and-range-zones)

## Earlier text-agent observations

Text-agent research does not establish that any particular RPG distance model
is best for LLMs, but it does establish two useful interface patterns.

Microsoft's TextWorld keeps an authoritative logical game engine behind a text
interface. The engine tracks state and uses inference to ensure that generated
steps are valid, while the player observes descriptions of discrete rooms and
nearby objects and issues textual commands. [Microsoft Research's TextWorld
overview](https://www.microsoft.com/en-us/research/blog/textworld-a-learning-environment-for-training-reinforcement-learning-agents-inspired-by-text-based-games/)

ALFWorld goes further by aligning an abstract text environment with a visually
embodied environment so an agent can learn high-level policies in text and
execute them through lower-level actuation. Its official implementation can
return the current set of admissible commands alongside the observation.
[ALFWorld paper](https://arxiv.org/abs/2010.03768) and [official
implementation](https://github.com/alfworld/alfworld)

The justified inference for this project is modest but useful: keep the
canonical world and legality in the server, then project a compact symbolic
observation and current admissible commands to the LLM. Do not ask the LLM to
reconstruct legality from prose or to author authoritative spatial facts.

## Evaluation against the hosted-game requirements

### Authority and anti-cheat

Range bands solve readability, not trust. A client must never submit `inRange`,
`hasLineOfSight`, `hasCover`, affected targets, or a new set of pairwise
distances. It submits intent using server-issued identifiers. The server moves
the piece in its canonical scene model and derives all consequences.

Revision checks are also required: an action should name the battle revision it
was selected from, and stale actions should be rejected rather than applied to
a changed battlefield.

### Consistency

A raw all-pairs matrix is attractive because it serializes well:

```text
fighter ↔ goblin: Reach-1
fighter ↔ ogre: Reach-2
wizard ↔ goblin: Near
```

But it has no local movement rule. If the fighter approaches the ogre, the
server still needs to determine the fighter's new relationship to the goblin,
wizard, every area origin, every doorway, and every cover object. Updating
independent pairwise values can create states that no coherent scene could
produce.

Industry tabletop rules tolerate this because a human GM continuously repairs
the fiction. An authoritative server needs a canonical location representation.

### Movement

Pure zone movement is deterministic but too coarse. Pure bands relative to
creatures make multi-party movement ambiguous. A small graph of named anchors
provides a useful middle:

```text
West Hall
  doorway -- one step -- overturned-table -- one step -- stair-foot

North Dais
  stair-top -- one step -- altar-left
```

Each combatant occupies one anchor. Movement changes that single source fact;
distance bands are derived from path cost. Door, terrain, and elevation facts
belong to anchors or links. This is still discrete geometry, but its unit is a
meaningful place rather than an `(x, y)` coordinate, so it has a concise textual
projection.

An even more abstract first version can use the Year Zero shape: one zone per
creature plus a server-owned symmetric engagement graph inside a zone. That is
sufficient only if one local distinction is acceptable. If several melee
thresholds matter, named intra-zone anchors or additional derived bands are
needed.

### Reach thresholds

Do not choose bands merely because 5, 10, 15, 30, and 60 are familiar numbers.
Inventory the thresholds used by the supported rules corpus and partition
distance into **mechanical equivalence classes**: two distances may share a band
only when every supported rule treats them identically. This preserves all
currently meaningful thresholds while deliberately collapsing unused detail.

The LLM-facing label can combine semantic meaning and the exact threshold:

```text
Touch
Reach-1 (within 5 ft)
Reach-2 (within 10 ft)
Reach-3 (within 15 ft)
Near (within 30 ft)
Far (within 60 ft)
```

Those names are illustrative, not a proposed authoritative vocabulary. The
actual bands must be derived from supported RAW mechanics rather than invented
first and forced onto the rules.

### LOS and cover

Distance is insufficient to derive visibility. The compact precedents treat
these as separate facts:

- zone/anchor links own open, blocked, door, and similar passage facts;
- opaque boundaries block sight across them;
- cover is an explicit feature or relation, not inferred from range;
- changing a door or destroying cover changes one canonical source fact and
  projections are recomputed.

This is intentionally less geometrically complete than ray casting. An authored
arena can state that the west doorway gives half cover from the dais, or that
the smoke-filled hall blocks sight through it. The server, not a client, owns
those facts.

### Area effects

Three quantized approaches already appear in published systems:

1. same local band or same zone, with stronger effect at the inner band (Year
   Zero);
2. every target within a band radius of a selected origin (L5R and Daggerheart);
3. a bounded count of eligible targets in a named group (13th Age).

For LLM play, a server-generated list of legal origins and the targets each
would affect is more robust than asking an agent to imagine a cone or circle.
The canonical model can still record the chosen origin/group so the result is
auditable.

### Text readability

A useful client projection should be egocentric, stable, and redundant only in
presentation—not in canonical state:

```text
YOU: fighter-1
PLACE: West Hall / doorway

THREATS
- goblin-2: Reach-1 (5 ft), engaged, visible, no cover
- ogre-1: Reach-2 (10 ft), visible, half cover
- cultist-3: Near (30 ft), visible, three anchor steps away

LEGAL MOVES
- overturned-table: 1 step / 5 ft of movement
- stair-foot: 2 steps / 10 ft of movement

LEGAL TARGETS
- longsword: goblin-2
- polearm: goblin-2, ogre-1
```

JSON with the same stable IDs can accompany the text. The text is a projection
for comprehension; the structured values are the protocol. Legal options make
the adversarial boundary explicit and reduce invalid LLM action generation.

## Recommended experiment

The research supports a small prototype before any architecture commitment:

1. Author two or three battlefields as named zone graphs with 3–6 anchors per
   zone.
2. Give each creature exactly one authoritative anchor location.
3. Derive combat bands from stable anchor-to-anchor relations. Use graph path
   cost only when the simplified game deliberately makes movement distance and
   attack separation the same concept.
4. Model passage, visibility, cover, and area membership as separate compact
   source facts or derived relations.
5. Expose only an egocentric text/JSON view and server-generated legal
   destinations, targets, area origins, and reactions.
6. Run multiple independent LLM clients against the same revisioned server and
   measure invalid-command rate, spatial misunderstandings, tactical coherence,
   prompt size, and disputes with server rulings.

Compare three canonical models while keeping the LLM observation format as
similar as possible:

1. a cell/grid world with a semantic egocentric projection;
2. a finite tactical-anchor graph with derived bands;
3. a formation/rank lattice with explicit launch and target masks;
4. a pure creature-pair band network.

Also compare observation ablations: adjacency JSON, Cartesian entity table,
local ASCII crop, semantic local facts, and semantic facts plus admissible
intents. Measure prompt size, invalid-action rate, replanning count,
spatial-rule disputes, tactical quality, and how many state updates each move
requires. The later geometry-kernel survey makes a cell complex with semantic
anchors the best-supported canonical hypothesis when exact direction and
5/10/15-foot distance matter, but that remains an inference to test.

## Conclusions

- The user's “quantized” intuition is well supported, but software most often
  quantizes the **agent observation**, not the authoritative world.
- Production multiplayer practice is decisive about trust: clients request
  actions; the server validates and mutates canonical state.
- Text software proves that room/place graphs and logical predicates are
  highly readable and executable. It does not supply fine within-room combat
  distance.
- Commercial formation combat proves that a small ordered slot lattice can be
  canonical, tactically meaningful, and directly executable. It achieves this
  by replacing free geometry with rank-based targeting rather than by
  approximating feet.
- Mature navigation and embodied-agent software uses layered representations:
  metric grids or coordinates for local feasibility, topological/scene graphs
  for higher-level planning, and task-relevant projections for agents.
- SayPlan, TextWorld/ALFWorld, TextArena, MiniHack, and Voyager support the
  interface pattern most relevant here: compact observation, constrained or
  validated action, simulator feedback, and replanning.
- No surveyed software system established independently mutable pairwise range
  bands as the canonical state of an authoritative competitive world. Treat
  that option as novel and high-risk, not industry state of the art.
- A finite tactical-anchor graph remains a credible canonical simplification
  when authored topology is enough. Once exact cardinal direction and
  5/10/15-foot cell distinctions are requirements, the stronger hypothesis is
  a bounded integer square/hex cell complex with semantic anchors as a derived
  projection. A rank/slot lattice is still the stronger readability-first
  hypothesis if substantially replacing free movement is acceptable.
- Mature OSS already covers pathfinding, hex coordinate arithmetic, grid FOV,
  navmesh generation and dynamic-obstacle techniques. No surveyed library
  combines those with immutable tactical state, D&D-style distance/area/cover
  policies and an LLM observation contract; those domain decisions remain ours.
- LLM evidence favors stable structured coordinates or adjacency for topology,
  concise task-relevant relation lists for local choice, and simulator-derived
  legal actions. Cardinal direction and viewer-relative direction must name
  their reference frames, and numeric range must distinguish rule distance,
  geometric separation and path cost.
- Canonical quantization is still viable if LLM comprehension outranks geometric
  fidelity. It should be an explicit simplified rules profile whose mechanics
  are defined over finite anchors and bands, not a claim that the abstraction
  reproduces arbitrary Euclidean 5e geometry.
