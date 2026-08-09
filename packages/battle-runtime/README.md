# @dnd/battle-runtime

`@dnd/battle-runtime` owns the battle reducer for already-composed creature
inputs: starting a battle, tracking combatants and turns, discovering battle
acts, resolving fills for those acts, and producing snapshots for callers.

The package is a runtime boundary, not an authored-content package. It consumes
battle initialization data built by a composition layer from Character Builds,
Units, and Stat Blocks. It may retain resolved Surface records
or Unit refs as battle origin data, but it does not create a second executable
content language.

Spell component text and component cost/consumption flags are authored Spell
Definition facts. This package may spend a Spell Slot and apply the admitted
battle-visible Spell Effect, but component availability, Component Pouch or
Spellcasting Focus substitution, hand/access legality, and consumed Material
component inventory mutation belong to a character equipment/component legality
owner outside battle.

## Mental Model

`@dnd/surface` is the authored-content schema. Units are Surface-authored
selectable game objects such as classes, features, weapons, armor, and spells.
Stat Blocks are Surface-authored monster/NPC records. Character Builds are
finalized build-only player-character records produced outside battle.

This package starts after those records have already been selected and composed
into battle initialization inputs. It does not define spells, features, monster
catalogs, or character-building legality. It executes implemented battle
behavior from inputs that callers provide.

## Boundary

| Source outside battle                          | Composition output            | Battle-owned state    |
| ---------------------------------------------- | ----------------------------- | --------------------- |
| Character Build plus selected Units            | `CharacterBattleCreatureInit` | `BattleCreatureState` |
| Surface `StatBlockRecord` for a monster or NPC | `StatBlockBattleCreatureInit` | `BattleCreatureState` |

Callers construct `BattleCreatureInit[]` outside this package, then call
`startBattle`. Character Build to battle-init mapping and Stat Block catalog
selection happen before this package is called.

Every `BattleCreatureInit` contains a caller-supplied Initiative score.
`@dnd/battle-runtime` orders combatants by those scores; it does not roll
Initiative, choose passive Initiative scores, or derive monster Initiative from
Stat Block modifiers during battle initialization. If multiple combatants have
the same Initiative score, the caller supplies the tie decision by ordering tied
inputs in `BattleCreatureInit[]`; the runtime preserves that order.

`@dnd/battle-runtime` must not import `@dnd/character-creation-runtime` or Core
engine packages. Character Build to battle initialization mapping belongs to the
application composition layer. Stat Block selection and catalog ownership also
belong outside this package.

Do not conflate these boundaries:

- a Character Build is not a Stat Block;
- a Stat Block is not a Unit;
- a creature initialization input is not authored content;
- a creature initialization input is not durable battle state.

### Admission, execution, and presentation ownership

Battle procedure modules have three one-way ownership zones:

| Zone           | Owns                                                                                                                               | Allowed dependency direction                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `admission`    | Parsing authored Surface records and retained composition facts into typed procedure execution facts and execution references      | May depend on execution types; must not depend on presentation                                                 |
| `execution`    | Authored-identity-free battle state, procedure facts, discovery candidates, holes/fills, replay, resolution, codecs, and snapshots | Must not depend on admission or presentation                                                                   |
| `presentation` | Joining execution references to retained authored identity, labels, summaries, and caller-facing presentation                      | May depend on admission context and execution projections; must not feed authored identity back into execution |

Newly isolated procedure owners use `src/procedure-admission/`,
`src/procedure-execution/`, and, when procedure-specific presentation is
extracted, `src/act-presentation/`. `battle-act-composition.ts` and
`battle-runtime-context.ts` are the current presentation owners.

`battle-session-execution.ts` is the outer orchestration boundary for a
selected act. It admits character procedure references, preserves the admitted
runtime context while state advances, and delegates only admitted inputs through
`battle-execution-composition.ts`. That composition boundary constructs one
authored-free Spell Procedure Execution Registry per operation and carries it
through the state-only dispatcher, nested interrupts, replay, stored-glyph
release, and final snapshot discovery. The registry is an execution dependency;
it is never Battle State or session state. Stored-glyph release enters the
registry once with its typed release target; the registry owns any
procedure-specific release routing and reuses itself for nested execution.
Reaction attack subjects receive their projected execution selection from the
owning state query before dispatcher execution; the dispatcher does not project
authored action-option records.

The gate protects the clean `procedure-execution` territory plus battle act
discovery, reducer routing, spell resolution, and dispatcher execution roots.
Directory placement alone is not evidence of a clean closure.

The distinction is ownership, not package origin. Canonical mechanical
vocabulary such as abilities, damage types, dice expressions, ranges, and
durations remains imported from its existing Surface or shared owner; execution
must not duplicate it merely to avoid a package import.

`pnpm check:battle-runtime-import-ownership` discovers every TypeScript module
under `src/procedure-execution/` and the declared battle execution roots,
resolves their complete transitive import graph, and rejects the shortest path
to an admission or presentation owner. A module becomes a protected root only
after its closure is clean.
All Surface modules except the mixed `surface/types`, `surface/schema`, and
`surface/schema-*` implementation closure are admission-owned. Within that
mixed schema/type owner, imports whose names contain `Record` (including record
parsers/codecs), names beginning with `Authored`, the aggregate `SrdSurface`
collection symbols, and inline record-type imports are classified as admission
inputs. Provenance symbols are also admission-owned and cannot enter execution.
Classification uses resolved
repository paths as well as package specifiers, so helper indirection and
relative imports cannot bypass it. Named canonical non-record mechanical
vocabulary remains allowed.
Unresolved repository-local imports and non-literal dynamic loading fail the
gate so the transitive closure cannot be silently incomplete.

The default command is the final ownership audit and enforces that complete
protected execution-root set. Every declared root is permanent, so there is no
separate candidate-audit mode. The gate also scans the complete reducer closure
for direct `.resolve` calls: only calls on an execution-registry entry are
allowed. Its self-tests cover direct, aliased, and bracket-property bypass
attempts.

`--self-test` exercises classification, transitive paths, and the split between
`stat-block-execution-state.ts` and `stat-block-presentation.ts`; unknown or
combined flags are rejected.

## Reducer Extensibility Discipline

The battle reducer interprets reusable SRD procedure families. It must not grow
one branch per Unit, spell, feature, monster action, or authored slug. Authored
content may select a supported procedure and provide that procedure's facts, but
the reducer owns the procedure's replay, state transition, and durable runtime
state.

Use this decision rule for every new authored battle ability:

- **Data-only:** add or widen authored Surface data, catalog fixtures, and
  deterministic contract tests when the ability already fits admitted readers
  and an implemented procedure family, uses existing hole flow, and needs no new
  durable runtime state. Examples include another supported one-target Stat
  Block attack shape or another weapon Attack option whose attack bonus,
  reach/range, damage dice, and damage type fit the current Attack procedure.
