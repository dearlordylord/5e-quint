# Proposal: Slow (structural_widening)

## Unit

- **Name:** Slow
- **Slug:** `slow`
- **Kind:** spell (level 3, Transmutation, Concentration 1 minute)
- **Provenance:** SRD 5.2.1

## Why Slow cannot be encoded honestly

Slow follows the **conditional persistent debuff** pattern:

1. Cast over an area (40-ft Cube, up to 6 targets)
2. Each target makes an initial Wisdom saving throw
3. On failure: target enters a persistent debuffed state lasting the concentration duration
4. On each of the target's turns: repeat Wisdom save; success ends the effect on *that target* individually

None of the four existing spell families can represent this:

| Family | What it models | Why it fails for Slow |
|---|---|---|
| `activation` | One-shot phases (attack roll or save gate) with `Effect = damage \| none` | Effects are not persistent; `Effect` excludes all debuff atoms |
| `ongoing_effect` | Persistent single operation (roll_modifier or damage_on_hit) on attachment | No initial save gate; single operation, not a multi-effect bundle |
| `triggered_reaction` | Reaction-window spell | Wrong casting time and shape entirely |
| `anchored_trigger` | Plant-and-release spell | Wrong shape entirely |

## Required widenings

### 1. New subgraph / family variant — `save_gated_persistent_debuff`

A new payload family (or a combined family variant) is needed for spells that:

- Apply a **save gate** at cast time (area attachment, one save per creature)
- Attach a **bundle of ongoing debuff effects** to each creature that fails, persisting for the concentration/timed duration
- Support a **per-creature repeat save** end condition (creature saves at end of its turn → effect ends for that creature only)

Proposed shape sketch:

```
save_gated_persistent_debuff:
  attachment: area | target
  ability: Ability          -- initial save ability
  dc: DcSource
  effects: ReadonlyArray<DebuffEffect>   -- the debuff bundle applied on fail
  repeatSave:
    timing: "end_of_turn"   -- when the creature re-saves
    ability: Ability
```

This pattern is shared by a large class of SRD spells: Hold Person, Hold Monster, Hypnotic Pattern, Fear, Stinking Cloud, Web, Entangle, etc. All require the same widening.

### 2. Surface widening — `Effect` must include debuff effects

Currently `Effect = DamageEffect | NoneEffect`. Slow applies:

- `modify_speed` (halved) — v4 atom exists
- `modify_ac` (-2) — v4 atom exists (currently only exposed as `ReactionEffect`)
- `modify_roll_numeric` (-2 on Dex saving throws) — v4 atom exists
- `restrict_action_set` (can't take Reactions) — v4 atom exists

All four atoms are in the v4 taxonomy. The blocker is that `Effect` doesn't admit them. Widening `Effect` (or introducing a `DebuffEffect` union) to include these is required.

### 3. Surface widening — `ActionRestriction` needs a new variant

Slow additionally restricts affected creatures to take **either an action or a bonus action** per turn (not both). The existing `ActionRestriction.exclude` can block specific `StandardActionKind` members but cannot model the "choose at most one of {action resource, bonus_action resource}" pattern.

Proposed variant:

```typescript
| { readonly kind: "one_of_action_or_bonus_action" }
```

Note: a separate constraint (one attack only if taking the Attack action) could fold into `restrict_action_set` with an `attack_count` limiter, or may need its own variant.

### 4. New atom — `somatic_failure_chance`

Slow imposes a 25% chance that any spell with a Somatic component cast by an affected creature fails. This is probabilistic spell interference injected into another creature's cast procedure. No v4 atom covers it:

- It is not `restrict_action_set` (doesn't block the cast, just introduces failure probability)
- It is not `modify_roll_numeric` (no roll is made)
- It is not any existing effect atom

This is the only strictly new atom needed. It is also the most niche mechanic in Slow — the core debuff pattern above is far more important to unblock.

## Classification summary

| Gap | Classification |
|---|---|
| No family for save gate → persistent multi-effect debuff → per-creature repeat save | `structural_widening` |
| `Effect` excludes debuff atoms that exist in v4 | `surface_widening` |
| `ActionRestriction` can't model "one of action/bonus_action" | `surface_widening` |
| Probabilistic somatic spell failure has no v4 atom | `atom_widening` |

**Dominant verdict: `structural_widening`** — the family shape itself is missing.

## Unblocking priority

The `save_gated_persistent_debuff` family + expanding `Effect` to include debuff atoms would unblock Slow, Hold Person, Hold Monster, Hypnotic Pattern, Fear, and many other high-priority SRD spells simultaneously. This is the highest-value widening in the debuff category.
