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
      "status": "ready-for-research",
      "title": "Research and plan Great Weapon Fighting feat ownership"
    },
    {
      "number": 5,
      "id": "L14G-B05-FEAT-TWO-WEAPON-FIGHTING",
      "status": "ready-for-research",
      "title": "Research and plan Two-Weapon Fighting feat ownership"
    },
    {
      "number": 6,
      "id": "L14G-B06-SPECIES-GNOME",
      "status": "ready-for-research",
      "title": "Research and plan Gnome species ownership"
    },
    {
      "number": 7,
      "id": "L14G-B07-SPECIES-HALFLING",
      "status": "ready-for-research",
      "title": "Research and plan Halfling species ownership"
    },
    {
      "number": 8,
      "id": "L14G-B08-SPECIES-HUMAN",
      "status": "ready-for-research",
      "title": "Research and plan Human species and origin feat ownership"
    },
    {
      "number": 9,
      "id": "L3-FOLLOWUP-GRAPPLER-RUNTIME",
      "status": "ready-for-research",
      "title": "Promote Grappler prerequisite and battle runtime support"
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

Status: `ready-for-research`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `feat_great_weapon_fighting`

SRD anchor: `.references/srd-5.2.1/Feats.md:103-107`

Current state:

- No Surface content row.
- No Unit catalog row.
- No Unit matrix row.
- No per-die "1 or 2 becomes 3" damage profile is installed.

Output:

- Research the Fighting Style feat catalog identity and damage-die floor owner.
- Identify QNT/runtime owners for qualifying two-handed/versatile melee attack
  damage dice.

Acceptance:

- The task either installs the SRD Fighting Style feat with a typed deferred
  battle owner or splits a concrete runtime/QNT implementation task.
- Damage dice are not flattened into stale derived damage state.

Verification:

- Surface catalog command set if catalog work is implemented.
- Focused battle tests/QNT/MBT only if battle behavior is implemented.
- `git diff --check`.

### Task 5 - L14G-B05-FEAT-TWO-WEAPON-FIGHTING

Status: `ready-for-research`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `feat_two_weapon_fighting`

SRD anchor: `.references/srd-5.2.1/Feats.md:109-113`

Current state:

- No Surface content row.
- No Unit catalog row.
- No Unit matrix row.
- No Two-Weapon Fighting override profile is installed.

Output:

- Research the Fighting Style feat catalog identity and Light extra attack
  damage owner.
- Identify whether existing offhand/Light attack reducers can consume a typed
  feat fact.

Acceptance:

- The task either installs the SRD Fighting Style feat with a typed deferred
  battle owner or splits a concrete runtime/QNT implementation task.
- The ability modifier rule is not duplicated beside the attack damage owner.

Verification:

- Surface catalog command set if catalog work is implemented.
- Focused battle tests/QNT/MBT only if battle behavior is implemented.
- `git diff --check`.

### Task 6 - L14G-B06-SPECIES-GNOME

Status: `ready-for-research`

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

Status: `ready-for-research`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `species_halfling`

SRD anchor: `.references/srd-5.2.1/Character-Origins.md:215-229`

Current state:

- No Surface species content row.
- No Unit catalog row.
- No Unit matrix row.
- Species schema excludes Halfling.

Output:

- Research species schema widening and the trait split for Brave, Halfling
  Nimbleness, Luck, and Naturally Stealthy.
- Decide which traits can reuse existing support and which need battle/runtime
  follow-up.

Acceptance:

- Halfling identity cannot be silently absent from the SRD species set.
- Trait support is typed; Halfling traits are not represented by one broad
  unsupported blob.

Verification:

- Surface catalog command set.
- Character creation command set if species choices are implemented.
- Focused battle verification only if trait behavior is implemented.
- `git diff --check`.

### Task 8 - L14G-B08-SPECIES-HUMAN

Status: `ready-for-research`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT
- L14G-B01-FEAT-MAGIC-INITIATE-DRUID
- L14G-B02-FEAT-SKILLED

Unit: `species_human`

SRD anchor: `.references/srd-5.2.1/Character-Origins.md:231-243`

Current state:

- No Surface species content row.
- No Unit catalog row.
- No Unit matrix row.
- No species-granted Origin feat choice owner is installed.

Output:

- Research Human size choice, Skillful skill choice, Resourceful Heroic
  Inspiration on Long Rest, and Versatile Origin feat choice by Unit id.
- Coordinate with missing Origin feat identities before claiming Human complete.

Acceptance:

- Human identity cannot be silently absent from the SRD species set.
- Versatile references real SRD Origin feat Units.
- Human choice facts flow through character creation without duplicating
  Character Sheet state.

Verification:

- Surface catalog command set.
- Character creation command set.
- Origin feat handoff command set if selected identity changes.
- `git diff --check`.

### Task 9 - L3-FOLLOWUP-GRAPPLER-RUNTIME

Status: `ready-for-research`

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

## Verification

- Run reviewer-loop convergence after implementation or research: RAW
  traceability, ubiquitous-language/domain, architecture/connascence, and
  code-review passes; fix every reasonable finding and repeat until no
  reasonable findings remain.
- Run the command sets named by each task.
