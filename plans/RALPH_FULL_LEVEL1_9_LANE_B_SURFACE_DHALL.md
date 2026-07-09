# Ralph Full Level 1-9 Lane B: Surface and Dhall

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    { "number": 1, "id": "L19B-01-LEVEL9-FEATURE-DHALL-GRANTS", "status": "already-applied", "title": "Author missing level-9 class feature Surface records and class grants" },
    { "number": 2, "id": "L19B-02-MISSING-L5-SPELL-DHALL-BATCH", "status": "already-applied", "title": "Author the twenty-four missing SRD spell-level-5 Surface records" },
    { "number": 3, "id": "L19B-03-MASS-CURE-WOUNDS-ACCESS-ADMISSION", "status": "already-applied", "title": "Verify Mass Cure Wounds definition, access, and supported invocation evidence" }
  ]
}
-->

## Lane Scope

Lane B owns authored Surface/Dhall source for level-9 class features and
spell-level-5 definitions. Dhall admission is necessary but never sufficient for
runtime, Character Sheet, MCP, or session support.

This lane is complete only after the missing authored records and grants are
implemented, generated projections are refreshed, and downstream gates no longer
report missing Surface/Dhall blockers. Listing the records in this file is not
completion.

Canonical task bodies are in `plans/RALPH_FULL_LEVEL1_9_SUPPORT.md`.

## Implementation Convergence

This lane must produce authored Surface source, generated projections, and
coverage evidence for real SRD records. Discovery about missing records is
useful only when followed by the Dhall/JSON/catalog changes that remove the
blocker.

If a Surface blocker is runnable, implement the authored Dhall/source and its
generated projections before stopping. Do not hand off a refreshed missing-list
as lane completion.

## Task DAG

| Task | Depends on | Output |
| --- | --- | --- |
| L19B-01-LEVEL9-FEATURE-DHALL-GRANTS | L19A-06-STRICT-DISPOSITION-GATE | Dhall records and class grants for `barbarian_brutal_strike`, `fighter_indomitable`, `fighter_tactical_master`, `monk_acrobatic_movement`, `paladin_abjure_foes`, `ranger_expertise`, `rogue_supreme_sneak`, and `warlock_contact_patron` grant facts. |
| L19B-02-MISSING-L5-SPELL-DHALL-BATCH | L19A-06-STRICT-DISPOSITION-GATE | Spell Definition records for `arcane_hand`, `awaken`, `commune`, `commune_with_nature`, `conjure_elemental`, `contact_other_plane`, `contagion`, `creation`, `dispel_evil_and_good`, `dream`, `greater_restoration`, `hallow`, `legend_lore`, `mislead`, `modify_memory`, `passwall`, `planar_binding`, `raise_dead`, `reincarnate`, `scrying`, `seeming`, `telepathic_bond`, `teleportation_circle`, and `tree_stride`. |
| L19B-03-MASS-CURE-WOUNDS-ACCESS-ADMISSION | L19A-06-STRICT-DISPOSITION-GATE | Verified `mass_cure_wounds` Bard/Cleric/Druid access and supported invocation evidence. |

## Required Verification

- RAW check against `.references/srd-5.2.1/Classes/` and `.references/srd-5.2.1/Spells/`.
- `pnpm --filter @dnd/surface exec tsc --noEmit --pretty false`
- `pnpm --filter @dnd/surface exec vitest run src/surface/unit-catalog.test.ts`
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`

## Forbidden Shortcuts

- Do not manually edit generated JSON.
- Do not use 5e-tools as provenance.
- Do not let authored identity become runtime dispatch.
- Do not stop at an inventory or task split when a missing authored record can
  be implemented.
