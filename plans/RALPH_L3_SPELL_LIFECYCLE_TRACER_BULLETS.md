# Ralph Lane: Level 3 Spell Lifecycle Tracer Bullets

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L3SPELL-01-ENHANCE-ABILITY-UPCAST-PER-TARGET",
      "status": "done",
      "title": "Promote Enhance Ability upcast per-target ability choices"
    },
    {
      "number": 2,
      "id": "L3SPELL-02-DARKNESS-OBJECT-ORIGIN-DECISION",
      "status": "done",
      "title": "Promote or close Darkness object-origin branch"
    },
    {
      "number": 3,
      "id": "L3SPELL-03-SPELL-SHAPESHIFT-TRUE-FORM-REVERSION",
      "status": "done",
      "title": "Promote spell-effect shape-shift true-form reversion owner"
    },
    {
      "number": 4,
      "id": "L3SPELL-04-STATBLOCK-SHAPECHANGER-TRUE-FORM-REVERSION",
      "status": "done",
      "title": "Promote or close stat-block shapechanger true-form reversion owner"
    },
    {
      "number": 5,
      "id": "L3SPELL-05-DISPEL-BROADER-ONGOING-EFFECTS",
      "status": "done",
      "title": "Promote broader Dispel Magic ongoing effect ending"
    },
    {
      "number": 6,
      "id": "L3SPELL-06-ANTIMAGIC-PREVENTION-BOUNDARY-SPLIT",
      "status": "done",
      "title": "Split Antimagic Field prevention and broader suppression owners"
    },
    {
      "number": 7,
      "id": "L3SPELL-07-HYPNOTIC-PATTERN-SURFACE-ESCAPE-REPAIR",
      "status": "done",
      "title": "Repair Hypnotic Pattern typed escape Surface shape"
    },
    {
      "number": 8,
      "id": "L3SPELL-08-HYPNOTIC-PATTERN-CONTROL-RUNTIME",
      "status": "done",
      "title": "Promote Hypnotic Pattern control runtime after Surface repair"
    },
    {
      "number": 9,
      "id": "L3-FOLLOWUP-ANTIMAGIC-AURA-ACTION-INTERDICTION",
      "status": "done",
      "title": "Antimagic Field aura action interdiction"
    },
    {
      "number": 10,
      "id": "L3-FOLLOWUP-ANTIMAGIC-MAGICAL-TARGETING-AND-EFFECT-INTERDICTION",
      "status": "done",
      "title": "Antimagic Field magical targeting and effect interdiction"
    },
    {
      "number": 11,
      "id": "L3-FOLLOWUP-ANTIMAGIC-MAGIC-ITEM-SUPPRESSION",
      "status": "blocked",
      "title": "Antimagic Field magic item suppression"
    },
    {
      "number": 12,
      "id": "L3-FOLLOWUP-ANTIMAGIC-MAGICAL-AREA-CLIPPING",
      "status": "ready-for-implementation-after-light-research",
      "title": "Antimagic Field magical area clipping"
    },
    {
      "number": 13,
      "id": "L3-FOLLOWUP-ANTIMAGIC-TRANSIT-BLOCKING",
      "status": "ready-for-research",
      "title": "Antimagic Field teleportation and planar travel blocking"
    },
    {
      "number": 14,
      "id": "L3-FOLLOWUP-ANTIMAGIC-PORTAL-CLOSURE",
      "status": "blocked",
      "title": "Antimagic Field portal closure"
    },
    {
      "number": 15,
      "id": "L3-FOLLOWUP-ANTIMAGIC-DISPEL-IMMUNITY",
      "status": "blocked",
      "title": "Antimagic Field Dispel Magic immunity"
    },
    {
      "number": 16,
      "id": "L3-FOLLOWUP-ANTIMAGIC-BROADER-ONGOING-SPELL-SUPPRESSION",
      "status": "ready-for-implementation-after-light-research",
      "title": "Antimagic Field broader ongoing spell suppression"
    }
  ]
}
-->

## Objective

Deepen level-3 spell lifecycle gaps that are currently explicit follow-up
splits or broader lifecycle closures. This lane is for spell/runtime lifecycle
work, not level-3 class-feature Units already assigned to other lanes.

## Declared Base And Task-Base Check