- **Support-profile or reader change:** update the support boundary when the SRD
  record can carry the needed facts but the current reader or support gate does
  not admit that shape yet. Unsupported legal content should fail there with a
  precise unsupported-shape issue; it should not leak partial behavior into
  `resolveBattleSubject`.
  Support gates classify authored Surface mechanics into named support profiles.
  They must not use concrete Unit ids, Spell ids, Stat Block ids, feature names,
  monster names, or authored slugs to select reducer semantics. The admitted
  mechanics shape must be parsed once and shared by discovery and resolution.
- **Reusable procedure family:** add or widen reducer behavior only when the SRD
  defines a distinct reusable resolution shape: a new timing window, resource
  spend/reset protocol, target or save procedure, interrupt/Reaction flow,
  persistent effect lifecycle, movement procedure, or other state transition
  that multiple authored records can select.
- **Runtime state widening:** add battle state only when a supported procedure
  needs durable execution facts that cannot be derived from existing battle state
  or retained origin records. Do not store derived labels, copied attack scalars,
  support-status markers, or provenance labels beside their source facts.

When a new procedure family is required, put generic SRD procedure semantics in
the relevant rule-core QNT algebra when one exists or can be deepened. Keep
battle-runtime projection in focused QNT slices that compose reducer
protocol, holes/replay, concentration or effect cleanup hooks, and small bridge
modules that project `BattleState` facts into shared rule-core contracts.
Current bridge examples cover movement/action/grapple, concentration DCs,
Reaction-window take/decline decisions, stat-block resource controls, and
selected unit-feature and spell-profile projections. Update focused reducer
tests and, for high-risk composed public replay, integrated MBT. Catalog breadth
remains a deterministic table/contract-test problem. QNT/MBT should target
procedure-family behavior and composition, not one model trace per authored
Unit, Spell Record, feature, or Stat Block.

Projected executable vocabulary must stay out of this package. Translate SRD
procedures into Surface readers, support gates, battle subjects, holes, and
reducer state instead of restoring projected-action vocabulary.

Surface holes and runtime holes are different concepts. Surface holes are
authored source-language constructs that appear in Unit/Spell/Stat Block
records before battle execution. Runtime holes are reducer-facing asks/fills
exposed by the owning runtime while replaying a selected subject. This package
may reuse shared hole identity primitives such as `HoleId` and
`HoleInstanceKey`, but its public API must expose only battle-owned hole and
fill variants that `@dnd/battle-runtime` can discover and resolve.

Stat Block Multiattack dispatch resources are a continuation of the monster's
single Attack action, not a second turn mode. Taking Multiattack spends the
Attack action and consumes the first listed attack dispatch; any remaining named
dispatch resources are pending. While those resources are pending,
`discoverBattleActs` exposes only matching dispatch attacks, Movement, and End
Turn, and `resolveBattleSubject` rejects unrelated subjects as stale. End Turn
is the explicit cancellation boundary for unspent dispatches.

Concrete authored ids are allowed in production only when the code is a catalog
boundary, a fixture/test helper, or a composition/user-selection boundary that is
retaining identity selected elsewhere. Reducer support and resolution code must
not ask "is this `fighter_second_wind`?" or "is this `magic_missile`?" to decide
behavior. It must ask whether the Surface record parses as a reusable support
profile, such as "self Bonus Action healing with use-count resource" or
"one-target prepared slot spell with automatic force damage." SRD ids appearing
in tests are acceptable because those tests verify catalog or workflow coverage;
private licensed/non-SRD examples must use renamed synthetic records that are
obviously fake.

### Authored-Id Dispatch Enforcement

Task PBA13E adds a repo-local guard:

`pnpm check:authored-id-dispatch`

The command runs `scripts/check-authored-id-dispatch-boundary.cjs` and derives
the forbidden authored-identity set from `packages/surface/content/*.json` by
collecting top-level record `id` values, nested authored reference fields ending
in `Id` (excluding protocol-only `holeId`), and Spell record names/provenance
sections. It then fails when those identities are used as semantic dispatch in
production source outside explicit boundary allowlists. This keeps enforcement
durable as new Unit/Spell/Stat Block ids and Spell records are added.

Allowed boundaries:

- catalog boundary (`@dnd/surface` catalog/schema files),
- composition/user-selection boundary (`@dnd/mcp` explicit identity-retention
  files only, not the whole package),
- tests/fixtures,
- character-creation support-profile boundary files.

Reducer support and resolution files in `@dnd/battle-runtime` are intentionally
not allowlisted. Adding authored-name branches there must fail this check.

When widening support for a new SRD record, do this instead of adding a named-id
branch:

1. Extend a support-profile parser shape/tag to admit the new Surface mechanics.
2. Thread the parsed profile through discovery and resolution.
3. Add/update contract tests that prove the profile path for the new record.
4. Keep authored ids at the outer selection and presentation boundary. Reducer
   subjects and snapshots carry typed execution references and procedure facts,
   never authored identity as an execution or replay key.

If a new package/file needs allowlisting, update
`scripts/check-authored-id-dispatch-boundary.cjs` with a narrow path rule and a
boundary reason. Do not add broad wildcards.

Retained authored identity must have a package-owned composition, settlement,
catalog-reference, or presentation consumer and must remain inert during
execution. `pnpm check:authored-id-dispatch` and the owning boundary tests are
the standing enforcement; completed inventories and issue work-records are not
runtime authorities.

### Invocation Spell Access

Character composition may project selected invocation ownership into concrete
Spell Access records. `armorOfShadowsMageArmor` is the promoted narrow case:
the selected Armor of Shadows invocation grants a self-targeted Mage Armor
Spell Invocation that spends a Magic action and no Spell Slot, then reuses the
existing `persistentArmorEffect` procedure. The Mage Armor Spell Effect remains
the same source-owned base-AC effect and still ends early when the target dons
armor.

Selected invocation ownership can also project non-spell battle features.
`eldritchMind` is the promoted narrow case: damage-triggered Constitution
Saving Throws made to maintain Concentration expose Advantage on the
`concentrationSavingThrow` hole. Ordinary Constitution Saving Throws and other
Saving Throws use their existing roll-mode projections.

### Support-profile Boundary

`@dnd/battle-runtime` admits authored Surface records through support profiles:
small, procedure-facing parser outputs that prove the record shape matches an
implemented battle procedure. Profiles are not a new executable authored-content
language. They may retain the original Surface record/id at support-profile
admission and outer presentation joins for labels and traceability. Reducer
subjects and snapshots retain only the typed execution references and procedure
facts admitted from those profiles; reducer branch selection uses the parsed
profile tag and structure.

The support-profile parser surface should cover these profile families:

