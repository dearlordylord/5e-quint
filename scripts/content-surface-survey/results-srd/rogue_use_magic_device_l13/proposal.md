# Proposal: Use Magic Device (rogue L13)

## Outcome: structural_widening

## Summary

Use Magic Device cannot be honestly encoded in the current surface. The primary blocker is structural: the only existing `ClassFeatureMechanics` family is `activation`, which requires `activationCost`, `resource`, and `resetCadence`. Use Magic Device is a passive, always-on trait with no activation cost, no use count, and no rest reset cadence.

Even if a `passive_trait` family were added, three additional atom widenings would be required for its sub-mechanics.

No `.dhall`, `.json`, or `.trace.md` files were produced.

---

## Sub-mechanic Analysis

### 1. Attunement (always-on passive cap increase)

> "You can attune to up to four magic items at once."

Increases the character's attunement slot cap from 3 → 4. No existing `ClassFeatureEffect` covers this. The v4 atom `attunement_slot` is a *consumed resource*, not a cap modifier.

**Proposed atom:** `modify_attunement_cap` — modifies the numeric upper bound on simultaneous attunements.

---

### 2. Charges (passive probabilistic refund rider)

> "Whenever you use a magic item property that expends charges, roll 1d6. On a roll of 6, you use the property without expending the charges."

A stochastic refund: on each charge expenditure, roll 1d6; on 6, the charge is not spent. The v4 taxonomy has `refund` as a procedure atom but no surface grammar for a probabilistic die-gated refund. This requires a "die-roll gate" concept absent from the current surface.

**Proposed atom:** `charge_refund_on_roll` (or a `refund` variant with a `die_gate` parameter specifying die size and target value).

---

### 3. Scrolls (passive scroll-usage grant with conditional ability check)

> "You can use any Spell Scroll, using Intelligence as your spellcasting ability for the spell. If the spell is a cantrip or a level 1 spell, you can cast it reliably. If the scroll contains a higher-level spell, you must first succeed on an Intelligence (Arcana) check (DC 10 plus the spell's level). On a successful check, you cast the spell from the scroll. On a failed check, the scroll disintegrates."

Three components:
- **Unlock:** use any Spell Scroll (normally class-restricted)
- **Custom spellcasting ability:** Intelligence instead of default
- **Conditional check gate for scroll level ≥ 2:** Int (Arcana), DC = 10 + spell level; failure destroys the item

v4 has `grant_spell_access` (class spell list expansion) and `ability_check` (resolution atom), but no surface shape for "use a physical item as a spell source with a custom ability, gated on a level-scaled check, with item destruction on failure."

**Proposed atom:** `grant_scroll_access` with parameters for casting ability, DC formula (base + scroll level), and failure consequence (item destroyed).

---

## Primary Widening: New `ClassFeatureMechanics` Family

### `passive_trait`

The most fundamental gap. The current `ClassFeatureMechanics` union is:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

`ClassFeatureActivationMechanics` mandates `activationCost`, `resource`, and `resetCadence` — none of which apply to Use Magic Device. A `passive_trait` family is needed to represent:

- Always-on benefits with no explicit activation (Attunement, Charges)
- Benefits that fire automatically on a condition without consuming a use count (Charges on any item property use)
- Benefits that expand access passively (Scrolls)

This widening is prerequisite to encoding this feature at all. It would also apply to other passive class features in the corpus (Expertise, Reliable Talent, Evasion, etc.).

---

## Confidence: High

The structural gap (missing passive family) is unambiguous. Each sub-mechanic maps to no existing `ClassFeatureEffect` variant, confirmed against the full `types.ts` type union.
