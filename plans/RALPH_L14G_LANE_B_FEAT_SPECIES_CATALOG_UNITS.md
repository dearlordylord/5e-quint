# Ralph Lane B: Level 4 Feat And Species Catalog Units

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L14G-B01-FEAT-MAGIC-INITIATE-DRUID",
      "status": "done",
      "title": "Install Magic Initiate Druid feat identity"
    },
    {
      "number": 2,
      "id": "L14G-B02-FEAT-SKILLED",
      "status": "done",
      "title": "Research and plan Skilled feat ownership"
    },
    {
      "number": 3,
      "id": "L14G-B03-FEAT-GRAPPLER",
      "status": "done",
      "title": "Research and plan Grappler feat ownership"
    },
    {
      "number": 4,
      "id": "L14G-B04-FEAT-GREAT-WEAPON-FIGHTING",
      "status": "done",
      "title": "Research and plan Great Weapon Fighting feat ownership"
    },
    {
      "number": 5,
      "id": "L14G-B05-FEAT-TWO-WEAPON-FIGHTING",
      "status": "done",
      "title": "Research and plan Two-Weapon Fighting feat ownership"
    },
    {
      "number": 6,
      "id": "L14G-B06-SPECIES-GNOME",
      "status": "done",
      "title": "Research and plan Gnome species ownership"
    },
    {
      "number": 7,
      "id": "L14G-B07-SPECIES-HALFLING",
      "status": "done",
      "title": "Research and plan Halfling species ownership"
    },
    {
      "number": 8,
      "id": "L14G-B08-SPECIES-HUMAN",
      "status": "done",
      "title": "Research and plan Human species and origin feat ownership"
    },
    {
      "number": 9,
      "id": "L3-FOLLOWUP-GRAPPLER-RUNTIME",
      "status": "done",
      "title": "Promote Grappler prerequisite and battle runtime support"
    },
    {
      "number": 10,
      "id": "L3-FOLLOWUP-GREAT-WEAPON-FIGHTING-RUNTIME",
      "status": "ready-for-research",
      "title": "Promote Great Weapon Fighting battle runtime support"
    },
    {
      "number": 11,
      "id": "L3-FOLLOWUP-TWO-WEAPON-FIGHTING-RUNTIME",
      "status": "ready-for-research",
      "title": "Promote Two-Weapon Fighting battle runtime support"
    },
    {
      "number": 12,
      "id": "L3-FOLLOWUP-HALFLING-BRAVE-RUNTIME",
      "status": "ready-for-research",
      "title": "Promote Halfling Brave saving throw support"
    },
    {
      "number": 13,
      "id": "L3-FOLLOWUP-HALFLING-NIMBLENESS-RUNTIME",
      "status": "ready-for-research",
      "title": "Promote Halfling Nimbleness movement support"
    },
    {
      "number": 14,
      "id": "L3-FOLLOWUP-HALFLING-LUCK-RUNTIME",
      "status": "ready-for-research",
      "title": "Promote Halfling Luck D20 Test reroll support"
    },
    {
      "number": 15,
      "id": "L3-FOLLOWUP-HALFLING-NATURALLY-STEALTHY-RUNTIME",
      "status": "ready-for-research",
      "title": "Promote Halfling Naturally Stealthy Hide support"
    },
    {
      "number": 16,
      "id": "L3-FOLLOWUP-HUMAN-RESOURCEFUL-RUNTIME",
      "status": "ready-for-research",
      "title": "Promote Human Resourceful Heroic Inspiration support"
    }
  ]
}
-->

## Lane Scope

This lane is the per-Unit feat/species catalog lane for the level-4 Golden Gate
tail.

The lane owns missing SRD feat and species identities that are reachable or
retained by a level-4 character but are not currently present in Surface content,
the Unit catalog, or the Unit matrix.

## Source Artifacts

- `plans/unit-profile-coverage/L14G_06_LEVEL4_REACHABLE_UNIT_FULL_AUDIT.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/unit-matrix.json`
- `packages/surface/content/`
- `packages/surface/src/surface/unit-catalog.ts`
- `packages/character-creation-runtime/src/`
- `packages/character-battle-runtime/src/`
- `.references/srd-5.2.1/Feats.md`
- `.references/srd-5.2.1/Character-Origins.md`
- `UBIQUITOUS_LANGUAGE.md`