- `UnitProfile.extraActionGrant`: a Unit activation that grants a non-Magic extra
  action with retained resource/use-count semantics.
- `UnitProfile.selfBonusActionHealing`: a Bonus Action, self-targeting healing
  Unit activation with retained use-count resource and class-level scaling.
- `UnitProfile.ongoingFeature`: an active ongoing feature profile. Bonus Action
  ongoing features can retain use-count resources; first-attack-roll ongoing
  features are retained as feature profiles without projecting a battle resource.
  Innate Sorcery currently uses this path for its Bonus Action activation,
  Long Rest use spend, one-minute active window, and active Sorcerer spell
  save DC/spell attack projection.
- `UnitProfile.attackDamageRider`: an optional attack-roll-hit damage rider
  profile. The replay exposes eligible rider choices on the attack damage hole,
  records selected rider use in turn resources, and derives rider dice/type from
  the admitted Unit profile plus the resolved attack.
- `UnitProfile.weaponDamageDiceRollChoice`: an optional once-per-turn weapon-hit
  damage dice choice profile. The attack damage hole exposes eligible Unit ids;
  a fill supplies two weapon damage dice candidate rolls and the selected
  candidate, while other damage riders remain separate damage components.
- `UnitProfile.saveDamageReplacement`: a passive save-damage replacement
  profile. Save-gate damage replay derives the replacement from the retained
  Unit profile, the Saving Throw outcome, and the damage procedure.
- `UnitProfile.passiveArmorClassBonus`: a passive Armor Class bonus profile.
  Defense-style Units are admitted only when they grant a fixed +1 AC bonus
  while the character is wearing Light, Medium, or Heavy armor.
- Favored Enemy's passive spell grant contributes Hunter's Mark as a
  feature-prepared spell to the character spellcasting init while retaining the
  grant source Unit for traceability instead of duplicating the spell in the
  ordinary prepared list. Other passive prepared-spell grants remain outside
  this promoted boundary until their own support claims are updated.
- Class-feature spell free casts use retained Unit resources and
  `classFeatureFreeCastSpellInvocationRef` rather than Spell Slot state.
  Favored Enemy's Hunter's Mark casts spend a Long Rest use-count resource,
  reuse the existing Hunter's Mark spell procedure, and fall back to ordinary
  slot invocation when those feature uses are exhausted.
- `SpellProfile.preparedSlotSpell`: an action-cast, slot-spent, repeated
  automatic damage spell profile such as Magic Missile, with target allocation
  carried by Spell Invocation fills.
  The profile id remains narrower than its name: it is not a general prepared
  spell execution family until additional slot-spent spell shapes are promoted.
- `SpellProfile.preparedHealingSpell`: an Action or Bonus Action, slot-spent,
  direct Hit Point restoration spell such as Cure Wounds, Healing Word, Mass
  Healing Word, or Mass Cure Wounds. The profile carries target-list bounds and
  any selected point-origin Sphere area facts, then applies one healing roll
  expression to each selected target. Slot-spent spell profiles share the
  turn-resource fact that only one Spell Slot can be expended to cast a spell on
  a turn.
- `SpellProfile.expeditiousRetreatDash`: a Bonus Action, slot-spent,
  self-targeted Dash spell profile. The cast immediately resolves Dash through
  the shared Dash movement-budget owner, starts Concentration, and stores only a
  concentration-owned permission that later projects Dash as a Bonus Action.
- `SpellProfile.seeInvisibleObserverSight`: a Magic Action, slot-spent,
  self-targeted observer-sight profile. The cast stores only a timed self
  effect on the observer. Creature visibility stays observer-scoped, and object
  or Ethereal visibility remains a caller-witness boundary rather than stored
  geometry or duplicated condition state.
- `SpellProfile.cantripSpellAttack`: an action-cast cantrip spell attack damage
  profile, with supported rider effects carried as profile data. Pure damage
  cantrips such as Poison Spray carry an empty rider list. Creature-or-object
  spell attacks may expose either a combatant target fill or a caller-supplied
  object target fact with range, Armor Class, and object damage disposition.
  Eldritch Blast and Scorching Ray use an independent spell-attack sequence
  profile: one Magic action creates the spell-specific attack count, each
  sequence part has its own creature-or-object target choice and attack roll,
  and each hit deals that spell's damage. Eldritch Blast derives beams from
  character level and cantrip access; Scorching Ray derives rays from the
  expended Spell Slot level and prepared-spell access.
- `SpellProfile.cantripSaveGateDamage` / prepared save-gate damage: an
  action-cast save-gate damage profile for either single creature targets or
  admitted caller-supplied area target sets, currently point-origin Spheres and
  self-origin Cones.
- `SpellProfile.sleepTargetAdmission`: an action-cast, slot-spent Sleep
  admission profile for caller-supplied point-origin 5-foot-radius Sphere target
  sets. It produces Wisdom Saving Throw holes only for selected creatures that
  are not automatic successes; Exhaustion Immunity is derived from retained
  Stat Block condition-immunity facts, while caller-supplied non-sleeper facts
  are accepted as automatic successes. Failed initial saves record a
  concentration-owned Sleep pending repeat-save lifecycle:
  Incapacitated until that target's next end turn, then success ends that
  target's Sleep effect and failure escalates it to concentration-owned
  Unconscious. Damage from any source or an adjacent shake-awake action ends
  Sleep on that target; breaking the caster's Concentration removes all
  remaining Sleep effects.
- `procedure: "command"` prepared spell invocation: an action-cast, slot-spent
  Command profile with slot-scaled creature target lists, a Wisdom save, and a
  command-option choice. Failed-save targets receive a source-owned pending
  Command effect that is resolved on that target's next turn. Grovel, Halt,
  Drop, Approach, and Flee are promoted options. Approach consumes
  caller-supplied shortest/direct route facts on the Movement fill and ends the
  target's turn only when that fill says the target moved within 5 feet of the
  caster; if the target has no available movement, the pending Approach effect
  clears without ending the turn. Flee consumes caller-supplied
  fastest-available moving-away route facts on the Movement fill, spends the
  selected remaining Movement budget when movement is available, and ends the
  target's turn.
- `SpellProfile.creatureTypeProtectionAndCharm`: an action-cast, slot-spent
  profile for creature-type-scoped condition/protection clauses. Animal
  Friendship admits Beast targets and applies spell-owned Charmed on failed
  Wisdom saves. Charm Person admits Humanoid targets, projects Advantage for
  hostile targets' Wisdom saves, and applies one-hour spell-owned Charmed on
  failed saves. Both Charmed profiles end when the caster or an ally damages
  the target. Protection from Evil and Good applies a concentration active
  effect that gives scoped attacker creature types Disadvantage on attack rolls
  against the protected target, prevents scoped possession and
  Charmed/Frightened application, and projects Advantage onto runtime commands
  for new Saving Throws against already-applied possession, Charmed, or
  Frightened effects from scoped creature types. Fresh spell-cast saves use
  their own spell-specific roll rules.
