# L14G-09 Character-Sheet Owner Evidence Reconciliation

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L14G-09-CHARACTER-SHEET-OWNER-EVIDENCE-RECONCILIATION",
      "status": "ready-for-implementation",
      "title": "Add checker-readable character-sheet owner evidence"
    }
  ]
}
-->

Status: ready-for-implementation
Owner: Character-sheet runtime/projection evidence and coverage checker
Depends on: L14G-06

## Residual

L14G-06 found nine level1-4 rows where the catalog/admission evidence exists but the product-readiness checker still requires character-sheet owner evidence: Bard Jack of All Trades, Cleric Life Domain Spells, Druid Circle of the Land Spells, Monk Uncanny Metabolism, Paladin Oath of Devotion Spells, Sorcerer Font of Magic, Sorcerer Draconic Spells, Warlock Magical Cunning, and Warlock Fiend Spells.

## Source Artifacts

- `plans/unit-profile-coverage/L14G_06_LEVEL4_REACHABLE_UNIT_FULL_AUDIT.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- Relevant SRD class/subclass anchors under `.references/srd-5.2.1/Classes/`
- `UBIQUITOUS_LANGUAGE.md` Character Sheet, Spell Access, Expertise, and Spell Slot terms

## Expected Output

- Checker-readable owner evidence exists for each listed row, or the row is narrowed to an explicit typed non-runtime/catalog-only disposition.
- Evidence points to the owner that actually computes the retained character fact: character sheet, spell access projection, slot recovery projection, or equivalent domain owner.
- The checker no longer depends on prose-only notes to distinguish supported character-sheet facts from missing owner evidence.

## Acceptance

- Product-readiness diagnostics no longer report these rows as `owner-evidence-required` when level1-4 coverage is regenerated.
- No battle-runtime reducer is added for facts that are only character-sheet or selection facts.
- No duplicate spell-access or proficiency state is stored beside its source facts.

## Verification

- Read the relevant SRD anchors and `UBIQUITOUS_LANGUAGE.md` before implementation.
- Run reviewer-loop convergence after implementation: RAW traceability, ubiquitous-language/domain, architecture/connascence, and code-review passes; fix every reasonable finding and repeat until no reasonable findings remain.
- Run `pnpm unit-profile-coverage:check:self-test`.
- Run `pnpm unit-profile-coverage:check`.
- Run `git diff --check`.