## Lane Rules

- Run the Ralph task-base check before research or implementation.
- Keep feat identity, feat choice, species identity, species traits, and runtime
  projections as separate facts.
- Do not add PHB+ identities.
- Do not install a species or feat as a broad unsupported blob if its choices or
  runtime facts need a typed owner first.
- Human depends conceptually on `feat_skilled` and
  `feat_magic_initiate_druid` because Versatile grants an Origin feat choice.

## Task DAG

| Task | Depends on | Dependency reason |
| --- | --- | --- |
| L14G-B01-FEAT-MAGIC-INITIATE-DRUID | L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT | Missing level-4-reachable feat identity. |
| L14G-B02-FEAT-SKILLED | L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT | Missing level-4-reachable feat identity and Human Versatile input. |
| L14G-B03-FEAT-GRAPPLER | L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT | Missing level-4-reachable feat identity. |
| L14G-B04-FEAT-GREAT-WEAPON-FIGHTING | L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT | Missing level-4-reachable feat identity. |
| L14G-B05-FEAT-TWO-WEAPON-FIGHTING | L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT | Missing level-4-reachable feat identity. |
| L14G-B06-SPECIES-GNOME | L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT | Missing level-4-reachable species identity. |
| L14G-B07-SPECIES-HALFLING | L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT | Missing level-4-reachable species identity. |
| L14G-B08-SPECIES-HUMAN | L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT, L14G-B01-FEAT-MAGIC-INITIATE-DRUID, L14G-B02-FEAT-SKILLED | Human Versatile references real Origin feat Units. |
| L3-FOLLOWUP-GRAPPLER-RUNTIME | L14G-B03-FEAT-GRAPPLER | Runtime support consumes the typed Grappler Surface facts installed by Task 3. |
| L3-FOLLOWUP-GREAT-WEAPON-FIGHTING-RUNTIME | L14G-B04-FEAT-GREAT-WEAPON-FIGHTING | Runtime support consumes the typed Great Weapon Fighting Surface facts installed by Task 4. |
| L3-FOLLOWUP-TWO-WEAPON-FIGHTING-RUNTIME | L14G-B05-FEAT-TWO-WEAPON-FIGHTING | Runtime support consumes the typed Two-Weapon Fighting Surface facts installed by Task 5. |
| L3-FOLLOWUP-HALFLING-BRAVE-RUNTIME | L14G-B07-SPECIES-HALFLING | Runtime support consumes Halfling Brave's typed Frightened-condition Saving Throw Advantage facts. |
| L3-FOLLOWUP-HALFLING-NIMBLENESS-RUNTIME | L14G-B07-SPECIES-HALFLING | Runtime support consumes Halfling Nimbleness's typed creature-space movement permission facts. |
| L3-FOLLOWUP-HALFLING-LUCK-RUNTIME | L14G-B07-SPECIES-HALFLING | Runtime support consumes Halfling Luck's typed natural-1 D20 Test reroll facts. |
| L3-FOLLOWUP-HALFLING-NATURALLY-STEALTHY-RUNTIME | L14G-B07-SPECIES-HALFLING | Runtime support consumes Naturally Stealthy's typed Hide-obscurement permission facts. |
| L3-FOLLOWUP-HUMAN-RESOURCEFUL-RUNTIME | L14G-B08-SPECIES-HUMAN | Runtime support consumes Human Resourceful's typed Long Rest Heroic Inspiration facts. |

## Verification Command Sets

- RAW and ubiquitous-language check against the task's local SRD feat/species
  anchor and `UBIQUITOUS_LANGUAGE.md`.
