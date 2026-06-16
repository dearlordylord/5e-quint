# Ralph Lane C: Level 4 Character Sheet Evidence Units

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L14G-C01-BARD-JACK-OF-ALL-TRADES-EVIDENCE",
      "status": "ready-for-implementation",
      "title": "Add checker-readable evidence for Bard Jack of All Trades"
    },
    {
      "number": 2,
      "id": "L14G-C02-CLERIC-LIFE-DOMAIN-SPELLS-EVIDENCE",
      "status": "ready-for-implementation",
      "title": "Add checker-readable evidence for Cleric Life Domain Spells"
    },
    {
      "number": 3,
      "id": "L14G-C03-DRUID-LAND-SPELLS-EVIDENCE",
      "status": "ready-for-implementation",
      "title": "Add checker-readable evidence for Druid Circle of the Land Spells"
    },
    {
      "number": 4,
      "id": "L14G-C04-MONK-UNCANNY-METABOLISM-EVIDENCE",
      "status": "ready-for-implementation",
      "title": "Add checker-readable evidence for Monk Uncanny Metabolism"
    },
    {
      "number": 5,
      "id": "L14G-C05-PALADIN-DEVOTION-SPELLS-EVIDENCE",
      "status": "ready-for-implementation",
      "title": "Add checker-readable evidence for Paladin Oath of Devotion Spells"
    },
    {
      "number": 6,
      "id": "L14G-C06-SORCERER-FONT-OF-MAGIC-EVIDENCE",
      "status": "ready-for-implementation",
      "title": "Add checker-readable evidence for Sorcerer Font of Magic"
    },
    {
      "number": 7,
      "id": "L14G-C07-SORCERER-DRACONIC-SPELLS-EVIDENCE",
      "status": "ready-for-implementation",
      "title": "Add checker-readable evidence for Sorcerer Draconic Spells"
    },
    {
      "number": 8,
      "id": "L14G-C08-WARLOCK-MAGICAL-CUNNING-EVIDENCE",
      "status": "ready-for-implementation",
      "title": "Add checker-readable evidence for Warlock Magical Cunning"
    },
    {
      "number": 9,
      "id": "L14G-C09-WARLOCK-FIEND-SPELLS-EVIDENCE",
      "status": "ready-for-implementation",
      "title": "Add checker-readable evidence for Warlock Fiend Spells"
    }
  ]
}
-->

## Lane Scope

This lane is the per-Unit Character Sheet evidence lane for the level-4 Golden
Gate tail.

The pre-research found the runtime behavior is already present enough for these
nine Units. The blocker is checker-readable evidence anchoring:
`plans/unit-profile-coverage/character-sheet-owner-evidence.json` already has
rows, but several test references point at symbols imported from
`packages/character-sheet-runtime/src/test-support.ts`. The inventory checker
currently accepts only symbols declared directly in the referenced file, so the
rows are filtered and the generated inventory still reports
`owner-evidence-required`.

## Source Artifacts

- `plans/unit-profile-coverage/L14G_06_LEVEL4_REACHABLE_UNIT_FULL_AUDIT.md`
- `plans/unit-profile-coverage/character-sheet-owner-evidence.json`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-matrix.json`
- `scripts/srd-unit-inventory.cjs`
- `packages/character-sheet-runtime/src/`
- `.references/srd-5.2.1/Classes/`
- `UBIQUITOUS_LANGUAGE.md`

## Lane Rules

- Run the Ralph task-base check before implementation.
- Do not add nine runtime adapters.
- Prefer one checker/evidence-reference fix if it closes multiple Units.
- If a shared checker fix closes sibling tasks, update this file and generated
  evidence so Ralph does not repeat the same work.
- Keep Character Sheet facts separate from battle runtime facts.

## Shared Verification

- RAW and ubiquitous-language check against the task's local SRD class anchor
  and `UBIQUITOUS_LANGUAGE.md`.
- Reviewer-loop convergence: RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`

### Task 1 - L14G-C01-BARD-JACK-OF-ALL-TRADES-EVIDENCE

Status: `ready-for-implementation`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `bard_jack_of_all_trades`

SRD anchor: `.references/srd-5.2.1/Classes/Bard.md:99-104`

Current state:

- Surface installed.
- Unit matrix reports `supported-profile`.
- Inventory still requires Character Sheet owner evidence.
- Manifest row exists but imported test-name references are filtered.

Output:

- Make checker-readable evidence resolve for the existing Character Sheet owner.
- Evidence must prove half proficiency bonus, rounded down, applies only to
  unproficient skill checks with no other proficiency bonus.

Acceptance:

- Generated inventory moves this row out of `owner-evidence-required`.
- No Bard-specific runtime adapter is added.

Verification:

- `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/ability-checks.test.ts`
- Shared lane verification.

### Task 2 - L14G-C02-CLERIC-LIFE-DOMAIN-SPELLS-EVIDENCE

Status: `ready-for-implementation`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `cleric_life_domain_spells`

SRD anchor: `.references/srd-5.2.1/Classes/Cleric.md:317-329`

Current state:

- Surface installed.
- Unit matrix reports `supported-profile`.
- Manifest evidence exists but is filtered by shared test-reference handling.

Output:

- Add or repair checker-readable evidence for retained subclass feature spell
  access.
- Reuse the class-feature spell access owner pattern.

Acceptance:

- Generated inventory accepts the owner evidence.
- Spell Access facts are not duplicated into a separate prepared spell list.

Verification:

- `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/class-feature-spells.test.ts`
- Shared lane verification.

### Task 3 - L14G-C03-DRUID-LAND-SPELLS-EVIDENCE