Declared Base SHA for every task in this lane:

```text
d05bfd52bf6a5964af9f2a5f88c37d5093256e06
```

Before starting each task, run and log:

```sh
git rev-parse HEAD
git merge-base --is-ancestor d05bfd52bf6a5964af9f2a5f88c37d5093256e06 HEAD
```

If the ancestor check fails, stop and report the branch-base mismatch. Do not
repair branch state by rebasing against `master`; the Ralph runner or decider
owns branch repair.

## DAG / Queue Order

| Order | Task | Status | Depends On | Notes |
|---:|---|---|---|---|
| 1 | L3SPELL-01-ENHANCE-ABILITY-UPCAST-PER-TARGET - Promote Enhance Ability upcast per-target ability choices | done | none | Independent spell-resource/targeting slice. |
| 2 | L3SPELL-02-DARKNESS-OBJECT-ORIGIN-DECISION - Promote or close Darkness object-origin branch | done | none | Closed as table/object-spatial adjudication; point-origin support remains unchanged. |
| 3 | L3SPELL-03-SPELL-SHAPESHIFT-TRUE-FORM-REVERSION - Promote spell-effect shape-shift true-form reversion owner | done | none | Spell-effect shape-shift owners are promoted through the shared reversion owner used by Moonbeam. |
| 4 | L3SPELL-04-STATBLOCK-SHAPECHANGER-TRUE-FORM-REVERSION - Promote or close stat-block shapechanger true-form reversion owner | done | none | Closed as outside promoted battle runtime because SRD Shape-Shift specials lack a structured active-form owner. |
| 5 | L3SPELL-05-DISPEL-BROADER-ONGOING-EFFECTS - Promote broader Dispel Magic ongoing effect ending | done | none | Spiritual Weapon tracked active-effect occurrences are now covered by the existing Dispel Magic ongoing-effect gate. |
| 6 | L3SPELL-06-ANTIMAGIC-PREVENTION-BOUNDARY-SPLIT - Split Antimagic Field prevention and broader suppression owners | done | none | Split into owner-specific executable follow-up rows. |
| 7 | L3SPELL-07-HYPNOTIC-PATTERN-SURFACE-ESCAPE-REPAIR - Repair Hypnotic Pattern typed escape Surface shape | done | none | Surface repair prerequisite for Task 8 is complete. |
| 8 | L3SPELL-08-HYPNOTIC-PATTERN-CONTROL-RUNTIME - Promote Hypnotic Pattern control runtime after Surface repair | done | none | Hypnotic Pattern control runtime is promoted. |
| 9 | L3-FOLLOWUP-ANTIMAGIC-AURA-ACTION-INTERDICTION - Antimagic Field aura action interdiction | done | L3SPELL-06-ANTIMAGIC-PREVENTION-BOUNDARY-SPLIT | Establishes typed aura-membership witnesses and shared spellcasting/Magic Action interdiction. |
| 10 | L3-FOLLOWUP-ANTIMAGIC-MAGICAL-TARGETING-AND-EFFECT-INTERDICTION - Antimagic Field magical targeting and effect interdiction | done | L3-FOLLOWUP-ANTIMAGIC-AURA-ACTION-INTERDICTION | Shared magical-effect targeting and delivery interdiction is promoted for represented combatant target/effect-delivery paths. |
| 11 | L3-FOLLOWUP-ANTIMAGIC-MAGIC-ITEM-SUPPRESSION - Antimagic Field magic item suppression | blocked | future magic-item runtime owner | Requires represented magic item records, equipment/attunement state, and property projection. |
| 12 | L3-FOLLOWUP-ANTIMAGIC-MAGICAL-AREA-CLIPPING - Antimagic Field magical area clipping | ready-for-implementation-after-light-research | L3SPELL-06-ANTIMAGIC-PREVENTION-BOUNDARY-SPLIT | Promote a shared area clipping owner or close specific supported area shapes without duplicating map state. |
| 13 | L3-FOLLOWUP-ANTIMAGIC-TRANSIT-BLOCKING - Antimagic Field teleportation and planar travel blocking | ready-for-research | L3-FOLLOWUP-ANTIMAGIC-AURA-ACTION-INTERDICTION | Requires aura origin/destination membership witnesses; planar-travel state may need a separate owner. |
| 14 | L3-FOLLOWUP-ANTIMAGIC-PORTAL-CLOSURE - Antimagic Field portal closure | blocked | future portal lifecycle owner | Requires represented portal identity, placement, open/closed state, destination, and cleanup semantics. |
| 15 | L3-FOLLOWUP-ANTIMAGIC-DISPEL-IMMUNITY - Antimagic Field Dispel Magic immunity | blocked | L3-FOLLOWUP-ANTIMAGIC-MAGICAL-TARGETING-AND-EFFECT-INTERDICTION | Requires aura occurrences to be targetable or visible to the magical-effect targeting owner. |
| 16 | L3-FOLLOWUP-ANTIMAGIC-BROADER-ONGOING-SPELL-SUPPRESSION - Antimagic Field broader ongoing spell suppression | ready-for-implementation-after-light-research | L3SPELL-06-ANTIMAGIC-PREVENTION-BOUNDARY-SPLIT | Extend suppression one represented ongoing Spell Effect family at a time. |

