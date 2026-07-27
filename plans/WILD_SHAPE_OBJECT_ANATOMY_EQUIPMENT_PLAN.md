# Wild Shape Object Anatomy And Equipment Disposition Plan

Task: `L3RES-10-WILD-SHAPE-OBJECT-ANATOMY-EQUIPMENT`

Status: implemented, including durable fallen-equipment lifecycle follow-up
([GitHub issue 212](https://github.com/dearlordylord/5e-quint/issues/212)).

## RAW And Vocabulary Anchors

- `.references/srd-5.2.1/Classes/Druid.md`, Level 2 Wild Shape, Objects:
  object handling is determined by the new form's limbs; the player chooses
  whether equipment falls in the druid's space, merges into the form, or is
  worn by it; worn equipment functions normally; the GM decides whether wearing
  each piece is practical for the form's size and shape; equipment does not
  resize or reshape; equipment the form cannot wear must either fall or merge;
  merged equipment has no effect while the druid remains in the form.
- `.references/srd-5.2.1/Playing-the-Game.md`, Interacting with Objects:
  object interaction is a creature capability constrained by action economy and
  the object rules; ordinary combat object interaction is one free interaction
  during movement or action, with later interactions using Utilize.
- `.references/srd-5.2.1/Playing-the-Game.md`, Objects and Carrying Objects:
  an object is a discrete inanimate item; carrying unusually heavy or numerous
  objects is GM-adjudicated.
- `.references/srd-5.2.1/Equipment.md`, Armor, Shield, and magic item wearing:
  armor, Shields, weapons, and worn magic items have distinct wear/hold/wield
  requirements. Wild Shape's no-resize/no-reshape rule is stricter for its own
  equipment disposition than the general magic-item fit rule.
- `UBIQUITOUS_LANGUAGE.md`:
  use Creature, Character Sheet, Stat Block, Free Hand, Action, Utilize, and
  equipment/loadout language. Do not call form-limb capability a species,
  authored identity, or Stat Block identity rule.

## Current Owners

- Character creation owns durable equipment selected into
  `CharacterBuild.equipment.owned` and the initial `CharacterBuild.equipment.loadout`
  in `packages/character-creation-runtime/src/types.ts`.
- Character Sheet and character-battle projection derive AC, hand use, attacks,
  and battle loadout refs from that loadout in
  `packages/character-sheet-runtime/src/index.ts` and
  `packages/character-battle-runtime/src/battle-character-build-projection.ts`.
- Battle initialization stores character loadout in
  `BattleCreatureState["origin"]["selectedLoadout"]`.
- The battle loadout boundary preserves armor, shield, and weapon object
  identity as `itemId` in `CharacterBattleLoadoutRef`.
- Wild Shape battle activation and per-item disposition are owned in
  `packages/battle-runtime/src/battle-reducer/unit-features.ts` and
  `packages/battle-runtime/src/battle-reducer/druid-wild-shape.ts`, with typed
  holes/fills and practicality fallbacks in the focused Wild Shape equipment
  owner.
- `BattleState.groundObjects` is the canonical battle-time exception overlay
  for durable fallen objects. Its outer key is the owning combatant id and its
  inner key is that character's existing loadout object id, so two characters
  may safely use the same loadout-local id. Its value stores the table position
  and a generic dropped-object source union.
- `characterEffectiveLoadout` projects the selected loadout minus objects in
  `groundObjects`; it does not copy ownership or add held/equipped flags.
- The typed held-weapon pickup validates character, table-supplied ground
  position, selected main/off-hand loadout slot, and object identity before
  removing the overlay. Its narrow capability does not support active-form
  pickup and does not admit armor or Shield pickup/equip; issue #230 owns
  generic custody, active-form handling, and timed donning/Shield use.
- Command Drop already has a narrow canonical held-object projection for
  character loadout in `packages/battle-runtime/src/battle-reducer/turn-end-movement.ts`.
  That helper proves loadout-derived object facts can be owned without copying
  inventory into battle effects.
- Generic object target, object contact, object drop, and worn/carried witness
  shapes already exist in `BattleTargetSpatialFact`, `BattleHole`, and
  `BattleFill`; they are spell/procedure-local and should not be reused as a
  hidden Wild Shape inventory.
- App and MCP currently pass Wild Shape known-form choices and battle actions
  through existing battle APIs. They do not own equipment disposition and should
  not compute it locally.

## Design Decision

The battle-runtime Wild Shape equipment-disposition owner derives candidates
from the character origin's selected loadout and uses typed caller/GM witnesses
for the RAW decisions the engine cannot infer.

Do not add a Wild Shape inventory, copied equipment list, or authored-form
identity table. The owner should store only the active form and the per-loadout
disposition result needed for current battle semantics. Durable ownership stays
with Character Build / Character Sheet equipment. Runtime consequences derive
from the active form, the existing selected loadout, and typed disposition
witnesses.

Fallen and merged disposition have intentionally different lifecycles:

- `merges` is stored on the active effect and restores automatically when that
  effect ends;
- `falls` requires a typed actor-space witness carrying the explicit
  `BattleTablePositionId`, enters
  `BattleState.groundObjects`, and remains there after reversion;
- fallen selected-loadout objects are unavailable to weapon and held-equipment
  consumers, including Shillelagh discovery/replay, until the typed held-weapon
  pickup succeeds.

The durable owner remains deliberately narrow for issue 212. Only the original
owner can restore a fallen selected main/off-hand weapon as held. Fallen armor
and Shields remain grounded: this increment has no operation that can turn
pickup into immediate wear. General carried custody, cross-creature pickup,
non-loadout inventory, armor's RAW 1/5/10-minute donning times, and the Shield
Utilize action belong to
[GitHub issue 230](https://github.com/dearlordylord/5e-quint/issues/230).

## Original Domain-Type Proposal

This section records the design stage. Where it differs, the implemented
decision above is authoritative: falls require a table position, and the
generic `BattleDroppedObjectSource`/`BattleState.groundObjects` owner supersedes
the temporary Wild-Shape-specific fall outcome.

Place the core vocabulary near the Wild Shape reducer owner. The exact file can
be a new helper such as
`packages/battle-runtime/src/battle-reducer/wild-shape-equipment.ts`.

```ts
export const WILD_SHAPE_EQUIPMENT_DISPOSITIONS = [
  "falls",
  "merges",
  "worn",
] as const;
export type WildShapeEquipmentDisposition =
  (typeof WILD_SHAPE_EQUIPMENT_DISPOSITIONS)[number];

export type WildShapeLoadoutObjectRef =
  | {
      readonly kind: "armor";
      readonly objectId: BattleObjectId;
      readonly unitId: UnitRecord["id"];
    }
  | {
      readonly kind: "shield";
      readonly objectId: BattleObjectId;
      readonly unitId: UnitRecord["id"];
    }
  | {
      readonly kind: "mainWeapon";
      readonly objectId: BattleObjectId;
      readonly unitId: NonNullable<
        CharacterBattleLoadoutRef["weapon"]
      >["unitId"];
    }
  | {
      readonly kind: "offHandWeapon";
      readonly objectId: BattleObjectId;
      readonly unitId: NonNullable<
        CharacterBattleLoadoutRef["offHandWeapon"]
      >["unitId"];
    };

export type WildShapeFormLimbObjectHandlingWitness =
  | { readonly kind: "canHandleObjects" }
  | { readonly kind: "cannotHandleObjects" };

export type WildShapeWearPracticalityWitness =
  | { readonly kind: "practicalToWear" }
  | {
      readonly kind: "notPracticalToWear";
      readonly fallback: Extract<
        WildShapeEquipmentDisposition,
        "falls" | "merges"
      >;
    };

export type WildShapeEquipmentDispositionChoice =
  | {
      readonly item: WildShapeLoadoutObjectRef;
      readonly disposition: Extract<
        WildShapeEquipmentDisposition,
        "falls" | "merges"
      >;
    }
  | {
      readonly item: WildShapeLoadoutObjectRef;
      readonly disposition: "worn";
      readonly practicality: WildShapeWearPracticalityWitness;
    };

export type ActiveWildShapeEquipmentDisposition =
  | {
      readonly item: WildShapeLoadoutObjectRef;
      readonly disposition: "falls";
    }
  | {
      readonly item: WildShapeLoadoutObjectRef;
      readonly disposition: "merges";
    }
  | {
      readonly item: WildShapeLoadoutObjectRef;
      readonly disposition: "worn";
    };

export type WildShapeEquipmentFallSource = {
  readonly kind: "druidWildShape";
  readonly actorId: CombatantId;
  readonly unitId: UnitRecord["id"];
  readonly formStatBlockId: BattleDruidWildShapeKnownForm["id"];
};

export type WildShapeFallenEquipmentOutcome = {
  readonly kind: "wildShapeEquipmentFell";
  readonly actorId: CombatantId;
  readonly objectId: BattleObjectId;
  readonly source: WildShapeEquipmentFallSource;
};
```

The `notPracticalToWear` witness carries the required RAW fallback so the type
cannot represent "worn but impossible" as a completed disposition. The owner
must compare every choice's `item` against the loadout-derived candidate set and
reject unknown, duplicated, or missing loadout items. The practicality witness is
nested under one item choice and does not repeat the item identity, so a caller
cannot pair a GM practicality fact for one item with a different item choice.

The first increment used a Wild-Shape-specific boundary outcome. Issue 212
superseded that temporary boundary: `BattleDroppedObjectOutcome` now has an
explicit source union including Druid Wild Shape, and fallen equipment is also
stored durably in `BattleState.groundObjects`.

## API Shape

1. Repair the character-battle loadout boundary before disposition logic.
   Change `CharacterBattleLoadoutRef["armor" | "shield"]` from bare Unit ids to
   records carrying the existing Character Build item id plus the equipment Unit
   id, matching the weapon entries. The projection should thread the existing
   `CharacterEquipmentItemId` from `CharacterBuild.equipment.loadout`; it should
   not synthesize new inventory identity.
2. Derive candidate loadout objects with one battle helper:
   `wildShapeLoadoutObjectRefs(origin.selectedLoadout)`.
   The helper should return an array derived from armor, shield, weapon, and
   off-hand weapon refs only, with `objectId` derived from the threaded item id
   at the boundary. It must not read `equipment.owned`, because battle origin
   does not carry durable inventory and RAW disposition applies to the equipment
   currently worn/carried by the battle creature.
3. Change Wild Shape assume-form acts to expose a hole instead of hard-coding
   merged equipment:
   `BattleHole { kind: "wildShapeEquipmentDisposition"; actorId; formStatBlockId; candidates }`.
   The fill remains necessary when the candidate list is empty because its
   `formLimbs` witness is an independent current-form fact used by later
   object-handling mechanics; empty candidates require `choices: []`.
4. Add a matching fill:
   `BattleFill { kind: "wildShapeEquipmentDisposition"; holeId; value: { formLimbs: WildShapeFormLimbObjectHandlingWitness; choices: readonly WildShapeEquipmentDispositionChoice[] } }`.
   The limb witness is a current-form caller/GM fact for object handling
   capability. It is not derived from form id, name, size, or provenance.
5. Replace `equipmentDisposition: "merged"` on the `druidWildShape` assume-form
   subject with either no subject-level equipment field or a narrowed
   `equipmentDispositionHole` protocol. The resolved active effect should carry
   the completed `readonly ActiveWildShapeEquipmentDisposition[]`, not the raw
   fill.
6. Update `BattleActiveEffect` so `druidWildShapeForm` contains:
   `equipmentDisposition: readonly ActiveWildShapeEquipmentDisposition[]`.
   Do not add copied equipment fields to `CharacterBattleCreatureState` or
   Character Build. The later lifecycle increment adds only the canonical
   `BattleState.groundObjects` exception overlay.
7. Derive runtime consequences from the active effect:
   merged items and fallen items must have no wearer/holder combat effect;
   worn items may contribute only through the existing loadout-based combat
   projections once a later owner wires effective loadout projection through the
   active effect. Until that wiring exists, admit only all-merged disposition for
   reducer behavior or keep non-merged disposition as typed API evidence with no
   support-profile promotion.
8. The initial increment treated fallen equipment as a Wild-Shape-specific
   boundary outcome. Issue 212 completed the future branch described there:
   the generic drop source union includes `druidWildShape`, and
   `BattleState.groundObjects` owns the durable battle-time location.
9. App and MCP should render/fill the battle hole when it appears. They must
   pass typed choices and GM practicality witnesses to battle; they must not
   infer practicality from animal names or local UI tables.

## Focused Tests

- Wild Shape loadout projection:
  - derives candidates from armor, shield, main weapon, and off-hand weapon;
  - preserves distinct armor and shield object ids after the battle loadout
    boundary repair;
  - returns an empty candidate list for a character with no selected loadout;
  - does not inspect or copy non-loadout owned equipment.
- Fill validation:
  - rejects choices for objects not in the candidate list;
  - rejects duplicated item choices;
  - rejects missing candidates;
  - accepts all candidates choosing `merges`;
  - accepts all candidates choosing `falls` and returns corresponding Wild
    Shape fallen-equipment boundary outcomes;
  - accepts `worn` only with a `practicalToWear` witness for the same item;
  - converts `notPracticalToWear` to its `falls` or `merges` fallback and never
    stores an impossible worn state.
- Active-form semantics:
  - all-merged behavior preserves the existing Wild Shape form lifecycle,
    Temporary Hit Points, stat projection, spellcasting block, and reversion;
  - merged equipment has no AC, shield, weapon, magic-item, or hand-use effect
    while active;
  - fallen equipment has no AC, shield, weapon, magic-item, or hand-use effect
    while active and emits Wild Shape fallen-equipment boundary outcomes;
  - worn equipment preserves existing loadout consequences only after an
    effective-loadout projection owner is implemented.
- Object handling:
  - the limb witness is accepted as a typed fact and is available to future
    object/Utilize workflows;
  - no runtime branch dispatches on form id, form name, recommended-form ids, or
    provenance section.

## QNT, MBT, And Coverage

Non-merged disposition now affects executable battle state. The leaf-only
`battle-runtime-wild-shape-ground-object-lifecycle.mbt.qnt` witness models one
lifecycle union whose variants distinguish effective-loadout, merged-form, and
grounded custody for one identity-preserving selected weapon. Variant payloads
retain remaining Wild Shape uses and—only where meaningful—whether the form is
active. Its
focused TypeScript driver checks the production reducer, effective-loadout
behavior, Shillelagh availability, repeated transformation/reversion, weapon
pickup, and resource spending. Focused runtime tests separately verify that
fallen armor and Shields remain grounded when passed to the held-weapon pickup
operation; they are not modeled as mutations of the weapon lifecycle identity.

Recommended progression:

1. First implementation task: add TypeScript API, fill validation, all-merged
   parity preservation, the loadout armor/shield object-identity boundary
   repair, and Wild Shape fallen-equipment boundary outcomes. Focused runtime
   tests are required. Run the existing Wild Shape form lifecycle MBT only if
   the active effect shape or subject protocol changes in a way that the
   existing MBT bridge observes.
2. Completed: active-effect disposition validity and no-effect semantics are
   covered by focused runtime tests.
3. Completed for fallen objects: effective loadout consults the durable ground
   overlay and the leaf-only QNT/MBT witness checks restoration versus pickup.
   Further form-limb object-handling consumers remain separate work.

Coverage artifacts should not claim full Wild Shape object/equipment runtime
support until non-merged dispositions are reachable through production battle
resolution and tested. If only the design document is added, no generated
coverage artifact should change.

## Verification For Implementation Task

- Re-read the RAW and `UBIQUITOUS_LANGUAGE.md` anchors above before coding.
- Run focused Wild Shape equipment tests and existing Wild Shape lifecycle tests.
- Run `git diff --check`.
- Run `pnpm unit-profile-coverage:check`,
  `pnpm rules-kernel-coverage:check`, and
  `pnpm check:mbt-driver-closure`.
- Run `pnpm quality` before handoff unless broad verification exposes an
  unrelated baseline failure outside the touched ownership surface.
- Reviewer-loop convergence: repeat RAW traceability,
  ubiquitous-language/domain naming, architecture/connascence, and code-review
  passes until no reasonable finding remains. Reject notes only with a concrete
  reason recorded in the implementation handoff.

## Non-Goals

- No parallel Wild Shape equipment inventory.
- No authored-form table that says which Beasts can wear which items or handle
  which objects.
- No app/MCP-local equipment practicality inference.
- No cross-session active Wild Shape persistence; the existing Character Sheet
  handoff boundary remains unchanged.
- No broad Utilize/action-object implementation. The held-weapon pickup consumes
  a table-supplied actor-space witness but does not add a second action-economy
  or geometry owner. Armor and Shield pickup/equip are explicitly unsupported
  until GitHub issue 230 models carried custody and their RAW donning costs.
