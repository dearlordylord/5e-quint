# L14G-12 SRD Species And Origin Feat Reachability

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L14G-12-SRD-SPECIES-ORIGIN-FEAT-REACHABILITY",
      "status": "ready-for-research",
      "title": "Reconcile SRD species and origin feat reachability"
    }
  ]
}
-->

Status: ready-for-research
Owner: Surface species/background/origin feat catalog and character-creation owner
Depends on: L14G-06; coordinates with L14G-08

## Residual

L14G-06 found that the generated product-readiness summary reports six installed species, while local SRD Character Origins contains Dragonborn, Dwarf, Elf, Gnome, Goliath, Halfling, Human, Orc, and Tiefling. Gnome, Halfling, and Human were not detected as Surface species content or Unit matrix rows. Human also grants an Origin feat choice, which makes missing feat denominator rows such as Skilled and Magic Initiate (Druid) reachable earlier than level 4.

## Source Artifacts

- `plans/unit-profile-coverage/L14G_06_LEVEL4_REACHABLE_UNIT_FULL_AUDIT.md`
- `.references/srd-5.2.1/Character-Origins.md`
- `.references/srd-5.2.1/Feats.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/unit-matrix.json`
- `UBIQUITOUS_LANGUAGE.md` Character Sheet, Species, Background, and Origin Feat terms

## Expected Output

- The Surface catalog either includes all SRD species identities from local Character Origins or has typed exclusions that make omitted SRD species unrepresentable in the supported product scope.
- Species trait Units and origin feat grants flow through the same character-creation/admission boundary as existing species.
- Human Origin feat choice is reconciled with the feat denominator owned by L14G-08.

## Acceptance

- Generated coverage can explain the species denominator without relying on a prose-only list of omitted species.
- Missing species do not create silent gaps in retained level-4 character facts.
- No PHB+ species or background identity is introduced.

## Verification

- Read the full SRD Character Origins species/background sections before implementation.
- Run reviewer-loop convergence after implementation: RAW traceability, ubiquitous-language/domain, architecture/connascence, and code-review passes; fix every reasonable finding and repeat until no reasonable findings remain.
- Run `pnpm unit-profile-coverage:check:self-test`.
- Run `pnpm unit-profile-coverage:check`.
- Run `git diff --check`.
