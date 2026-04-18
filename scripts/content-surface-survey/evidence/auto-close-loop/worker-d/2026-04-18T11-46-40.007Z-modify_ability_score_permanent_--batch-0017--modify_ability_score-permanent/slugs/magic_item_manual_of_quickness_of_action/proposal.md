# Proposal: Manual of Quickness of Action

**Outcome**: `structural_widening`

## Why it doesn't fit

### 1. No `magic_item` kind in `UnitRecord` (primary blocker)

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The atom taxonomy (`TAXONOMY_atoms_graph.md`) lists `magic_item_root` as a source atom and the survey pipeline tracks magic items as a unit kind, but the surface type system has not been widened to include them. No magic item can be encoded until this is resolved.

### 2. No `modify_ability_score` effect for permanent stat increases (secondary blocker)

The entire mechanic of this item is:

> "your Dexterity increases by 2, to a maximum of 30"

This is a **permanent ability score increase** — not a timed buff, not a condition, not a roll modifier. The taxonomy explicitly defers `modify_ability_score` as a runtime effect:

> *"`modify_ability_score` as a runtime effect versus as pre-runtime character state (currently treated as out-of-scope)"* — TAXONOMY §12

No existing effect atom (`heal`, `damage`, `modify_ac`, `modify_roll_numeric`, etc.) honestly models a permanent stat change.

### 3. No century-recharge resource lifecycle (tertiary gap)

> "The manual then loses its magic but regains it in a century."

This is a single-use consumable with a 100-year recharge. The existing `RestResetCadence` variants are:

- `short_or_long_rest`
- `short_rest`
- `long_rest`
- `partial_short_full_long`

None of these covers a real-time duration recharge. This is a distinct cadence shared by the entire Manual/Tome family of ability-score-boosting items.

## Proposed widenings (in priority order)

### W1 — `MagicItemRecord` + `magic_item` in `UnitRecord` (structural)

Add a new top-level record type:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | MagicItemRecord;
```

The `MagicItemMechanics` union will need at minimum one family to cover this item class. The taxonomy already lists `attune` and `charge` as resource atoms, suggesting some magic item infrastructure was anticipated.

### W2 — `modify_ability_score` effect atom (atom widening)

Add to the effect inventory:

```typescript
export type ModifyAbilityScoreEffect = {
  readonly kind: "modify_ability_score";
  readonly ability: Ability;
  readonly delta: number;          // +2 for this item
  readonly maximum: number;        // 30 for this item
  readonly permanent: true;        // this is a permanent character progression change
};
```

This would unblock the entire Manual/Tome family and several class features (Primal Champion, ability score improvements from items).

### W3 — `elapsed_time` reset cadence variant (surface widening)

Add to `RestResetCadence`:

```typescript
| {
    readonly kind: "elapsed_time";
    readonly unit: "year" | "decade" | "century";
    readonly amount: number;
  }
```

This covers: Manual/Tome family (century), Deck of Many Things (single-use, no recharge), and similar items.

## Suggested magic item mechanics family for this item class

```typescript
export type AbilityScoreBoostMechanics = {
  readonly family: "ability_score_boost";
  readonly studyRequirement: {
    readonly hours: number;           // 48
    readonly overDays: number;        // 6
  };
  readonly effect: ModifyAbilityScoreEffect;
  readonly recharge: RestResetCadence; // elapsed_time: 1 century
};
```

This family would cover: Manual of Bodily Health (+2 Con), Manual of Gainful Exercise (+2 Str), Manual of Quickness of Action (+2 Dex), Tome of Clear Thought (+2 Int), Tome of Leadership and Influence (+2 Cha), Tome of Understanding (+2 Wis).