- Reviewer-loop convergence: RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- Surface catalog: `pnpm --filter @dnd/surface exec vitest run src/surface/unit-catalog.test.ts && pnpm --filter @dnd/surface typecheck && pnpm unit-profile-coverage:check --write && pnpm unit-profile-coverage:check`
- Character creation: `pnpm --filter @dnd/character-creation-runtime exec vitest run src/index.test.ts && pnpm --filter @dnd/character-creation-runtime typecheck`
- Origin feat handoff: `pnpm --filter @dnd/character-battle-runtime exec vitest run src/origin-feat-selected-identity.mbt.test.ts && pnpm --filter @dnd/character-battle-runtime typecheck`
- Battle feature research that becomes implementation must add focused tests,
  then run the focused test plus `pnpm --filter @dnd/battle-runtime typecheck`,
  relevant QNT proofs if specs change, and at most one focused MBT run when
  behavior changes.
- Always run `git diff --check`.

### Task 1 - L14G-B01-FEAT-MAGIC-INITIATE-DRUID

Status: `done`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `feat_magic_initiate_druid`

SRD anchor: `.references/srd-5.2.1/Feats.md:33-45`;
`.references/srd-5.2.1/Character-Origins.md:239-243`

Current state:

- No Surface content row.
- No Unit catalog row.
- No Unit matrix row.
- Existing schema already supports Magic Initiate spell list `druid`.

Output:

- Add the SRD Origin feat identity for Magic Initiate Druid.
- Reuse the Magic Initiate list-variant model used by existing Cleric and
  Wizard Magic Initiate feats.
- Regenerate coverage so the Unit appears in the catalog/matrix.

Acceptance:

- `feat_magic_initiate_druid` is installed as an Origin feat.
- The claim mirrors the Cleric/Wizard Magic Initiate character/spell-access
  closure shape.
- No Druid spell-list provenance is collapsed into the Cleric or Wizard record.

Verification:

- Surface catalog command set.
- `git diff --check`.

### Task 2 - L14G-B02-FEAT-SKILLED

Status: `done`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `feat_skilled`

SRD anchor: `.references/srd-5.2.1/Feats.md:53-59`;
`.references/srd-5.2.1/Character-Origins.md:239-243`

Current state:

- No Surface content row.
- No Unit catalog row.
- No Unit matrix row.
- No clear feat-owned "any three skills/tools" choice owner is installed.

Output:

- Research the typed feat-owned skill/tool choice shape.
- Decide the character-creation discovery/finalization owner.
- If implementation is safe, install the feat without duplicating proficiency
  state; otherwise split a smaller implementation lane.

Acceptance:

- The plan or implementation makes the Skilled feat choice shape explicit.
- Skill/tool proficiency choices flow into the same Character Sheet facts as
  other proficiencies.
- Human's recommended Skilled path can reference a real SRD Unit id.

Verification:

- Surface catalog command set.
- Character creation command set if implementation touches choices.
- `git diff --check`.

### Task 3 - L14G-B03-FEAT-GRAPPLER

Status: `done`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `feat_grappler`

SRD anchor: `.references/srd-5.2.1/Feats.md:73-85`

Current state:

- Surface content row installed as an SRD General feat.
- Unit catalog row installed.
- Unit matrix row installed as `unsupported-profile`.
- Grapple runtime exists, but no promoted Grappler feat profile exists.

Output:

- Installed typed Surface facts for the Strength-or-Dexterity ASI, Punch and
  Grab, attack Advantage against a target Grappled by you, and Fast Wrestler
  drag-cost exception.
- Split prerequisite enforcement, selected ASI projection, and battle/QNT
  behavior into `L3-FOLLOWUP-GRAPPLER-RUNTIME`.

Acceptance:

- The Grappler Unit has a typed support boundary before any runtime behavior is
  claimed.
- No generic grapple state is duplicated into feat-owned state.

Verification:

- Surface catalog command set if catalog work is implemented.
- Focused battle tests/QNT/MBT only if battle behavior is implemented.
- `git diff --check`.

### Task 4 - L14G-B04-FEAT-GREAT-WEAPON-FIGHTING

Status: `done`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `feat_great_weapon_fighting`

SRD anchor: `.references/srd-5.2.1/Feats.md:103-107`

Current state:

- Surface content row installed as an SRD Fighting Style feat.
- Unit catalog row installed.
- Unit matrix row installed as `unsupported-profile`.
- Typed per-die "1 or 2 becomes 3" attack damage floor facts installed.
- No promoted battle runtime/QNT profile applies the floor to qualifying dice.

Output:

- Installed the SRD Fighting Style feat with typed attack damage die floor
  source facts.
- Split qualifying weapon attack damage die floor runtime/QNT behavior into
  `L3-FOLLOWUP-GREAT-WEAPON-FIGHTING-RUNTIME`.

Acceptance:

- The Great Weapon Fighting Unit has a typed support boundary before runtime
  behavior is claimed.
- Damage dice are not flattened into stale derived damage state.

Verification:

- Surface catalog command set if catalog work is implemented.
- Focused battle tests/QNT/MBT only if battle behavior is implemented.
- `git diff --check`.

### Task 5 - L14G-B05-FEAT-TWO-WEAPON-FIGHTING

Status: `done`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `feat_two_weapon_fighting`

SRD anchor: `.references/srd-5.2.1/Feats.md:109-113`

Current state:

- Surface content row installed as an SRD Fighting Style feat.
- Unit catalog row installed.
- Unit matrix row installed as `unsupported-profile`.
- Typed Light-property extra attack damage ability modifier permission facts
  installed.
- No promoted battle runtime/QNT profile consumes selected feat support to
  restore the ordinary positive ability modifier for that extra attack yet.

Output:

- Installed the SRD Fighting Style feat with typed Light-property extra attack
  damage ability modifier source facts.
- Split selected Two-Weapon Fighting runtime/QNT behavior into
  `L3-FOLLOWUP-TWO-WEAPON-FIGHTING-RUNTIME`.

Acceptance:

- The task either installs the SRD Fighting Style feat with a typed deferred
  battle owner or splits a concrete runtime/QNT implementation task.
- The ability modifier rule is not duplicated beside the attack damage owner.

Verification:

- Surface catalog command set if catalog work is implemented.
- Focused battle tests/QNT/MBT only if battle behavior is implemented.
- `git diff --check`.

### Task 6 - L14G-B06-SPECIES-GNOME

Status: `done`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `species_gnome`

SRD anchor: `.references/srd-5.2.1/Character-Origins.md:177-203`

Current state:

- No Surface species content row.
- No Unit catalog row.
- No Unit matrix row.
- Species schema currently covers only six installed species.

Output:

- Research species schema widening and the trait split for Darkvision, Gnomish
  Cunning, Forest/Rock lineage spell access, and Rock device behavior.
- Decide which trait Units are installable now and which require follow-up
  owners.

Acceptance:

- Gnome identity cannot be silently absent from the SRD species set.
- Trait ownership is explicit before catalog admission claims support.

Verification:

- Surface catalog command set.
- Character creation command set if species choices are implemented.
- `git diff --check`.

### Task 7 - L14G-B07-SPECIES-HALFLING

Status: `done`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `species_halfling`

SRD anchor: `.references/srd-5.2.1/Character-Origins.md:215-229`

Current state:

- Surface content row installed as an SRD species.
- Unit catalog row installed.
- Unit matrix row installed as `unsupported-profile`.
- Species schema includes Halfling with fixed Small size, 30-foot Speed, and
  four authored trait refs.
- Character creation admits Halfling as a fixed-size species and retains its
  trait Unit refs.

Output:

- Installed Halfling species identity and split Brave, Halfling Nimbleness,
  Luck, and Naturally Stealthy into typed Surface trait facts.
- Kept all four trait Units unsupported until their runtime owners are promoted.
- Split follow-up owner work into
  `L3-FOLLOWUP-HALFLING-BRAVE-RUNTIME`,
  `L3-FOLLOWUP-HALFLING-NIMBLENESS-RUNTIME`,
  `L3-FOLLOWUP-HALFLING-LUCK-RUNTIME`, and
  `L3-FOLLOWUP-HALFLING-NATURALLY-STEALTHY-RUNTIME`.

Acceptance:

- Halfling identity is installed in the SRD species set.
- Trait support is typed; Halfling traits are not represented by one broad
  unsupported blob or by authored-identity runtime dispatch.