- `SpellProfile.preparedPersistentSpell`: a prepared persistent effect profile,
  such as a timed touch AC effect.
- `SpellProfile.preparedShieldReactionSpell`: a prepared triggered-Reaction
  spell profile that spends the reactor's Reaction and a Spell Slot from a
  pending attack-hit or named-spell target window.
- `SpellProfile.preparedHellishRebukeReactionSpell`: a prepared
  triggered-Reaction damage spell profile that spends the reactor's Reaction
  and a Spell Slot from an after-damage window whose table-supplied fact proves
  the damaging creature is visible and within range.
- `SpellProfile.preparedFeatherFallReactionSpell`: a prepared falling-trigger
  Reaction mitigation profile. Caller-supplied falling and range facts open the
  Reaction window, and caller-supplied landing facts clear the landed target's
  mitigation while returning fall-damage and Falling-Prone prevention outcomes.
- `MonsterProfile.statBlockNamedAttack`: a Stat Block named attack profile with
  attack bonus, reach or range, damage expression, and any supported resource
  control.
- `MonsterProfile.statBlockLimitedUseControl`: Stat Block limited-use and
  Recharge control profile.
- `ReactionProfile.reactionWindowProvider`: a procedure that opens a legal
  reaction decision window.

Discovery and resolution must share the same parsed profile value. If discovery
parses a Unit, Spell, or Stat Block part into a profile, resolution must re-parse
or carry the narrowed profile through the selected subject path instead of
duplicating authored-id checks.

## Focused Rule-Core MBT Bridge Contract

Focused QMBT lanes compare promoted rule-core Quint procedures with production
runtime replay without widening into the full battle state space.

Rules-kernel coverage for these lanes is tracked in
`plans/rules-kernel-coverage/`. New reducer semantics should add or extend a
semantic obligation there, then connect QNT ownership to production TS with a
focused MBT or deterministic QNT replay witness.

Placement:

- battle-runtime-focused lanes live in this package when the stable production
  entrypoints are `startBattle`, `discoverBattleActs`,
  `resolveBattleSubject`, `resolveBattleReaction`, and `snapshotBattle`;
- reusable pure procedure lanes may live beside the production procedure module
  that the reducer consumes;
- each focused lane owns one `.mbt.qnt` file at package root and one matching
  `src/*.mbt.test.ts` driver.

Projection:

- compare only QCORE-observable scalar facts such as Movement spent/derived
  remaining, Prone/Grappled flags, resource counters, pending holes, and one
  discriminated last outcome value;
- do not compare full `BattleState`, full snapshots, authored catalogs, or
  retained Surface records;
- do not store derivable projection facts or split coupled outcome facts into
  parallel fields;
- keep fixture facts explicit. Spatial legality, Opportunity Attack threats,
  spell targets, and Grapple outcomes are caller/table fills, not derived grid
  state.

## Public Trace Checkpoint Contract

`battle-runtime-public-trace-contract.qnt` owns small public replay checkpoint
vocabulary for representative traces. TypeScript projects real public reducer
results with `battleActTraceCheckpoint` and `battleResolutionTraceCheckpoint`
instead of comparing full internal `BattleState` diffs.

The first contract covers weapon Attack replay:

- attack available with `targetChoice`;
- target selected, then `attackRoll`;
- hit selected, then `rolledDice`;
- hit or miss resolves.

This is the hybrid trace shape for broad protocol checks: QNT owns semantic
checkpoint order, while TypeScript owns public fill payload width, authored
fixtures, and concrete reducer snapshots.

Focused lanes currently include:

- `rule-core-movement.mbt.qnt` / `src/rule-core-movement.mbt.test.ts` for
  QCORE7 Movement, Grapple, and Opportunity Attack decline/resume.
- `rule-core-reactions.mbt.qnt` / `src/rule-core-reactions.mbt.test.ts` for
  QCORE8 Reaction offer/decline/spend, continuation resume, Readied Movement
  release, and Concentration damage-save break/hold.
- `rule-core-feature-*.mbt.qnt` / `src/rule-core-features.mbt.test.ts` for
  QCORE9 action economy, attack rider, save/reaction, passive defense, and
  zero-Hit-Point feature projections.
- `rule-core-spell-*.mbt.qnt` / `src/rule-core-spells.mbt.test.ts` for QCORE10
  spell damage, hit point restoration, defensive effect, and readied spell
  response projections.
- `rule-core-stat-block-controls.mbt.qnt` /
  `src/rule-core-stat-block-controls.mbt.test.ts` for QCORE11 stat-block
  Multiattack dispatch projections.

These focused lanes are Procedure Parity MBT. They prove supported procedure
shapes through production reducers. Authored Unit identity coverage is owned by
`plans/unit-profile-coverage/`: deterministic matrix/projection coverage should
span all executable Units, while Selected identity replay is selective for
representative or high-risk Unit ids.

Action naming and replay:

- QNT action names mirror the owned proof action names where possible:
  `init`, the procedure action, and optional `step`;
- TS driver actions call production runtime entrypoints or extracted production
  procedures. They must not reimplement reducer decisions in test code;
- invalid outcomes project a narrow reason only when that reason is part of the
  QCORE-observable contract for the lane.

Fixture bounds:

- each MBT file documents its fixed fixture through names and constants rather
  than discovering broad authored content;
- state-space growth should come from the procedure under test, not from
  catalog enumeration or multiple independent actors;
- keep each driver focused on one bounded procedure fixture; do not add behavior
  to a broad collection point.

Run timing, process-safety, lock, and failure-reproduction procedures from
[`docs/agents/QNT-MBT.md`](../../docs/agents/QNT-MBT.md); this README owns only
the package-specific fixture contract.

The first focused runnable pattern is
`rule-core-movement.mbt.qnt` plus `src/rule-core-movement.mbt.test.ts`. It
replays the QCORE7 Movement, Dash, Disengage, Stand from Prone, Grapple,
Escape Grapple, Release Grapple, and decline-only Opportunity Attack resume
procedure names through `resolveBattleSubject` and `resolveBattleReaction`,
with a two-combatant fixture, one possible Opportunity Attack threat, one
Grapple link, Movement fills bounded to 5/10/30 feet, and one 35-foot overspend
rejection. It cites SRD 5.2.1 Movement, Prone, Grapple, Dash, Disengage, and
Opportunity Attack text through the QCORE7 proof module and uses
`UBIQUITOUS_LANGUAGE.md` terms: Speed, Movement, Prone, Grapple, and
Opportunity Attack.
The default 6-step run is the minimum focused lane that can resolve a Grapple,
advance to the Grappled target's turn, and resolve Escape Grapple.

