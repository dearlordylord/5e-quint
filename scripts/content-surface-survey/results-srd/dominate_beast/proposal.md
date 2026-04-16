# Proposal: Surface Widenings for Dominate Beast

**Unit:** Dominate Beast (SRD 5.2.1, Level 4 Enchantment)
**Outcome:** `surface_widening`

All required v4 atoms exist. The spell cannot be encoded honestly because the surface types are too narrow in six places. No structural change to the type hierarchy is needed — all gaps are new variants within existing type positions.

---

## 1. `Condition` — add `"charmed"`

**Current:** `type Condition = "prone"`

**Needed:** `type Condition = "prone" | "charmed" | …`

The Dominate Beast primary effect is the Charmed condition. The entire Dominate* family (Dominate Beast, Dominate Person, Dominate Monster) plus Charm Monster/Charm Person share this. Widening `Condition` to include `"charmed"` unblocks all of them.

**Evidence:** "must succeed on a Wisdom saving throw or have the Charmed condition for the duration."

---

## 2. `Effect` — add `ApplyConditionEffect`

**Current:** `type Effect = DamageEffect | NoneEffect`

**Needed:** add `{ readonly kind: "apply_condition"; readonly condition: Condition }`

The `activation` family's `save_gate` phase needs `onFail` to produce a condition effect. The v4 atom `apply_condition` exists; the surface `Effect` type just needs a matching variant. This also unblocks any future spell/mastery/feature that applies conditions through activation phases.

**Evidence:** "must succeed on a Wisdom saving throw or have the Charmed condition"

---

## 3. `Duration` — add slot-scaled concentration

**Current:** `{ kind: "concentration"; upTo: DurationValue }` — single fixed ceiling

**Needed:** a variant where the concentration ceiling is a threshold-tier schedule by spell slot level

Proposed shape:
```typescript
| {
    readonly kind: "concentration";
    readonly upTo: DurationValue | ThresholdTiers<DurationValue>;
  }
```

Or a new Duration variant:
```typescript
| {
    readonly kind: "concentration_slot_scaled";
    readonly base: DurationValue;
    readonly tiers: ReadonlyArray<{
      readonly atSlotLevel: number;
      readonly upTo: DurationValue;
    }>;
  }
```

Dominate Beast at L4 = 1 minute; L5 = 10 minutes; L6 = 1 hour; L7+ = 8 hours. Dominate Person and Dominate Monster use the same pattern. This is a recurring shape in the enchantment school.

**Evidence:** "Your Concentration can last longer with a spell slot of level 5 (up to 10 minutes), 6 (up to 1 hour), or 7+ (up to 8 hours)."

---

## 4. `OngoingOperation` — add `repeat_save` (damage-triggered)

**Current:** `type OngoingOperation = RollModifierOperation | DamageOnHitOperation`

**Needed:** add a variant for "repeat save when triggering event occurs"

Proposed shape:
```typescript
export type RepeatSaveOperation = {
  readonly kind: "repeat_save";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly trigger: { readonly kind: "on_damage_taken" };
  readonly onSuccess: "end_spell";
  readonly onFail: "continue";
};
```

The v4 atom `repeat_save` covers this. The trigger (`on_damage_taken`) maps to the damage event window. "End spell on success" is a deterministic outcome.

**Evidence:** "Whenever the target takes damage, it repeats the save, ending the spell on itself on a success."

---

## 5. `ActivationPhase` save_gate — add conditional advantage field

**Current:** `save_gate` has no mechanism to express advantage conditions on the save itself

**Needed:** an optional field expressing "target gains Advantage if [condition]"

Proposed:
```typescript
// On the save_gate phase:
readonly targetAdvantage?: {
  readonly condition: "combat_engaged_with_caster";
};
```

This is narrow enough that a closed enum of `save_advantage_condition` variants would work. Other spells (Animal Friendship uses the same pattern) reinforce this.

**Evidence:** "The target has Advantage on the save if you or your allies are fighting it."

---

## 6. `OngoingOperation` — add `telepathic_command_link`

**Current:** `OngoingOperation = RollModifierOperation | DamageOnHitOperation`

**Needed:** a variant for the caster's turn-based free-action command ability

The v4 atoms `telepathic_link` and `command_companion` exist. A new surface operation captures the mechanical scaffold: link is active while both caster and target are on the same plane, and the caster may issue commands without any action cost each turn.

**Note on DM agenda boundary:** The *execution* of commands ("target does its best to obey") is DM-adjudicated and does not belong in core mechanics. The mechanical fact *that* commands can be issued (no action, once per turn, while Charmed) is deterministic and belongs in the surface.

Proposed shape:
```typescript
export type TelépathicCommandOperation = {
  readonly kind: "telepathic_command";
  readonly actionCost: { readonly kind: "free" };
  readonly constraint: "same_plane_of_existence";
};
```

**Evidence:** "You have a telepathic link with the Charmed target while the two of you are on the same plane of existence. On your turn, you can use this link to issue commands to the target (no action required)"

---

## Secondary mechanic noted but not blocking

**Reaction exchange:** "You can command the target to take a Reaction but must take your own Reaction to do so." This adds a cost-gated command variant. Omissible in a first encoding pass (or encodable as a flag on the command operation).

---

## Summary

| Gap | Category | v4 atom | Surface change |
|-----|----------|---------|----------------|
| `"charmed"` missing from `Condition` | surface_widening | `apply_condition` | widen `Condition` union |
| `apply_condition` missing from `Effect` | surface_widening | `apply_condition` | widen `Effect` union |
| Slot-scaled concentration duration | surface_widening | `concentrate` + `expire` | new Duration variant |
| Repeat save on damage trigger | surface_widening | `repeat_save` | new `OngoingOperation` variant |
| Conditional advantage on save | surface_widening | (existing save_gate) | new optional field on `save_gate` phase |
| Telepathic command link | surface_widening | `telepathic_link` | new `OngoingOperation` variant |

No new v4 atoms required. All six gaps are surface type widenings.