Verification:

- Surface catalog command set.
- Character creation command set if species choices are implemented.
- Focused battle verification only if trait behavior is implemented.
- `git diff --check`.

### Task 8 - L14G-B08-SPECIES-HUMAN

Status: `done`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT
- L14G-B01-FEAT-MAGIC-INITIATE-DRUID
- L14G-B02-FEAT-SKILLED

Unit: `species_human`

SRD anchor: `.references/srd-5.2.1/Character-Origins.md:231-243`

Current state:

- Human is installed as an SRD species with Medium/Small size choice, Humanoid
  creature type, 30-foot Speed, and explicit Resourceful, Skillful, and
  Versatile trait refs.
- Skillful is installed as a typed species-trait skill proficiency choice.
- Versatile is installed as a typed species-trait Origin feat choice that
  references real SRD Origin feat Units.
- Resourceful is installed as typed Long Rest Heroic Inspiration Surface facts
  and remains runtime-unsupported until
  `L3-FOLLOWUP-HUMAN-RESOURCEFUL-RUNTIME`.

Output:

- Installed Human species identity and split Resourceful, Skillful, and
  Versatile into typed Surface trait facts.
- Installed character-creation discovery/finalization owners for Human
  Skillful and Versatile choices without duplicating Character Sheet
  proficiency state.
- Split Resourceful's Long Rest Heroic Inspiration runtime owner into
  `L3-FOLLOWUP-HUMAN-RESOURCEFUL-RUNTIME`.

Acceptance:

- Human identity is installed in the SRD species set.
- Versatile references real SRD Origin feat Units.
- Human choice facts flow through character creation without duplicating
  Character Sheet state.

Verification:

- Surface catalog command set.
- Character creation command set.
- Origin feat handoff command set if selected identity changes.
- `git diff --check`.

### Task 9 - L3-FOLLOWUP-GRAPPLER-RUNTIME

Status: `done`

Depends on:

- L14G-B03-FEAT-GRAPPLER

Unit: `feat_grappler`

SRD anchor: `.references/srd-5.2.1/Feats.md:73-85`

Current state:

- Grappler is installed as an SRD General feat with typed Surface facts.
- The Unit matrix records `feat_grappler` as `unsupported-profile`.
- No character-creation prerequisite owner enforces Level 4+ and Strength or
  Dexterity 13+ for General feat selection.
- No promoted battle Unit profile consumes Grappler's Punch and Grab, Attack
  Advantage, or Fast Wrestler facts.

Output:

- Research and implement the character-creation owner for Grappler General feat
  prerequisites and the selected +1 Strength-or-Dexterity ASI projection.
- Research and implement the battle owner for Punch and Grab, attack Advantage
  against a creature Grappled by you, and Fast Wrestler's drag-cost exception.
- Consume existing battle grapple state; do not store feat-owned grapple state.
- Update focused QNT/rule-core slices only where runtime semantics change, then
  promote the Unit claim to `supported-profile` or `profile-subset-supported`.

Acceptance:

- Grappler prerequisite rejection and legal Strength/Dexterity ASI choices are
  covered by character-creation tests.
- Battle behavior uses the existing grapple link/movement facts rather than
  duplicating generic grapple state.
- The Unit matrix claim names the admitted Grappler profile and does not claim
  support for any unimplemented prerequisite or battle benefit.

Verification:

- RAW and ubiquitous-language check against the Grappler SRD anchor.
- Character creation command set.
- Focused battle tests/QNT/MBT only for implemented battle behavior.
- `git diff --check`.

### Task 10 - L3-FOLLOWUP-GREAT-WEAPON-FIGHTING-RUNTIME

Status: `ready-for-research`

Depends on:

- L14G-B04-FEAT-GREAT-WEAPON-FIGHTING

Unit: `feat_great_weapon_fighting`

SRD anchor: `.references/srd-5.2.1/Feats.md:103-107`

Current state:

- Great Weapon Fighting is installed as an SRD Fighting Style feat with typed
  per-die attack damage floor Surface facts.