## Battle-Runtime Witness Authoring Skeleton

New battle-runtime MBT witnesses use the driver kit and the typed witness
protocol leaf. The canonical small example is
`battle-runtime-death-saving-throw.mbt.qnt` with
`src/death-saving-throw.mbt.test.ts`.

QNT witness shape:

```quint
module battleRuntimeExampleMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = | ExampleHole

  type ExampleState = {
    protocol: WitnessProtocol[Hole],
    scenarioValue: int,
  }

  var qState: ExampleState

  pure val initialState: ExampleState = {
    protocol: witnessInit(ExampleHole),
    scenarioValue: 0,
  }

  action init = all {
    qState' = initialState,
  }

  action doDiscoverExample = all {
    qState.protocol.holes == Set(),
    qState' = qState.with("protocol", witnessNeedsHoles(Set(ExampleHole))),
  }

  action doFillExample = {
    nondet sampledInput = Set(1, 5, 10, 20).oneOf()
    all {
      qState.protocol.holes == Set(ExampleHole),
      // State the expected SRD outcome as literal facts keyed by sampledInput.
      qState' = qState
        .with("protocol", witnessResolved(ExampleHole))
        .with("scenarioValue", sampledInput),
    }
  }

  action step = any {
    doDiscoverExample,
    doFillExample,
  }
}
```

Driver shape:

```ts
const exampleStateCheck = stateCheck(
  normalizeExampleQuintState,
  (spec: ExampleProjection, impl: ExampleProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

await run({
  spec: mbtSpecPath(import.meta.dirname, "battle-runtime-example.mbt.qnt"),
  init: "init",
  step: "step",
  driver: createExampleDriver(),
  backend: "typescript",
  nTraces: mbtTraceCount(),
  maxSteps: focusedMbtMaxSteps(3),
  stateCheck: exampleStateCheck,
});
```

Authoring rules:

- import only small leaf modules from a simulated `*.mbt.qnt` witness;
- put result and open-hole state in `WitnessProtocol[h]`;
- use picks for sampled inputs and pass those picks through the TS action
  handler;
- keep separate actions for different procedure paths such as discover, fill,
  reject, interrupt, and resume;
- keep outcome literals in the witness unless the driver is an intentional
  computed oracle whose projection depends on mutable reducer state.

The quality gate in `scripts/check-mbt-driver-closure.cjs` rejects untyped
witness replay storage. New witnesses should use `WitnessProtocol[h]` for
protocol outcomes and file-local variants for scenario branches that the paired
driver must compare.

Migration map from the PBA13A authored-id violation set:

- `fighter_action_surge` maps to `UnitProfile.extraActionGrant`.
- `fighter_second_wind` maps to `UnitProfile.selfBonusActionHealing`.
- `magic_missile` maps to `SpellProfile.preparedSlotSpell`.
- `ray_of_frost` maps to `SpellProfile.cantripSpellAttack`.
- `acid_splash` maps to `SpellProfile.cantripSaveGateDamage`.
- `mage_armor` maps to `SpellProfile.preparedPersistentSpell`.

Named-type decisions:

- Replace `SupportedActionSurgeUnitFeature` and
  `SupportedSecondWindUnitFeature` with a unified
  `SupportedUnitFeatureProfile` parser output during the PBA13C migration.
- Treat existing `SupportedSpellAct` variants as spell support profiles, but do
  not admit spells by checking concrete spell ids.
- Keep Stat Block attack/resource support as profile parsing over
  `StatBlockRecord` parts; never branch on monster ids or names for semantics.

## Runtime Flow

1. Caller passes `BattleCreatureInit[]` to `startBattle` and receives a durable
   `BattleState`.
2. Caller reads `snapshotBattle(state)` and `discoverBattleActs(state)` to show
   the current battle and available acts.
3. Caller chooses a `BattleSubject` and calls
   `resolveBattleSubject({ state, subject, fills })`.
4. If the result is `needsHoles`, the caller renders those holes, stores the
   submitted fills outside `BattleState`, and calls `resolveBattleSubject` again
   with the returned durable state plus the accumulated fills.
5. If the result is `resolved`, the caller replaces the durable state with the
   returned `state`. If the result is `invalid`, the caller does not commit a new
   battle state.

`resolveBattleSubject` is replay-from-root: the `state` argument is the current
durable battle state before attempting the selected subject. Because callers
resubmit all accumulated fills on each attempt, `BattleState` stores durable
combat facts, not partially answered hole forms.

Reaction windows are the exception that proves the state handoff rule. Attack
hosts, spell-cast, failed-save, and after-damage procedures can return a
`reactionDecision` hole with an updated `BattleState` containing the
`interruptStack`. Callers must store that returned state before resolving or
declining the Reaction. A resolved Reaction chooses one admitted procedure, such
as releasing a readied spell or casting a prepared triggered-Reaction spell,
spends the reactor's Reaction, replays that procedure through its own holes if
needed, and then resumes the interrupted subject without caller-side sequencing
conventions. After-damage triggered spells that depend on visibility and range,
such as Hellish Rebuke, require those facts in the triggering frame rather than
deriving table position inside the reducer.

The promoted attack host set includes Attack action attacks, Light Property
Bonus Action Attack, and Opportunity Attack. Host-specific resource costs stay
with the host: Attack spends the matching action resource, Light Property Bonus
Action Attack spends the turn Bonus Action, and Opportunity Attack spends the
reactor's Reaction before any nested attack-hit, attack-damage, or after-damage
Reaction window is offered.

Ready spell acts carry the selected supported trigger on the subject as
`readyTrigger`; the stored `BattleReadiedSpell.trigger` is derived from that
runtime choice rather than patched into state later.
Prepared Bonus Action healing spells use `bonusActionSpell` subjects and spend
the same turn Bonus Action resource as Light Property Bonus Action Attack,
Second Wind, Cunning Action Dash/Disengage/Hide, and admitted Stat Block Bonus
Action options. Prepared Action healing spells use `actionSpell` subjects and
spend the Magic action. Target-list fills carry either direct spell-target
legality or the point-origin Sphere fact required by area healing such as Mass
Cure Wounds.
They also mark the turn's Spell Slot expenditure, so a later Magic-action or
Bonus-action spell on that turn cannot spend another Spell Slot.

Bardic Inspiration is split into the grant and die-use boundaries. The grant is
a retained Unit feature action that spends the Bard's Bonus Action and use-count
resource, records one timed die on the chosen creature, and relies on
caller-supplied range/hearing facts where table knowledge is required. The die
use is resolved after an already-failed D20 Test; it adds the rolled die to the
original attack roll, Saving Throw, or Ability Check total, reports whether the
boosted total succeeds, and expends the held die whether or not the boosted
total succeeds.

