# Wild Shape Object Anatomy And Equipment Disposition Plan

Task: `L3RES-10-WILD-SHAPE-OBJECT-ANATOMY-EQUIPMENT`

Status: research complete; implementation plan ready.

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
- The current battle loadout boundary preserves weapon object identity as
  `itemId`, but armor and shield refs are only `UnitRecord["id"]` values in
  `CharacterBattleLoadoutRef`. That boundary must be repaired before armor or
  shield can participate in per-object Wild Shape disposition or fall outcomes.
- Wild Shape battle activation is owned in
  `packages/battle-runtime/src/battle-reducer/unit-features.ts` and
  `packages/battle-runtime/src/battle-reducer/druid-wild-shape.ts`. It currently
  admits only `equipmentDisposition: "merged"` and accepts no fills.
- The active Wild Shape effect in
  `packages/battle-runtime/src/active-effect/types.ts` can represent only
  merged equipment. There is no current executable owner for fallen or worn
  Wild Shape equipment disposition.
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

Promote a battle-runtime Wild Shape equipment-disposition owner that derives its
equipment candidates from the character origin's existing selected loadout and
uses typed caller/GM witnesses for the RAW decisions the engine cannot infer.

Do not add a Wild Shape inventory, copied equipment list, or authored-form
identity table. The owner should store only the active form and the per-loadout
disposition result needed for current battle semantics. Durable ownership stays
with Character Build / Character Sheet equipment. Runtime consequences derive
from the active form, the existing selected loadout, and typed disposition
witnesses.

## Proposed Domain Types

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
      readonly unitId: NonNullable<CharacterBattleLoadoutRef["weapon"]>["unitId"];
    }
  | {
      readonly kind: "offHandWeapon";
      readonly objectId: BattleObjectId;
      readonly unitId: NonNullable<CharacterBattleLoadoutRef["offHandWeapon"]>["unitId"];
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

`WildShapeFallenEquipmentOutcome` is intentionally not
`BattleDroppedObjectOutcome`: the existing battle drop outcome is spell-sourced
and requires `sourceSpellId`. Wild Shape is a unit-feature self-transformation,
so the first implementation should keep fallen equipment as a Wild
Shape-specific boundary result until a generic map/object lifecycle owner can
model equipment drops with an explicit source union.

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
   merged equipment when the candidate list is non-empty:
   `BattleHole { kind: "wildShapeEquipmentDisposition"; actorId; formStatBlockId; candidates }`.
   An empty candidate list should need no fill and resolve directly.
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
   Do not add equipment fields to `BattleState`, `CharacterBattleCreatureState`,
   or Character Build.
7. Derive runtime consequences from the active effect:
   merged items and fallen items must have no wearer/holder combat effect;
   worn items may contribute only through the existing loadout-based combat
   projections once a later owner wires effective loadout projection through the
   active effect. Until that wiring exists, admit only all-merged disposition for
   reducer behavior or keep non-merged disposition as typed API evidence with no
   support-profile promotion.
8. Treat fallen equipment as Wild Shape-specific boundary outcomes, not durable
   map inventory. Return `WildShapeFallenEquipmentOutcome[]`, or a future
   generic equipment-drop result with a source union that includes
   `druidWildShape`; do not reuse the current spell-sourced
   `BattleDroppedObjectOutcome`.
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

Use a small QNT owner only when non-merged disposition affects executable battle
state. A literal witness driver is enough for deterministic all-merged and
all-falls cases; do not import the full battle-runtime model into a new MBT
driver.

Recommended progression:

1. First implementation task: add TypeScript API, fill validation, all-merged
   parity preservation, the loadout armor/shield object-identity boundary
   repair, and Wild Shape fallen-equipment boundary outcomes. Focused runtime
   tests are required. Run the existing Wild Shape form lifecycle MBT only if
   the active effect shape or subject protocol changes in a way that the
   existing MBT bridge observes.
2. Second implementation task, if needed: add QNT/rule-core witness for
   disposition validity and no-effect semantics once the active effect stores
   final per-item dispositions.
3. Later behavior task: add effective-loadout projection for worn equipment and
   form-limb object handling consumers. That task must update QNT/runtime parity
   because combat attack/AC/action availability can change.

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
- No generic map/object lifecycle for dropped equipment.
- No authored-form table that says which Beasts can wear which items or handle
  which objects.
- No app/MCP-local equipment practicality inference.
- No cross-session active Wild Shape persistence; the existing Character Sheet
  handoff boundary remains unchanged.
- No broad Utilize/action-object implementation beyond carrying the typed limb
  witness for future object-handling owners.