## Global Acceptance Criteria

1. Read RAW in `.references/srd-5.2.1/` and `UBIQUITOUS_LANGUAGE.md` before
   modeling.
2. If a task changes reducer behavior, add QNT/parity in the same task.
3. If a clause depends on table geometry, object presentation, social state, or
   unsupported map derivation, close it explicitly instead of inventing state.
4. Do not dispatch on spell id/name/provenance in production behavior.
5. Prefer typed procedure facts and caller-supplied witnesses over parallel
   runtime registries.

## Concurrent Ralph Constraints

Multiple Ralph lanes may run concurrently. Any MBT command must be globally
locked:

```sh
flock /workspace/typescript/dnd/.ralph/mbt-global.lock -c 'START=$(date +%s); <cmd> 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"'
```

Inside the lock, still check `vitest` and `quint_evaluator` as AGENTS requires.

## Verification

Every task must run:

```sh
git diff --check
pnpm unit-profile-coverage:check
pnpm check:mbt-driver-closure
```

When artifacts change, run the coverage write/read pair. Reducer changes need
focused runtime tests and focused QNT/MBT parity. Surface-only tasks need
Surface schema/catalog tests and must leave runtime follow-ups honest.

### Task 1 - L3SPELL-01-ENHANCE-ABILITY-UPCAST-PER-TARGET

Status: `done`

Promote the remaining Enhance Ability level-3+ upcast behavior.

Required behavior:

- spend a level-3-or-higher Spell Slot through existing spell resource owners;
- target one additional creature per slot level above 2;
- accept a separate Strength, Dexterity, Intelligence, Wisdom, or Charisma
  Ability Check Advantage choice per target;
- project each target's active effect independently without duplicating
  Concentration or target-list state.

Expected outputs:

- QNT/parity for two-target level-3 cast with distinct ability choices;
- runtime tests for target-count gate, per-target choices, and rejection of
  Constitution or shared/missing choices;
- selected-identity replay for `enhance_ability` if the existing witness does
  not already cover this promoted runtime path;
- coverage ledger updates.

### Task 2 - L3SPELL-02-DARKNESS-OBJECT-ORIGIN-DECISION

Status: `done`

Represent and promote or precisely close Darkness's object-origin branch.

Required behavior:

- read RAW for object target, not-worn-or-carried gate, Emanation origin, and
  opaque-cover blocking;
- search existing object, area, light, and opaque-cover facts before adding
  fields;
- if runtime can consume caller-supplied object-origin area facts honestly,
  promote with QNT/runtime parity;
- otherwise keep point-origin support unchanged and add a precise closure.

Expected outputs:

- either focused QNT/runtime tracer bullet or explicit closure with no reducer
  code;
- no map/object lifecycle state invented just for Darkness.

Result:

- closed the object-origin branch as table/object-spatial adjudication because
  promoted battle runtime owns point-origin magical Darkness and light-overlap
  consequences but does not own generic object position, movement, cover, area
  membership, sight-line, or map-illumination state;
- recorded the closure in `plans/unit-profile-coverage/` without reducer, QNT,
  MBT, or runtime-test changes.

### Task 3 - L3SPELL-03-SPELL-SHAPESHIFT-TRUE-FORM-REVERSION