## Terms

- `BattleState` - durable battle state: battle id, Initiative order,
  combatants, and current-turn resources.
- `BattleCreatureState` - the durable runtime state for one creature in battle.
  It is identified by `CombatantId`.
- `hidePrerequisites` - GM-adjudicated battle state for whether a combatant is
  currently Heavily Obscured or behind Three-Quarters/Total Cover and out of
  enemy line of sight. The table supplies this spatial prerequisite; battle
  stores the submitted fact and does not infer cover, creature obscurement, or
  line of sight. Creature-only obscurement requires an admitted selected Unit
  profile and a referenced obscuring creature at least one effective size larger
  than the hider. Hide is not discoverable without this prerequisite.
- `hidden` - battle-owned Hide state. A successful Hide stores the Dexterity
  (Stealth) check total as the Search DC. The snapshot projects the Invisible
  condition while this state is present; it is cleared by Search, making an
  attack roll, or casting a spell with a Verbal component.
- `StatBlockMutableResourceState` - durable mutable execution state for
  authored `StatBlockRecord` monster controls: Legendary Action uses remaining,
  X/Day uses remaining, and unavailable Recharge entries. Authored limits and
  thresholds stay on the retained Stat Block and are projected only at runtime
  boundaries that need them.
- `BattleSubject` - the replay key for one discovered act that a caller wants
  to resolve. It is caller protocol, not Surface authored content, provenance,
  or a complete taxonomy of D&D actions. Current subjects cover an Attack action
  option, an action-time spell cast via the Magic action, Unit feature
  activation, or runtime commands such as End Turn and source-owned Command
  follow-up subjects (`commandGrovel`, `commandDrop`, `commandApproach`). Spell
  subjects retain a `SpellInvocationRef`; cantrips, Spell Slot casts, and
  class-feature free casts are distinct invocation sources that can share the
  same spell procedure. Add a subject for a reusable runtime procedure family,
  not for one named ability.
- `BattleHole` - a missing runtime input needed to resolve a subject, such as an
  attack target, attack roll, damage roll, Grapple/Escape outcome, or
  `heldObjectFacts` for Command Drop when no canonical character loadout facts
  already answer what the target is holding.
- `BattleFill` - caller-provided answer for a `BattleHole`.
- `BattleResolutionResult.droppedObjects` - shared object-drop outcomes for
  runtime procedures that make an actor-held or actor-worn object leave that
  actor, such as Command Drop held objects or Wild Shape equipment that falls.
  The reducer reports the dropped object and the rule source that caused the
  drop; it remains a transient outcome boundary and does not mutate character
  loadout, create table placement state, or maintain a duplicate inventory
  model.
- Wild Shape equipment-disposition fills also carry the current form's
  limb/object-handling witness. The reducer stores that witness on the active
  Wild Shape effect and uses it to gate practical worn selected-loadout weapons
  and held-weapon spell or feature consumers. Generic object interaction,
  Utilize procedures, and table placement still own their concrete object state
  and table facts. The hole is required even when the selected loadout has no
  equipment candidates, with an empty disposition list, because object-handling
  anatomy is not derivable from the form's authored identity.
- `interruptStack` - durable Reaction-window state. The top frame carries the
  trigger, eligible reactors, admitted reaction choices, and the interrupted
  continuation to resume after all reactors decline or the chosen Reaction
  procedure completes.
- `SupportProfile` - parsed, typed support-boundary value proving an authored
  Surface record shape matches one implemented runtime procedure family.
  Support profiles are admission/dispatch inputs; they are neither a second
  authored DSL nor durable battle state.
- `origin` - the Character or Stat Block origin data retained on a
  `BattleCreatureState`. Origin is not provenance. Provenance is the canonical
  rules/content source claimed by authored Surface records.
- `BattleSnapshot` - promoted JSON-friendly battle view contract for callers,
  exported with `BattleSnapshotSchema` for MCP and app output encoding. It
  carries turn order, combatant facts, available acts with public holes, pending
  Reaction decisions, readied responses, Help attack markers, and the current
  turn resource projection needed by caller/debug displays. Snapshots do not
  expose internal `Map` state or loadout-based hand occupancy.

## Supported Procedure Families

The runtime implements procedure families for battle initialization, turns and
action resources, attacks and damage, movement, reactions and concentration,
zero-HP lifecycle, supported spell invocations, supported Unit features, and
Stat Block actions. Authored records enter these procedures through structural
support-profile readers; authored identity does not select reducer behavior.

Do not maintain an authored-record or feature-by-feature completion ledger in
this README. Current executable breadth and its evidence are generated from the
owning registries:

- `plans/unit-profile-coverage/UNIT_REPORT.md` for Surface Unit and support-profile breadth;
- `plans/rules-kernel-coverage/REPORT.md` for reducer-semantic obligations and parity;
- focused tests beside `src/` for concrete boundary and replay evidence.

When widening behavior, update the relevant registry source, executable owner,
and focused QNT/runtime evidence together, then regenerate the reports through
their owning public check commands.

## State Ownership Rules

Battle state stores durable combat facts and origin references needed to
rediscover supported acts. It avoids duplicate scalar projections when a
structured runtime type already owns the fact.

Character-derived battle creatures keep selected Unit refs, resolved attack
facts, feature resource state, and spellcasting runtime state in `origin` so
battle can discover and resolve supported acts without importing
character-creation state. Character Build owns starting spell access and slot
capacity; battle state owns expended Spell Slots and feature uses once combat
starts.

Stat Block-derived battle creatures keep the generic `StatBlockRecord` in
`origin`. Supported named attacks are derived from that authored record during
discovery and replay; the runtime does not copy attack bonus, damage expression,
damage type, melee reach, normal range, or long range into MCP state. The
runtime does not import Core monster catalogs or SRD-specific Stat Block
collection types. Damage vulnerability, resistance, and immunity are likewise
read from the retained `StatBlockRecord` at the HP mutation boundary.

Armor Class is structured `ArmorClassState`, not a copied scalar. Turn resources
use `RuntimeActionResource[]`; the runtime does not store a scalar action quota.
Zero-HP lifecycle is a typed union on each `BattleCreatureState`.

## Parity

`@dnd/battle-runtime` is the active runtime semantic authority for new promoted
Unit/StatBlock-backed battle work. QNT authority is distributed across shared
rule-core slices, focused runtime slices, and focused witnesses. There is
no package-local full-shell aggregation spec; ownership lives with the focused
slice or witness that models the rule.

## Proof Strategy

Promoted battle-runtime proof is intentionally layered:

- small reusable reducer algebras stay covered by modular Quint MBT in the
  shared algebra packages;