- The Unit matrix records `feat_great_weapon_fighting` as
  `unsupported-profile`.
- No promoted battle Unit profile or Quint parity owner applies the optional
  floor to qualifying weapon damage dice.

Output:

- Research and implement the battle owner for Great Weapon Fighting's optional
  per-die damage floor.
- Consume existing attack weapon, held-with-two-hands, Melee weapon, and
  Two-Handed-or-Versatile property facts.
- Consume individual attack damage die results for the triggering attack and
  apply the optional 1-or-2-to-3 floor before damage totals and target-side
  damage adjustments.
- Update focused QNT/rule-core slices only where runtime semantics change, then
  promote the Unit claim to `supported-profile` or `profile-subset-supported`.

Acceptance:

- Qualifying and non-qualifying weapon attacks are covered by focused battle
  tests.
- Battle behavior uses individual attack damage dice and existing weapon facts
  rather than storing a parallel derived damage total.
- The Unit matrix claim names the admitted Great Weapon Fighting profile and
  does not claim support for any unimplemented weapon/damage owner.

Verification:

- RAW and ubiquitous-language check against the Great Weapon Fighting SRD
  anchor.
- Focused battle tests/QNT/MBT only for implemented battle behavior, with at
  most one focused MBT run after code changes are complete.
- `pnpm --filter @dnd/battle-runtime typecheck`.
- `git diff --check`.

### Task 11 - L3-FOLLOWUP-TWO-WEAPON-FIGHTING-RUNTIME

Status: `ready-for-research`

Depends on:

- L14G-B05-FEAT-TWO-WEAPON-FIGHTING

Unit: `feat_two_weapon_fighting`

SRD anchor: `.references/srd-5.2.1/Feats.md:109-113`

Current state:

- Two-Weapon Fighting is installed as an SRD Fighting Style feat with typed
  Light-property extra attack damage ability modifier permission Surface facts.
- The Unit matrix records `feat_two_weapon_fighting` as
  `unsupported-profile`.
- The existing battle-runtime Light-property extra attack owner omits positive
  ability modifiers and preserves negative modifiers by default.
- No promoted battle Unit profile or Quint parity owner consumes selected
  Two-Weapon Fighting support to restore the ordinary positive ability modifier
  when the extra attack is not already adding it.

Output:

- Research and implement the battle owner for Two-Weapon Fighting's optional
  Light-property extra attack damage ability modifier permission.
- Consume selected feat support refs in the existing Light-property extra
  attack owner.
- Reuse existing attack ability and damage modifier facts; do not store
  parallel feat-owned damage modifier state.
- Preserve the default Light-property negative-modifier rule and only restore
  the ordinary positive ability modifier when the extra attack is not already
  adding it.
- Update focused QNT/rule-core slices only where runtime semantics change, then
  promote the Unit claim to `supported-profile` or `profile-subset-supported`.

Acceptance:

- Default Light-property extra attack damage, selected Two-Weapon Fighting
  positive modifier restoration, already-adding, and negative-modifier cases are
  covered by focused battle tests.
- Battle behavior uses existing attack ability and damage modifier facts rather
  than storing a parallel feat-owned damage modifier.
- The Unit matrix claim names the admitted Two-Weapon Fighting profile and does
  not claim support for any unimplemented selected-feat or damage owner.

Verification:

- RAW and ubiquitous-language check against the Two-Weapon Fighting SRD anchor.
- Focused battle tests/QNT/MBT only for implemented battle behavior, with at
  most one focused MBT run after code changes are complete.
- `pnpm --filter @dnd/battle-runtime typecheck`.
- `git diff --check`.

### Task 12 - L3-FOLLOWUP-HALFLING-BRAVE-RUNTIME

Status: `ready-for-research`

Depends on:

- L14G-B07-SPECIES-HALFLING

Unit: `species_halfling_brave`

SRD anchor: `.references/srd-5.2.1/Character-Origins.md:220-221`

Current state:

- Brave is installed as a typed passive species trait with Advantage on Saving
  Throws to avoid or end the Frightened condition.