Status: `done`

Promote spell-effect shape-shift projection and true-form reversion through the
shared shape-shifting owner used by Moonbeam.

Required behavior:

- derive replacement-form and true-form facts from one canonical active effect
  and target state;
- make Moonbeam consume shared reversion results without spell identity
  dispatch;
- avoid duplicating true-form Stat Block or character facts.

Expected outputs:

- focused spell-transformation runtime tests;
- QNT/parity for failed-save reversion and successful-save non-reversion;
- coverage updates for Moonbeam follow-up closure.

Result:

- promoted spell-effect shape-shift active effects as shared shape-shift owners;
- made Moonbeam consume shared shape-shift reversion for failed-save reversion
  and preserve spell-effect shape-shift state on successful saves without spell
  authored-identity dispatch;
- updated focused runtime tests, QNT/parity, and Moonbeam coverage artifacts.

### Task 4 - L3SPELL-04-STATBLOCK-SHAPECHANGER-TRUE-FORM-REVERSION

Status: `done`

Promote or close stat-block shapechanger active-form state as a true
shape-shift owner.

Required behavior:

- inspect SRD stat-block shapechanger facts available in the local corpus;
- if active form can be represented without duplicating true-form facts, promote
  with QNT/runtime parity;
- otherwise close with precise owner gap and no runtime metadata.

Expected outputs:

- focused stat-block runtime tests or precise closure;
- Moonbeam claim remains honest.

Result:

- inspected local SRD Moonbeam, Shape-Shifting, Truesight, and Stat Block
  shapechanger facts;
- closed stat-block Shape-Shift true-form reversion as outside promoted battle
  runtime because imp/quasit Shape-Shift is stored as prose-only Stat Block
  `actions.specials`, while battle Stat Block execution currently admits attack
  actions and rejects specials;
- recorded that a promotion would need one generic structured Stat Block
  special-action active-form owner for form choices, Speed replacement,
  equipment non-transformation, and return-to-true-form state, rather than
  Moonbeam-local metadata or stat-block authored-identity dispatch;
- updated Moonbeam coverage artifacts and added the closure note at
  `plans/unit-profile-coverage/L3SPELL-04_STATBLOCK_SHAPECHANGER_TRUE_FORM_REVERSION.md`.

### Task 5 - L3SPELL-05-DISPEL-BROADER-ONGOING-EFFECTS

Status: `done`

Promote Dispel Magic beyond tracked light and object-contact damage effects.

Required behavior:

- identify one broader ongoing Spell Effect family already represented with
  stable occurrence identity and source spell level;
- end it through the existing Dispel Magic target/effect gate;
- preserve spell-specific exceptions and table-owned target identity/range
  boundaries.

Expected outputs:

- QNT/parity for one broader occurrence family and rejection/ability-check gate;
- ledger updates without claiming all possible Dispel Magic clauses.

Result:

- promoted tracked Spiritual Weapon active-effect occurrences as the broader
  already-represented ongoing Spell Effect family for this tracer bullet;
- ended those occurrences through the existing Dispel Magic magical-effect
  target gate by stable source effect identity and source spell level,
  including higher-level spellcasting Ability Check gating;
- kept spell-specific exceptions, automatic geometry, magical-effect identity
  selection, and still-untracked creature/area/object effect families in the
  existing broader Dispel Magic follow-up.

### Task 6 - L3SPELL-06-ANTIMAGIC-PREVENTION-BOUNDARY-SPLIT

Status: `done`

Split Antimagic Field's remaining prevention clauses by actual owner.

Required behavior:

- classify spellcasting prevention, magical targeting prevention, magic item
  suppression, area clipping, teleportation/planar blocking, portal closure,
  Dispel Magic immunity, and broader suppression;
- promote only one owner if existing runtime state makes it executable;
- otherwise create precise closure/follow-up rows.

Expected outputs:

- at least one focused promoted tracer bullet or a durable split plan with
  executable owner boundaries.

Result:

- kept the current promoted Antimagic Field owner limited to ongoing Spell Effect
  suppression for represented tracked spell-light, spellObjectContactDamage, and
  Spiritual Weapon occurrences;
- did not add reducer behavior for clauses whose owners need aura membership,
  magical-effect delivery, magic-item state, area clipping, transit, portal, or
  Dispel Magic exception boundaries;