- focused QNT slices stay the deterministic references for the
  implemented runtime subset, but self-tests are not enough for long-term
  composed reducer proof;
- broad Surface, Unit, Spell, and Stat Block catalog coverage defaults to
  table-driven contract tests, not one MBT per authored record;
- integrated battle-runtime QNT/MBT is reserved for selected high-risk verticals
  where public discovery, replay holes, reducer state, and snapshots interact;
- Surface projection MBT is a separate future decision and is not implied by
  adding battle-runtime MBT.

Do not generate Quint expected state literals from TypeScript runtime results.
That reverses the oracle direction. Package-local QNT tests must author their
expected facts in Quint, and integrated MBT must compare Quint-owned traces
against TypeScript projections.

Integrated battle-runtime MBT stays selective. Add it when a promoted behavior
is already implemented and deterministically tested, crosses multiple reducer
responsibilities, and can expose replay/order/state-transition mistakes that
isolated assertions would miss. Keep the state space small with one or two
combatants and bounded fills.

The spell sequencing integration lane is intentionally bounded to one fixed
fixture world: Dragon's Breath creates a target-granted Magic Action, the target
uses it while the caster maintains Concentration, then the caster starts Heat
Metal on a later turn, displacing the prior Concentration effect and opening the
Heat Metal repeat-damage hook only on a later caster turn. It is not a catalog
generation input and does not add identity or unit-profile coverage rows.

Prefer table-driven contract tests for ordinary catalog width: another weapon,
spell, Unit, or Stat Block that exercises an already proved reducer family
without changing its semantic shape.

Keep these facts separate when changing battle behavior:

- semantic authority: promoted `@dnd/battle-runtime`;
- feature breadth: unimplemented SRD behavior is future width work;
- proof depth: runtime behavior is checked here by reducer tests and
  focused QNT slices and MBT witnesses;
- content encoding: Surface `UnitRecord` and `StatBlockRecord` remain authored
  content, not runtime state or provenance labels.

When changing promoted battle behavior, update `src/index.ts`, focused reducer
tests, and the focused QNT owner or MBT witness together. Record
intentional modeling choices with an SRD citation or `ASSUMPTIONS.md` entry.

## RAW Traceability

Runtime rule behavior must cite the relevant local SRD passage at its executable
owner or focused test. Coverage accounting belongs to the generated
`plans/rules-kernel-coverage/` and `plans/unit-profile-coverage/` artifacts;
this README does not duplicate their behavior ledger.

## Files And Verification

- `src/index.ts` - public API facade.
- `src/identity.ts` - battle id, combatant id, Initiative score, and
  replay stack-depth brands and constructors.
- `src/zero-hp-lifecycle.ts` - stat-block and character zero-HP lifecycle
  policies used by battle initialization and HP mutation.
- `src/character-class-level.ts` - shared character class-level battle runtime
  type used by reducer state and Unit feature support parsing.
- `src/character-battle-resources.ts` - character Unit resource state,
  class-level parsing, use spending, and Spell Slot state parsing.
- `src/battle-reaction-triggers.ts` - battle-owned Reaction trigger vocabulary
  used by readied acts and Reaction windows.
- `src/battle-subjects.ts` - public replay subject schema, subject action
  vocabulary, runtime command vocabulary, and subject identity comparison.
- `src/battle-action-options.ts` - character, unarmed, weapon, and supported
  Stat Block attack option shapes plus Stat Block resource snapshots/state.
- `src/battle-init.ts` - caller-supplied battle initialization contracts for
  character-origin and stat-block-origin combatants.
- `src/battle-state-execution.ts` - canonical state execution owner for battle
  reducer state transitions and state-only procedure dispatch.
- `src/battle-session-execution.ts` - outer session orchestration owner for
  procedure admission, replay, interrupts, and route-event integration.
- `src/battle-reducer.ts` - compatibility surface that re-exports the state and
  session execution APIs.
- `src/unit-feature-support.ts` - Unit feature support-profile boundary:
  profile types, support gates, and parsers that classify authored Surface
  mechanics into battle-runtime procedure families.
- `src/index.test.ts` - deterministic reducer tests and focused Quint
  spec checks.
- `src/weapon-attack-skeleton.mbt.test.ts` - focused weapon Attack/Sneak Attack
  fixture against a Skeleton Stat Block target through public reducer APIs.
- `src/magic-missile-allocation.mbt.test.ts` - focused Magic Missile target
  allocation fixture.
- `src/extra-attack-count.mbt.test.ts` - focused Extra Attack count and
  selected-identity fixture.
- `src/adrenaline-rush.mbt.test.ts` - focused Orc Adrenaline Rush fixture.
- `src/scalar-buff.mbt.test.ts` - focused Longstrider scalar-buff fixture.
- `src/rule-core-features.mbt.test.ts` - focused QCORE9 Feature Procedure MBT
  bridge for action economy, attack rider, save/reaction, passive defense, and
  zero-Hit-Point feature projections through public battle-runtime reducer APIs.
- `battle-runtime-model.qnt` - shared battle-runtime QNT vocabulary and state
  model used by focused QNT verification lanes.
- `battle-runtime-find-familiar.qnt` - Find Familiar lifecycle and permission
  helpers imported by focused witnesses and proof modules.
- `battle-runtime-druid-wild-shape.qnt` - Druid Wild Shape form assumption,
  replacement, Temporary Hit Points, Beast stat-block projection, spellcasting
  gate, and reversion helpers imported by focused witnesses and proof modules.
- `battle-runtime-light.qnt` - light-source duration, illumination, sight
  obscurement, spell light projection, and Light/Dancing Lights/Produce
  Flame/Shillelagh reducers imported by focused witnesses and proof modules.
- `battle-runtime-creature-type-protection.qnt` - Protection from Evil and Good
  creature-type scoping, condition prevention, and possession prevention
  helpers imported by focused witnesses and proof modules.
- `battle-runtime-armor-class.qnt` - Armor Class and Mage Armor projection
  helpers imported by focused witnesses and proof modules.
- `battle-runtime-armor-spell-resolution.qnt` - Armor-of-Shadows Mage Armor
  battle-state resolution that composes Armor Class projection with action,
  turn-owner, and Rage gates.
- `battle-runtime-thaumaturgy.qnt` - Thaumaturgy Booming Voice active effect,
  one-minute effect count, and self ability-check Advantage helpers imported by
  focused witnesses and proof modules.
- `battle-runtime-bardic-inspiration.qnt` - Bardic Inspiration and Cutting
  Words d20-test helpers imported by focused witnesses and proof modules.
- `battle-runtime-hit-points.qnt` - Hit Point damage, healing, stabilization,
  zero-Hit-Point, Knock Out, drop-to-zero, and Death Saving Throw lifecycle
  helpers imported by focused witnesses and proof modules.