- The Unit matrix records `species_halfling_brave` as `unsupported-profile`.
- The promoted passive-saving-throw roll-mode profile admits Poisoned
  condition-scoped species saves, not Frightened saves.

Output:

- Research and implement a condition-scoped Saving Throw Advantage owner for
  Frightened saves.
- Consume the existing typed condition filter and Saving Throw roll-mode facts;
  do not dispatch on Halfling or Brave identity.
- Update focused QNT/rule-core slices only where runtime semantics change, then
  promote the Unit claim to `supported-profile` or `profile-subset-supported`.

Acceptance:

- Avoiding and ending Frightened Saving Throws are covered by focused tests.
- The promoted profile is keyed by typed roll and condition facts, not species
  trait identity.
- The Unit matrix claim names the admitted Brave profile and does not claim
  support for unrelated saving-throw Advantage shapes.

Verification:

- RAW and ubiquitous-language check against the Brave SRD anchor.
- Focused battle tests/QNT/MBT only for implemented battle behavior, with at
  most one focused MBT run after code changes are complete.
- `pnpm --filter @dnd/battle-runtime typecheck`.
- `git diff --check`.

### Task 13 - L3-FOLLOWUP-HALFLING-NIMBLENESS-RUNTIME

Status: `ready-for-research`

Depends on:

- L14G-B07-SPECIES-HALFLING

Unit: `species_halfling_nimbleness`

SRD anchor: `.references/srd-5.2.1/Character-Origins.md:222-223`

Current state:

- Halfling Nimbleness is installed as typed creature-space movement permission
  facts with a larger-creature traversal relation and an explicit cannot-stop
  boundary.
- The Unit matrix records `species_halfling_nimbleness` as
  `unsupported-profile`.
- No promoted movement/spatial profile owns creature-space path traversal or
  occupied-space ending legality.

Output:

- Research and implement a movement owner for passing through larger creature
  spaces while rejecting stops in the same occupied space.
- Consume existing movement budget, creature size, position, and occupancy facts
  where available; do not store species-owned movement state.
- Update focused QNT/rule-core slices only where runtime semantics change, then
  promote the Unit claim to `supported-profile` or `profile-subset-supported`.

Acceptance:

- Traversal through larger creature spaces and illegal ending-space cases are
  covered by focused tests.
- The movement model consumes typed size-relation and occupancy facts rather
  than authored Halfling identity.
- The Unit matrix claim names the admitted Nimbleness profile and does not claim
  support for broader spatial movement behavior.

Verification:

- RAW and ubiquitous-language check against the Halfling Nimbleness SRD anchor.
- Focused movement tests/QNT/MBT only for implemented battle behavior, with at
  most one focused MBT run after code changes are complete.
- `pnpm --filter @dnd/battle-runtime typecheck`.
- `git diff --check`.

### Task 14 - L3-FOLLOWUP-HALFLING-LUCK-RUNTIME

Status: `ready-for-research`

Depends on:

- L14G-B07-SPECIES-HALFLING

Unit: `species_halfling_luck`

SRD anchor: `.references/srd-5.2.1/Character-Origins.md:224-225`

Current state:

- Luck is installed as typed natural-1 D20 Test reroll facts: optional reroll of
  the triggering d20 and mandatory use of the new roll.
- The Unit matrix records `species_halfling_luck` as `unsupported-profile`.
- No promoted runtime owner models post-roll optional reroll timing across
  Attack Rolls, Ability Checks, and Saving Throws.

Output:

- Research and implement a D20 Test natural-1 reroll replacement owner.
- Consume existing roll procedure facts for Attack Rolls, Ability Checks, and
  Saving Throws; do not store a parallel luck-owned roll result.
- Update focused QNT/rule-core slices only where runtime semantics change, then
  promote the Unit claim to `supported-profile` or `profile-subset-supported`.

Acceptance:

- Natural-1 trigger, non-1 rejection, optional choice timing, and mandatory new
  roll usage are covered by focused tests.
- The implementation is keyed by D20 Test and die-face facts, not Luck or
  Halfling identity.
- The Unit matrix claim names the admitted Luck profile and does not claim
  support for unrelated reroll mechanics.

