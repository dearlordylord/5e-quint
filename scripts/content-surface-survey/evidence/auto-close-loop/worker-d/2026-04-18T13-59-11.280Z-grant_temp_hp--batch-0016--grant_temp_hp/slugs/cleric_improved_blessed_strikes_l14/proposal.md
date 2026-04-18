## Verdict

`Improved Blessed Strikes (cleric L14)` does not fit the current surface honestly, so no `content/cleric_improved_blessed_strikes_l14.dhall` was authored.

## Why It Doesn't Fit

The feature is not a fixed standalone payload. It upgrades whichever `Blessed Strikes` option the cleric already chose.

- `Divine Strike` branch: this is a refinement of an earlier feature's extra-damage rider, not a new self-contained passive grant.
- `Potent Spellcasting` branch: this is a passive triggered rider keyed to dealing damage with a Cleric cantrip, not an activation, not a reaction, and not an elapsed-time passive operation.

Encoding both branches at once would be false. Encoding only one branch would also be false, because the SRD unit is the upgrade to the prior choice, not a separate branch-specific class feature.

## Forced Gaps

### 1. Prior-choice upgrade shape

Needed so a class feature can target and refine a previously chosen option instead of pretending both outcomes apply.

RAW evidence:

> The option you chose for Blessed Strikes grows more powerful.

### 2. Non-spell passive triggered operation

Current `PassiveMechanics.operations` only supports elapsed-time cadence. This feature needs a trigger like "when you cast a Cleric cantrip and deal damage to a creature with it".

RAW evidence:

> When you cast a Cleric cantrip and deal damage to a creature with it

### 3. `2 × ability modifier` amount expression

`grant_temp_hp` exists, but the current amount grammar cannot express twice Wisdom modifier. `DiceExpr` allows one ability modifier, not a multiplier.

RAW evidence:

> granting a number of Temporary Hit Points equal to twice your Wisdom modifier

## Classification

`structural_widening`

Reason: no existing `class_feature` mechanics family can honestly represent "upgrade a prior chosen branch", and the Potent Spellcasting branch also requires a passive trigger shape outside the current non-spell families.