- `battle-runtime-turn-order.qnt` - initiative turn ownership, attack-turn
  eligibility, next-initiative calculation, and end-of-caster-next-turn timing.
- `battle-runtime-damage-adjustments.qnt` - damage type projection,
  resistance/vulnerability/immunity adjustment, and Resistance spell reduction.
- `battle-runtime-spell-cast-resources.qnt`,
  `battle-runtime-spell-slot-classification.qnt`,
  `battle-runtime-spellcasting-facts.qnt`, and
  `battle-runtime-magic-missile-arithmetic.qnt` - focused spell resource,
  classification, spellcasting, and Magic Missile facts.
- `battle-runtime-spell-attack-facts.qnt`,
  `battle-runtime-spell-attack-timed-effects.qnt`,
  `battle-runtime-spell-attack-direct-resolution.qnt`, and
  `battle-runtime-spell-attack-independent-sequence.qnt` - focused spell
  attack facts, timed effects, direct resolution, and independent sequences.
- `battle-runtime-chained-spell-attack.qnt` - Chromatic Orb chained attack
  damage choices, d8 duplicate-face facts, leap legality, and replay holes.
- `battle-runtime-save-gated-facts.qnt`,
  `battle-runtime-save-gated-damage-resolution.qnt`, and the focused
  `battle-runtime-save-condition-*.qnt` owners - save-gated projection,
  damage resolution, targeting facts, and named condition lifecycles.
- `battle-runtime-marked-riders.qnt` - Hunter's Mark and Hex durations,
  transfer eligibility, marked damage riders, and marked Ability Check modes.
- `battle-runtime-marked-spells.qnt` - Hunter's Mark, Favored Enemy Hunter's
  Mark, Hex, and marked-rider transfer spell reducers.
- `battle-runtime-reaction-window.qnt` - Reaction trigger matching, window
  opening, offer/decline/resume sequencing, reactor availability, Shield and
  Counterspell reaction helpers, and Hellish Rebuke admission facts.
- `battle-runtime-concentration.qnt` - Concentration Saving Throw DCs,
  Concentration-breaking active-effect cleanup, Sleep cleanup, and damage-ended
  Charm cleanup helpers.
- `battle-runtime-actor-combatants.qnt` - actor-to-combatant projection helpers
  for reducer procedures that update a selected creature in `BattleState`.
- `battle-runtime-sanctuary.qnt` - Sanctuary ward active-effect lifecycle and
  targeting-interdiction outcome helpers.
- `battle-runtime-feather-fall.qnt` - Feather Fall reaction admission,
  mitigation active-effect projection, and landing cleanup outcomes.
- `battle-runtime-jump-movement.qnt` - Jump movement-replacement slot scaling,
  landing facts, and per-target use tracking helpers.
- `battle-runtime-weapon-hit-spell-riders.qnt` - Divine Favor, Divine Smite,
  Ensnaring Strike, and Searing Smite damage/effect rider projections and
  after-hit spell reducers.
- `battle-runtime-weapon-hit-turn-effects.qnt` - turn-advancement composition
  for after-hit riders whose SRD effects apply when the affected target's turn
  starts.
- `battle-runtime-fighter-ongoing-features.qnt` - Fighter Rage and Reckless
  Attack ongoing-feature lifecycle, extension, resistance, and attack-roll
  hooks.
- `battle-runtime-timed-effects.qnt` - end-turn, start-turn, and round-duration
  active-effect cleanup, including timed Concentration and Hideous Laughter
  restoration.
- `battle-runtime-attack-facts.qnt` - Attack hit and Critical Hit facts,
  Fighter critical range, weapon/spell attack damage roll constructors, Sneak
  Attack eligibility, weapon mastery DCs, and reaction damage-reduction
  arithmetic.
- `battle-runtime-hidden.qnt` - Hidden execution facts, Hide-hole admission,
  Search DC projection, and reveal helpers.
- `battle-runtime-movement.qnt` - Movement projection, Dash/Disengage/Dodge,
  Grapple/Escape, forced movement, Opportunity Attack movement windows, light
  weapon bonus attacks, and movement-backed action-cost spending.
- `battle-runtime-restoration-and-buffs.qnt` - direct Hit Point restoration,
  scalar buffs, Heroism, and their movement-backed spell action costs.
- `battle-runtime-sleep-hideous-laughter.qnt` - Sleep and Hideous Laughter
  target admission, repeat-save holes, cleanup, and damage-triggered repeat
  save helpers.
- `battle-runtime-turn-advancement.qnt` - End Turn advancement, start-turn
  reset, recharge roll, and start-turn Death Saving Throw wrappers.
- `battle-runtime-ground-command.qnt` - Grease and Fog Cloud ground/obscurement
  reducers plus Command pending-effect follow-up procedures.
- `battle-runtime-weapon-attacks.qnt` - Fighter weapon attack, True Strike
  hosted weapon attack, Stat Block attack, Multiattack, and Opportunity Attack
  reducers.
- `battle-runtime-*-tests.qnt` - QNT self-tests split by domain
  so each proof module can be checked without treating one battle shell as the
  architectural center. Run them via the opt-in proof lane,
  `pnpm --filter @dnd/battle-runtime test:qnt-proofs` (each `run`-block module
  runs as its own bounded `quint test`; see `docs/agents/QNT-MBT.md` (run
  consciously)").
- `scripts/check-qnt-proof-closure.cjs` - proof-root import-closure guard shared
  with the QNT import utility used by the MBT closure gate. Replacement roots
  are capped at 60 counted files and 12,500 physical lines.
- `.github/workflows/qnt-proofs.yml` - dedicated bounded proof job. It retains
  the raw `QNT_PROOF_EVENT` stream and a structured per-module timing report as
  the `qnt-proof-timings` artifact, then compares the next successful run with
  the latest artifact from the head branch or base branch.
- `battle-runtime-weapon-attack-skeleton.mbt.qnt` - focused randomized model
  for the selected weapon Attack/Sneak Attack path.

Useful checks:

```sh
pnpm --filter @dnd/battle-runtime typecheck
pnpm --filter @dnd/battle-runtime test
pnpm --filter @dnd/battle-runtime test:qnt-proofs  # opt-in QNT proof lane; not run by `test` (see `docs/agents/QNT-MBT.md`)
MBT_TRACES=1 MBT_STEPS=6 pnpm --filter @dnd/battle-runtime test:mbt:rule-core-features
MBT_TRACES=1 MBT_STEPS=6 pnpm --filter @dnd/battle-runtime exec vitest run src/weapon-attack-skeleton.mbt.test.ts src/magic-missile-allocation.mbt.test.ts src/extra-attack-count.mbt.test.ts src/adrenaline-rush.mbt.test.ts src/scalar-buff.mbt.test.ts
```
