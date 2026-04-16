# Proposal: Boon of Fate — Widening Required

**Outcome:** `structural_widening`  
**Unit:** `feat_boon_of_fate` (Epic Boon Feat, SRD 5.2.1)

---

## Why the unit cannot be honestly encoded

`UnitRecord` is `SpellRecord | ClassFeatureRecord | MasteryRecord`. There is no `FeatRecord`. The tracer's `traceUnit` switch is exhaustive on `spell | class_feature | mastery` — a feat would throw `unhandled unit kind`. No Dhall or JSON was produced; there is nothing to force into the existing shapes without lying.

---

## Required widenings (in priority order)

### 1. `FeatRecord` — structural (primary blocker)

Add `FeatRecord` to `UnitRecord` and define a corresponding mechanics family. Feats come in several shapes:
- **Passive** (Alert: always-on initiative bonus) — no activation cost, no resource.
- **Activated** (Boon of Fate: use once, trigger-reactive) — activation cost, use-count resource, reset cadence.
- **Gating / conditional** (Grappler: unlocks grapple options) — passive but context-gated.

A minimal first expansion would reuse `ClassFeatureMechanicsHeader` for the `activation` family (the Improve Fate mechanic maps cleanly to `use_count` + `resetCadence`), but feats also need `feat_root` as their source atom (already in v4 taxonomy — just not wired to a surface record type).

### 2. `RestResetCadence` — surface widening

New variant needed:

```typescript
| { readonly kind: "initiative_or_short_or_long_rest" }
```

The SRD text is: *"you can't use it again until you roll Initiative or finish a Short or Long Rest."* Rolling initiative is a distinct trigger from a rest. The existing `partial_short_full_long` pattern refills partially on short rest; this variant is a different shape (initiative acts as an additional reset trigger, not a partial-refill trigger).

### 3. D20 Test trigger — surface widening

New variant needed in a trigger grammar (whether `ReactionTrigger` is extended or a new `FeatTrigger` type is introduced):

```typescript
| { readonly kind: "any_d20_test"; readonly scope: "self_or_ally_within_range"; readonly rangeFeet: number }
```

The trigger covers attack rolls, saving throws, and ability checks (all D20 Tests). The existing `ReactionTrigger` is scoped to spell-cast reactions (hit by attack, targeted by named spell). A feat activation triggered by any D20 Test outcome is a broader, separately-named event class.

### 4. Runtime sign choice on `DiceDelta` — surface widening

Current shape: `{ dice: number; dieSize: number; sign: "+" | "-" }` — sign is authored.

The feat text: *"apply the total rolled as a bonus or penalty to the d20 roll"* — the sign is chosen at activation time by the user. A new variant is needed:

```typescript
| { readonly dice: number; readonly dieSize: number; readonly sign: "chosen_at_activation" }
```

Or, alternatively, model this as a `modify_roll_numeric` effect that is explicitly bidirectional (the tracer emits it with a note that the sign is user-selected). This is the narrowest honest representation.

---

## What fits without widening

The **resource shape** is close to existing atoms:
- `use_count` with `cap: { kind: "fixed", uses: 1 }` already exists.
- The 2d4 roll amount would fit `DiceAmount { kind: "fixed", expr: { dice: 2, dieSize: 4 } }` if a new modify-roll effect took `DiceAmount` (not the current `DiceDelta`).

The **attachment** would be `{ kind: "target", selection: { mode: "one" } }` or a new `self_or_ally_within_range` variant.

The **Ability Score Increase** benefit is out of scope for the core mechanics graph per `ARCHITECTURE.md` — it is character-progression metadata, not a deterministic runtime mechanic.

---

## Recommended widening order

1. Add `FeatRecord` + `feat_root` tracer support (unlocks the entire feat catalog).
2. Add `initiative_or_short_or_long_rest` cadence (also needed for Halfling Luck and similar).
3. Add D20 Test trigger (broad applicability across reaction feats).
4. Add runtime sign choice on dice modifier (narrow — Boon of Fate is the first case).