Status: `ready-for-implementation`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `druid_circle_of_the_land_spells`

SRD anchor: `.references/srd-5.2.1/Classes/Druid.md:366-405`

Current state:

- Surface installed.
- Unit matrix reports `supported-profile`.
- Deterministic evidence exists but generated inventory still requires owner
  evidence.

Output:

- Add or repair checker-readable evidence for selected-land state and land spell
  access.
- Preserve explicit Long Rest land choice ownership.

Acceptance:

- Generated inventory accepts the owner evidence.
- Selected land and spell access stay derived from one owner; no duplicate
  prepared spell state is added.

Verification:

- `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/druid-features.test.ts`
- Shared lane verification.

### Task 4 - L14G-C04-MONK-UNCANNY-METABOLISM-EVIDENCE

Status: `ready-for-implementation`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `monk_uncanny_metabolism`

SRD anchor: `.references/srd-5.2.1/Classes/Monk.md:96-101`

Current state:

- Surface installed.
- Unit matrix reports `supported-profile`.
- Creation, sheet, and battle evidence exists, but sheet manifest references are
  filtered by test-name resolution.

Output:

- Add or repair checker-readable evidence for once per Long Rest use state,
  Initiative recovery of Focus Points, and capped healing.

Acceptance:

- Generated inventory accepts the owner evidence.
- Focus Point and HP recovery facts remain owned by Character Sheet resource
  logic, not by a battle-only adapter.

Verification:

- `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/resources.test.ts`
- Shared lane verification.

### Task 5 - L14G-C05-PALADIN-DEVOTION-SPELLS-EVIDENCE

Status: `ready-for-implementation`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `paladin_oath_of_devotion_spells`

SRD anchor: `.references/srd-5.2.1/Classes/Paladin.md:249-262`

Current state:

- Surface installed.
- Unit matrix reports `supported-profile`.
- Selected-identity evidence exists but generated inventory still requires owner
  evidence.

Output:

- Add or repair checker-readable evidence for Paladin subclass spell access
  tiers.

Acceptance:

- Generated inventory accepts the owner evidence.
- The implementation reuses the class-feature spell access owner pattern.

Verification:

- `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/class-feature-spells.test.ts`
- Shared lane verification.

### Task 6 - L14G-C06-SORCERER-FONT-OF-MAGIC-EVIDENCE

Status: `ready-for-implementation`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `sorcerer_font_of_magic`

SRD anchor: `.references/srd-5.2.1/Classes/Sorcerer.md:87-110`

Current state:

- Surface installed.
- Unit matrix reports `profile-subset-supported`.
- Manifest evidence exists but generated inventory still requires owner
  evidence.

Output:

- Add or repair checker-readable evidence for Sorcery Point pool, Long Rest
  restore, slot-to-points, points-to-created-slot state, and created slot
  cleanup.
- Preserve deferred battle action/source-ledger closure.

Acceptance:

- Generated inventory accepts the Character Sheet owner evidence.
- Battle action behavior is not claimed beyond the existing profile subset.

Verification:

- `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/resources.test.ts src/spell-slots.test.ts`
- Shared lane verification.

### Task 7 - L14G-C07-SORCERER-DRACONIC-SPELLS-EVIDENCE

Status: `ready-for-implementation`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `sorcerer_draconic_spells`

SRD anchor: `.references/srd-5.2.1/Classes/Sorcerer.md:419-431`

Current state:

- Surface installed.
- Unit matrix reports `supported-profile`.
- Selected-identity evidence exists but generated inventory still requires owner
  evidence.

Output:

- Add or repair checker-readable evidence for Sorcerer Draconic subclass spell
  access.

Acceptance:

- Generated inventory accepts the owner evidence.
- The implementation reuses the class-feature spell access owner pattern.

Verification:

- `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/class-feature-spells.test.ts`
- Shared lane verification.

### Task 8 - L14G-C08-WARLOCK-MAGICAL-CUNNING-EVIDENCE

Status: `ready-for-implementation`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `warlock_magical_cunning`

SRD anchor: `.references/srd-5.2.1/Classes/Warlock.md:92-95`

Current state:

- Surface installed.
- Unit matrix reports `supported-profile`.
- Selected-identity MBT and deterministic evidence exist.
- Manifest currently points at helpers rather than named test cases.

Output:

- Add or repair checker-readable evidence for the one-minute rite, expended Pact
  Slot recovery up to half max rounded up, once per Long Rest state, and Long
  Rest reset.

Acceptance:

- Generated inventory accepts the owner evidence.
- Evidence references named tests or accepted imported test-name constants, not
  generic helpers.

Verification:

- `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/rests.test.ts src/spell-slots-pact-slots.mbt.test.ts`
- Shared lane verification.

### Task 9 - L14G-C09-WARLOCK-FIEND-SPELLS-EVIDENCE

Status: `ready-for-implementation`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `warlock_fiend_spells`

SRD anchor: `.references/srd-5.2.1/Classes/Warlock.md:464-476`

Current state:

- Surface installed.
- Unit matrix reports `supported-profile`.
- Selected-identity evidence exists but generated inventory still requires owner
  evidence.

Output:

- Add or repair checker-readable evidence for Warlock Fiend subclass spell
  access.

Acceptance:

- Generated inventory accepts the owner evidence.
- The implementation reuses the class-feature spell access owner pattern.

Verification:

- `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/class-feature-spells.test.ts`
- Shared lane verification.

## Verification

- Run reviewer-loop convergence after implementation: RAW traceability,
  ubiquitous-language/domain, architecture/connascence, and code-review passes;
  fix every reasonable finding and repeat until no reasonable findings remain.
- Run the commands named by each task plus shared lane verification.
