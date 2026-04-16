# Proposal: Ioun Stone — Widening Requirements

**Outcome:** `structural_widening`  
**Unit slug:** `magic_item_ioun_stone`  
**Provenance:** SRD 5.2.1, Magic-Items/Items-I-P.md §Ioun Stone

---

## Primary Blocker: No `magic_item` kind in `UnitRecord`

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The tracer's `traceUnit` has an exhaustive switch on `unit.kind` covering only `"spell"`, `"class_feature"`, `"mastery"`. A JSON with `kind: "magic_item"` would throw:

```
unhandled unit kind: magic_item
```

No encoding is possible without adding `MagicItemRecord` and a corresponding tracer branch. This is the minimum structural widening required before any Ioun Stone variant can be attempted.

---

## Required Structural Addition

### `MagicItemRecord`

New top-level record kind. Minimum shape:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly rarity: MagicItemRarity;
  readonly mechanics: MagicItemMechanics;
};
```

`MagicItemMechanics` needs at least one family. The Ioun Stone collection spans several mechanically distinct families:

| Stone variant | Mechanics family needed |
|---|---|
| Agility, Fortitude, Insight, Intellect, Leadership, Strength | `passive_stat_boost` (ability score +2) |
| Awareness | `passive_roll_modifier` (Advantage on initiative + ability check) |
| Protection | `passive_ac_bonus` |
| Mastery | `passive_pb_bonus` |
| Regeneration | `periodic_heal` (hourly cadence) |
| Absorption / Greater Absorption | `reaction_spell_cancel` (level-ceiling cancel, level-sum charge) |
| Reserve | `spell_storage` (multi-party store + cast relay) |
| Sustenance | outside core (biological need — no deterministic mechanical resolution) |

---

## Secondary Widenings (per variant)

### 1. `modify_ability_score` effect atom

Six variants grant `+2 to [Ability], max 20`. The v4 taxonomy explicitly records `modify_ability_score` as an out-of-scope residue candidate:

> *`modify_ability_score` as a runtime effect versus as pre-runtime character state (currently treated as out-of-scope)*

This is the first magic-item pressure to promote it. The "max 20" cap makes it a bounded runtime effect, not pure character-creation state. Promotion requires a decision on whether to model it as a character-progression fact or a runtime projection.

### 2. `negate_spell_by_level` — new `ReactionEffect` variant

Absorption cancels spells by level ceiling, not by spell identity. Existing `negate_named_effect` requires a `spellId`. A new variant is needed:

```typescript
| { readonly kind: "negate_spell_by_level"; readonly maxLevel: number; readonly scope: "all_effects" }
```

### 3. Level-sum charge counter

Absorption tracks *cumulative levels absorbed* (not discrete uses) against a cap of 20. The existing `charge` resource atom is a per-use counter. A level-sum counter needs:

```typescript
export type LevelSumResource = {
  readonly kind: "level_sum";
  readonly maxTotal: number;
  readonly burnsOutOnExhaustion: boolean;
};
```

This is structurally different from `use_count` or `charge` — the increment per activation is variable (the level of the canceled spell).

### 4. Hourly heal cadence

Regeneration grants 15 HP at end of each hour. No existing window atom covers real-time hourly cadence. `rest_window` covers short/long rests; `turn_end_window` covers combat turns. A new window:

```typescript
| { readonly atomKind: "duration_window"; readonly cadence: "hourly" }
```

Or a new `periodic_window` atom with a configurable duration unit.

### 5. `modify_proficiency_bonus` effect atom

Mastery grants +1 PB. No v4 atom covers PB modification as a worn-item passive. The PB is used in attack rolls, saving throws, skill checks, spell save DC — a PB bonus is mechanically broad and needs its own atom to compose correctly with those downstream effects.

### 6. `RollKind: "ability_check" | "initiative"` — surface widening

Awareness grants Advantage on Initiative rolls and Wisdom (Perception) checks. `RollKind` is:

```typescript
export type RollKind = "attack_roll" | "saving_throw";
```

Two new variants are needed. `ability_check` could carry a skill/ability qualifier; `initiative` is a special case of a DEX check. Whether they are the same variant or separate is a design decision.

### 7. Reserve — `spell_storage` family

Reserve accepts spells cast into it by any creature and lets the owner cast them using the original caster's stats. This is a multi-party relay with:

- `store` procedure (cast spell into stone — no effect at cast time)
- `stored_spell` attachment atom (holds the spell payload)
- `release` procedure (owner casts from stone)
- Preservation of original caster's DC, attack bonus, spellcasting ability

This maps roughly to the `anchored_trigger` shape but with an active relay rather than a passive trigger. The `stored_spell` attachment atom exists in v4 inventory but a `spell_storage` family for magic items has no surface type.

### 8. Sustenance — outside core

"You don't need to eat or drink" is a biological-need suppression effect. Per ARCHITECTURE.md, biological needs are caller-owned simulation facts with no deterministic mechanical resolution in combat core. This variant is `dm_agenda` if encoded alone.

---

## Encoding Order Recommendation

If the surface is widened for magic items, encode in this order:

1. Add `MagicItemRecord` + tracer branch (structural prerequisite)
2. **Protection** (Rare) — `modify_ac` already exists in `ReactionEffect`; needs passive worn-item form only
3. **Awareness** (Rare) — adds `RollKind` widening, `modify_roll_advantage` already exists
4. **Mastery** (Legendary) — adds `modify_proficiency_bonus`
5. **Ability score variants** (Very Rare × 6) — adds `modify_ability_score`; awaits out-of-scope decision
6. **Regeneration** (Legendary) — adds hourly `periodic_window`
7. **Absorption / Greater Absorption** — adds `negate_spell_by_level` + level-sum charge
8. **Reserve** — requires `spell_storage` family design
9. **Sustenance** — classify `dm_agenda` per ARCHITECTURE.md
