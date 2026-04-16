# Proposal: Surface Widening — Abjure Foes (paladin L9)

**Unit:** Paladin Level 9: Abjure Foes  
**Source:** SRD 5.2.1, Classes/Paladin#Level 9: Abjure Foes  
**Outcome:** `surface_widening`

All required v4 atoms exist. The unit cannot be encoded because five surface type variants are missing. No new atoms are proposed.

---

## Gap 1 — `ClassFeatureActivationCost`: missing `action` / `magic_action` variant

**Current:** `{ kind: "free" } | { kind: "bonus_action" }`  
**Required:** `{ kind: "action" }` or, more precisely, `{ kind: "magic_action" }`  
**Evidence:** "As a Magic action, you can expend one use of this class's Channel Divinity…"

SRD 5.2.1 names the Magic action as a distinct action kind (separate from Attack, Dash, etc.). The surface should distinguish it from a generic action both to correctly model the resource consumed and to stay honest with the SRD action taxonomy. Minimal fix: add `{ kind: "action" }` and note that "magic_action" is a specific instance of it; fuller fix: add `{ kind: "magic_action" }` directly as a literal variant.

---

## Gap 2 — `ClassFeatureEffect`: missing save-gated condition application

**Current:** `GrantExtraActionEffect | HealHpEffect`  
**Required:** A variant representing: Wisdom save (DC = caster spell save DC) → on fail: apply condition with duration + expiry → on success: none

**Evidence:** "Each target must succeed on a Wisdom saving throw or have the Frightened condition for 1 minute or until it takes any damage."

The v4 `save_gate` resolution atom and `apply_condition` effect atom both exist. The gap is that `ClassFeatureEffect` has no surface type that composes them. Proposed minimal shape:

```typescript
export type SaveGateConditionEffect = {
  readonly kind: "save_gate_condition";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly onFail: {
    readonly condition: Condition;
    readonly duration: Duration;
    readonly endOn?: ConditionExpiry;   // see Gap 5
  };
  readonly onSuccess: { readonly kind: "none" };
};
```

This follows the same `save_gate` pattern already used in `MasteryEffect` (mastery), extended to the class-feature domain.

---

## Gap 3 — `Condition`: missing `"frightened"`

**Current:** `export type Condition = "prone"`  
**Required:** Extend to include `"frightened"` (and other standard SRD conditions as they appear in future units)  
**Evidence:** "…or have the Frightened condition…"

`Condition` is intentionally narrow ("widen on demand"). Abjure Foes is the first class-feature unit requiring Frightened. The fix is a one-line addition: `export type Condition = "prone" | "frightened"`.

---

## Gap 4 — `TargetSelection`: missing ability-modifier-derived count

**Current:** `{ mode: "one" } | { mode: "choose_up_to", count: SlotScaling<number> }`  
**Required:** A count expression that evaluates to the caster's ability modifier (with a minimum floor)

**Evidence:** "…you can target a number of creatures equal to your Charisma modifier (minimum of one creature)…"

`SlotScaling<number>` is slot-axis only. Ability-modifier-derived counts appear in multiple paladin and cleric features. Proposed extension to `TargetSelection`:

```typescript
| {
    readonly mode: "choose_up_to";
    readonly count:
      | SlotScaling<number>
      | {
          readonly kind: "ability_modifier";
          readonly ability: Ability;
          readonly minimum: number;
        };
  }
```

---

## Gap 5 — Condition expiry: missing `until_takes_damage`

**Current expiry vocabulary:** `RiderExpiry` has `target_uses_or_turn_start` and `end_of_next_turn`; `Duration` supports timed values in rounds/minutes/hours/days; neither covers "expires when target takes damage."

**Required:** An expiry variant that fires on any damage taken.  
**Evidence:** "…for 1 minute or until it takes any damage."

This pattern ("until damage is taken") appears in multiple SRD conditions and spells (Fear, Hold Person, etc.). Proposed new type used by the `SaveGateConditionEffect.onFail.endOn` field:

```typescript
export type ConditionExpiry =
  | { readonly kind: "until_takes_damage" }
  | { readonly kind: "end_of_next_turn" }
  | { readonly kind: "target_uses_or_turn_start" };
```

---

## Secondary Observation: Behavioral Restriction While Frightened

The text specifies: "While Frightened in this way, a target can do only one of the following on its turns: move, take an action, or take a Bonus Action."

This is **not** part of the standard SRD 5.2.1 Frightened condition (which only imposes disadvantage on ability checks and attack rolls while the source is visible, and prevents voluntary movement toward the source). This is a feature-specific behavioral modifier layered on top.

Modeling it faithfully would require a `restrict_action_set` effect (which exists in v4 §9) attached to the condition while active. This is a tertiary gap that does not change the primary `surface_widening` classification — it would need to be addressed alongside Gap 2 when the `SaveGateConditionEffect` shape is designed.

---

## Secondary Observation: Channel Divinity as Shared Pool

"…expend one use of this class's Channel Divinity…" — Channel Divinity is a shared pool across multiple paladin features (Sacred Weapon, Abjure Foes, subclass Channel Divinity options). The current surface models `use_count` as a per-feature resource. The shared-pool representation problem is deferred per prior survey notes.

---

## Summary

| Gap | Surface type | Classification |
|-----|-------------|----------------|
| Magic action cost | `ClassFeatureActivationCost` | surface_widening |
| Save → condition effect | `ClassFeatureEffect` | surface_widening |
| Frightened condition | `Condition` | surface_widening |
| Ability-mod target count | `TargetSelection` | surface_widening |
| Until-takes-damage expiry | (new `ConditionExpiry`) | surface_widening |

No new v4 atoms required. All five gaps are missing variants of existing surface shapes.
