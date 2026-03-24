## Things I wished I knew

### Quint test output quirks

`quint test` with `--verbosity 5` shows per-test results only when using `--match` to filter. Running the full suite produces minimal output (just the module name). Use `--match "pattern"` to see individual test results. Exit code 0 = all pass.

### Cover is external context, not creature state

Cover (CoverType) is positional/environmental — not stored on CreatureState. The attack roll takes it as a parameter (`targetCoverBonus`). For saves, the same pattern applies: cover bonus is a separate pure function taking `ability` and `cover` as args, not folded into `pSaveModifiers` (which only knows about creature state). This matches how `exhaustionPenalty` is a separate flat-bonus function rather than being inside `D20Mods`.

### Flat bonuses live outside D20Mods

`D20Mods` = `{ hasAdvantage, hasDisadvantage, autoFail }`. No flat bonus field. Flat modifiers (exhaustion penalty, cover save bonus) are separate functions returning `int`. The caller composes them. Don't try to extend D20Mods to carry flat bonuses — the existing architecture deliberately separates advantage/disadvantage/autoFail from numeric modifiers.

### PLAN.md function names are suggestive

PLAN.md says "modify pSaveModifiers" but also says names are "suggestive, not prescriptive." When the suggested approach doesn't fit the existing architecture (e.g., cover isn't on CreatureState so it can't go in pSaveModifiers's current signature), use the pattern that fits. A new companion function is fine.

### Test naming convention

Tests use `test_` prefix. Save-related tests are in a "Save Modifiers" section. Cover tests for saves logically go in their own subsection ("Save Cover Bonus") between save modifiers and "Can Act / Can Speak" sections.
