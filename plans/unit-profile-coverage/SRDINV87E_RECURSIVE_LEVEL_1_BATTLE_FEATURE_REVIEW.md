# SRDINV87E Recursive Level-1 Battle Feature Review

Task 327 reviewed the completed SRDINV87A-SRDINV87D batch against the user's
default level-1 battle readiness metric. The lane is not complete: the generated
inventory still reports installed Dancing Lights spell-list rows with only
catalog evidence, not promoted battle-runtime owner evidence.

## Inventory State

Generated inventory metrics from
`plans/unit-profile-coverage/srd-unit-inventory.json` before appending the next
runtime task:

- Total generated rows: 367.
- Level-1 rows: 156.
- Spell-list pressure rows for cantrips and level-1 spells: 211.
- Missing level-1 class containers: 0.
- Default level-1 battle readiness: 298/367 (81.2%).
- Accepted rows: 232.
- Accepted no-battle-effect rows: 66.
- Battle-runtime-required rows: 28.
- Partial-battle-runtime rows: 41.
- Level-1 rows by disposition: 144
  `catalog-installed-owner-evidence-present`, 12 `non-runtime`.
- Spell Unit pressure by disposition: 136
  `catalog-installed-owner-evidence-present`, 3
  `catalog-installed-owner-evidence-required`, 72
  `catalog-only/dead-for-now`.

The distinct generated Unit runtime metric is supported executable Unit coverage:
82/117 (70.1%). That is not the product acceptance metric and does not close the
level-1 battle readiness lane.

## SRDINV87A-SRDINV87D Batch Review

| Task | Result |
|---|---|
| SRDINV87A | Produce Flame's held flame now projects source-owned Bright/Dim Light emitter facts with recast, hurl, and duration cleanup. |
| SRDINV87B | Faerie Fire's affected creatures and affected objects now project concentration-owned 10-foot Dim Light emitter facts through the outline lifecycle. |
| SRDINV87C | Hunter's Mark and Favored Enemy now project caller-supplied Wisdom (Perception or Survival) Advantage to find the marked target. |
| SRDINV87D | Sleep now treats caller-supplied non-sleeper facts as automatic save successes alongside Exhaustion Immunity. |

## Remaining Immediate Gap

The only installed Spell Definition with no profile disposition claim was
`dancing_lights`. Its three spell-list pressure rows are Bard, Sorcerer, and
Wizard Dancing Lights. Catalog admission alone is insufficient because the spell
has battle-adjacent effects: concentration-owned Dim Light sources, Bonus Action
movement, spacing constraints, range expiry, and an alternate combined Medium
form.

SRDINV87E records `dancing_lights` as an unsupported installed profile until the
runtime slice lands. This keeps the rows visible as battle-runtime-required
rather than counting them as accepted from catalog admission.

## Next Batch

Append SRDINV88A to promote Dancing Lights as a movable Dim Light runtime slice.
The task should own spell invocation, concentration lifecycle, up-to-four
light-source identities or the combined Medium-form choice, 10-foot Dim Light
emitter projection, Bonus Action repositioning, 20-foot spacing, 120-foot range
expiry, and cleanup. It should not implement map illumination derivation,
Darkvision adjustment, line of sight, color/rendering, or generic illusion
interaction.

## Source Review

Local SRD 5.2.1 source check:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md` lines 1292-1303 for
  Dancing Lights class lists, casting facts, concentration duration, up to four
  torch-size lights or one Medium form, 10-foot Dim Light, Bonus Action
  movement, spacing, and range expiry.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 177-179, 412-414, and
  656-658 for Bright Light, Dim Light, and Lightly Obscured.

`UBIQUITOUS_LANGUAGE.md` was checked for Illumination, Obscurement, Dim Light,
Lightly Obscured, Darkvision, Spell Definition, Spell Invocation, and Spell
Effect vocabulary.

## Lane Decision

Do not close the level-1 battle readiness lane. The default product acceptance
metric remains 298/367 (81.2%), while the generated supported executable Unit
coverage remains 82/117 (70.1%). SRDINV88A is the next concrete runnable batch,
followed by SRDINV88B review.

## reviewer loop Convergence

- Round 1: identified the stale checker classification where `dancing_lights`
  was still listed as an authored not-installed catalog-only closure even though
  it is now installed in the SRD Unit collection. The fix removes that stale
  closure and records an installed unsupported-profile claim so validation keeps
  the battle-runtime gap visible.
- Round 2: rejected closing Dancing Lights as catalog-only/non-runtime. Its RAW
  Dim Light, Concentration, Bonus Action movement, spacing, and range-expiry
  facts are battle-adjacent runtime pressure and need SRDINV88A.