- recorded the RAW/ubiquitous-language split in
  `plans/unit-profile-coverage/L3SPELL-06_ANTIMAGIC_PREVENTION_BOUNDARY_SPLIT.md`;
- replaced the single broad follow-up with owner-specific executable task rows
  L3-FOLLOWUP-ANTIMAGIC-AURA-ACTION-INTERDICTION,
  L3-FOLLOWUP-ANTIMAGIC-MAGICAL-TARGETING-AND-EFFECT-INTERDICTION,
  L3-FOLLOWUP-ANTIMAGIC-MAGIC-ITEM-SUPPRESSION,
  L3-FOLLOWUP-ANTIMAGIC-MAGICAL-AREA-CLIPPING,
  L3-FOLLOWUP-ANTIMAGIC-TRANSIT-BLOCKING,
  L3-FOLLOWUP-ANTIMAGIC-PORTAL-CLOSURE,
  L3-FOLLOWUP-ANTIMAGIC-DISPEL-IMMUNITY, and
  L3-FOLLOWUP-ANTIMAGIC-BROADER-ONGOING-SPELL-SUPPRESSION.

### Task 7 - L3SPELL-07-HYPNOTIC-PATTERN-SURFACE-ESCAPE-REPAIR

Status: `done`

Repair Hypnotic Pattern Surface shape before runtime admission.

Required behavior:

- encode 30-foot Cube, sight-gated affected-creature predicate, Charmed plus
  Incapacitated plus Speed 0 failed-save bundle, target-damage early end, and
  another-creature shake-awake Action as typed facts;
- update Dhall/JSON/schema/tracer artifacts;
- do not implement runtime behavior in this task unless required by tests.

Expected outputs:

- Surface/unit catalog tests and honest runtime follow-up.

Result:

- encoded Hypnotic Pattern's 30-foot Cube, sight-gated affected-creature
  predicate, failed-save Charmed/Incapacitated/Speed 0 bundle, target-damage
  early end, and another-creature Action shake-awake escape as typed Surface
  facts;
- updated Dhall, generated JSON, schema/tracer handling, focused Surface catalog
  coverage, and generated unit-profile artifacts;
- left runtime behavior unpromoted and kept Task 8 as the executable runtime
  follow-up.

### Task 8 - L3SPELL-08-HYPNOTIC-PATTERN-CONTROL-RUNTIME

Status: `done`

After Task 7, promote Hypnotic Pattern runtime.

Required behavior:

- spend Magic Action and level-3-or-higher Spell Slot;
- consume caller-supplied Cube affected-creature and sight witnesses;
- resolve Wisdom saves;
- apply source-owned target effect projecting Charmed, Incapacitated, and Speed
  0;
- remove only the spell-owned target effect on damage or shake-awake Action;
- clean up on Concentration or duration end.

Expected outputs:

- QNT/runtime parity and selected-identity evidence;
- explicit table-owned closure for automatic Cube geometry and sight derivation.

### Task 9 - L3-FOLLOWUP-ANTIMAGIC-AURA-ACTION-INTERDICTION

Status: `done`

Represent typed Antimagic Field aura membership and use it to block
spellcasting and Magic actions for creatures inside the aura.

Required behavior:

- consume caller-supplied aura-membership witnesses, including the Emanation
  origin-inclusion choice;
- block action spells, Bonus Action spells, reaction spells, and non-spell Magic
  actions through one shared interdiction owner;
- reject stale action subjects that become inside the aura before resolution
  without dispatching on spell identity.

Expected outputs:

- focused runtime tests and promoted Quint/runtime parity for action discovery
  and stale subject resolution;
- no duplicated table geometry or spell-local aura membership state.

### Task 10 - L3-FOLLOWUP-ANTIMAGIC-MAGICAL-TARGETING-AND-EFFECT-INTERDICTION

Status: `done`

Block spells, magic items, and other magical effects from targeting or otherwise
affecting things inside Antimagic Field.

Required behavior:

- consume the shared aura-membership witness from Task 9;
- model a generic magical-effect source and target/effect-delivery boundary;
- reject selected targets and affected things inside the aura without duplicating
  spell-specific target state.

Expected outputs:

- one shared interdiction boundary with tests for target rejection and effect
  delivery rejection;
- no production dispatch on authored spell, feature, or item identity.

Result:

- promoted a shared magical-effect target/effect-delivery interdiction boundary
  that consumes Task 9's Antimagic Field aura-membership witness;
- covered selected spell targets, table-supplied spell area affected creatures,
  object-contact spell affected creatures, repeated object-contact delivery, and
  supported non-spell Magic Action feature targets;
- left magic-item property suppression, area clipping, transit blocking, portal
  closure, Dispel Magic immunity, and broader ongoing Spell Effect suppression
  in their existing follow-up task rows.

### Task 11 - L3-FOLLOWUP-ANTIMAGIC-MAGIC-ITEM-SUPPRESSION

Status: `blocked`

Suppress magical properties of represented magic items inside the aura or on
things inside it.

Required behavior:

- wait for represented magic item records, equipment/attunement state, and
  property projection;
- suppress properties without deleting item/equipment occurrences;
- restore properties when the aura no longer applies.

Expected outputs:

- promotion after the magic-item runtime owner exists;
- no Antimagic-local item registry or copied item-property state.

### Task 12 - L3-FOLLOWUP-ANTIMAGIC-MAGICAL-AREA-CLIPPING

Status: `ready-for-implementation-after-light-research`

Prevent areas of effect created by spells or other magic from extending into
Antimagic Field.

Required behavior:

- inspect existing area identity, membership, movement/path, Total Cover, and
  overlap facts before adding fields;
- promote a shared area geometry overlap/clipping owner if the current runtime
  can consume it honestly;
- otherwise close specific supported area shapes as table-spatial derivation
  without changing reducer behavior.

Expected outputs:

- promoted area-clipping owner or explicit table closure for each supported area
  shape;
- existing caller-supplied area membership facts remain single-sourced.

### Task 13 - L3-FOLLOWUP-ANTIMAGIC-TRANSIT-BLOCKING

Status: `ready-for-research`

Reject teleportation into or out of the aura and planar travel there for
represented transit procedures.

Required behavior:

- consume aura origin/destination membership witnesses;
- apply to at least one represented teleport procedure before claiming runtime
  support;
- keep automatic location, destination, and plane derivation table-owned.

Expected outputs:

- focused runtime tests and Quint parity over a represented transit procedure;
- explicit closure for planar travel if no planar-travel procedure state exists.

### Task 14 - L3-FOLLOWUP-ANTIMAGIC-PORTAL-CLOSURE

Status: `blocked`

Temporarily close represented portals while they are in the aura.

Required behavior:

- wait for portal occurrences with stable identity, placement, open/closed state,
  destination, and cleanup semantics;
- close portals only while the aura applies;
- restore prior portal state when the aura no longer applies.

Expected outputs:

- promotion after the portal lifecycle owner exists;
- no portal-only Antimagic state invented before portals are represented.

### Task 15 - L3-FOLLOWUP-ANTIMAGIC-DISPEL-IMMUNITY

Status: `blocked`

Represent that Dispel Magic has no effect on an Antimagic Field aura once aura
occurrences are otherwise targetable or visible to magical-effect targeting.

Required behavior:

- consume stable aura occurrence identity from the magical-effect targeting
  boundary;
- make Dispel Magic leave the aura active through a typed exception path;
- avoid authored-identity dispatch in the reducer.

Expected outputs:

- focused tests proving Dispel Magic leaves Antimagic Field active;
- QNT/runtime parity for the exception once the target boundary exists.

### Task 16 - L3-FOLLOWUP-ANTIMAGIC-BROADER-ONGOING-SPELL-SUPPRESSION

Status: `ready-for-implementation-after-light-research`

Extend Antimagic Field suppression to additional represented ongoing Spell
Effect occurrence families.

Required behavior:

- identify one additional ongoing Spell Effect family already represented with
  stable occurrence identity and source spell level;
- suppress it without deletion while the occurrence is inside the aura;
- keep suppressed duration ticking and preserve Artifact/deity exceptions.

Expected outputs:

- supported-profile claim update, focused runtime tests, and promoted
  Quint/runtime parity for each newly represented occurrence family;
- no broad claim over unrepresented creature, object, or area effect families.