Verification:

- RAW and ubiquitous-language check against the Luck SRD anchor.
- Focused roll tests/QNT/MBT only for implemented battle behavior, with at most
  one focused MBT run after code changes are complete.
- `pnpm --filter @dnd/battle-runtime typecheck`.
- `git diff --check`.

### Task 15 - L3-FOLLOWUP-HALFLING-NATURALLY-STEALTHY-RUNTIME

Status: `ready-for-research`

Depends on:

- L14G-B07-SPECIES-HALFLING

Unit: `species_halfling_naturally_stealthy`

SRD anchor: `.references/srd-5.2.1/Character-Origins.md:226-227`

Current state:

- Naturally Stealthy is installed as typed Hide action obscurement permission
  facts for being obscured only by a creature at least one size larger.
- The Unit matrix records `species_halfling_naturally_stealthy` as
  `unsupported-profile`.
- No promoted Hide/obscurement profile owns creature-caused obscurement or
  size-relation eligibility facts.

Output:

- Research and implement a Hide eligibility owner for creature-caused
  obscurement with the at-least-one-size-larger relation.
- Consume existing Hide action, creature size, observer, and obscurement facts
  where available; do not store species-owned stealth state.
- Update focused QNT/rule-core slices only where runtime semantics change, then
  promote the Unit claim to `supported-profile` or `profile-subset-supported`.

Acceptance:

- Legal creature-obscured Hide attempts and illegal size/obscurement cases are
  covered by focused tests.
- The implementation is keyed by Hide, obscurement, and size-relation facts, not
  Naturally Stealthy or Halfling identity.
- The Unit matrix claim names the admitted Naturally Stealthy profile and does
  not claim support for broader stealth behavior.

Verification:

- RAW and ubiquitous-language check against the Naturally Stealthy SRD anchor.
- Focused Hide/obscurement tests/QNT/MBT only for implemented battle behavior,
  with at most one focused MBT run after code changes are complete.
- `pnpm --filter @dnd/battle-runtime typecheck`.
- `git diff --check`.

### Task 16 - L3-FOLLOWUP-HUMAN-RESOURCEFUL-RUNTIME

Status: `ready-for-research`

Depends on:

- L14G-B08-SPECIES-HUMAN

Unit: `species_human_resourceful`

SRD anchor: `.references/srd-5.2.1/Character-Origins.md:237`

Current state:

- Resourceful is installed as typed Long Rest Heroic Inspiration Surface facts.
- The Unit matrix records `species_human_resourceful` as `unsupported-profile`.
- No promoted character-sheet or battle Unit profile grants Heroic Inspiration
  when a Human finishes a Long Rest.

Output:

- Research and implement the runtime owner for gaining Heroic Inspiration when
  the character finishes a Long Rest.
- Consume existing Long Rest completion and Heroic Inspiration state facts; do
  not store species-owned rest or inspiration state.
- Update focused QNT/rule-core slices only where runtime semantics change, then
  promote the Unit claim to `supported-profile` or `profile-subset-supported`.

Acceptance:

- Long Rest completion grants Heroic Inspiration for a character with the
  Resourceful trait, while non-Human or no-trait cases remain unchanged.
- The implementation is keyed by typed rest-trigger and grant facts, not Human
  or Resourceful authored identity.
- The Unit matrix claim names the admitted Resourceful profile and does not
  claim support for unrelated rest-triggered grants.

Verification:

- RAW and ubiquitous-language check against the Resourceful SRD anchor.
- Focused character-sheet or character-battle tests/QNT/MBT only for
  implemented runtime behavior, with at most one focused MBT run after code
  changes are complete.
- `pnpm --filter @dnd/character-sheet-runtime typecheck`.
- `pnpm --filter @dnd/character-battle-runtime typecheck` if the battle bridge
  changes.
- `git diff --check`.

## Verification

- Run reviewer-loop convergence after implementation or research: RAW
  traceability, ubiquitous-language/domain, architecture/connascence, and
  code-review passes; fix every reasonable finding and repeat until no
  reasonable findings remain.
- Run the command sets named by each task.
