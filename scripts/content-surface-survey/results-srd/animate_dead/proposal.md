# Proposal: Animate Dead — structural_widening

## Summary

Animate Dead cannot be honestly encoded in the current content surface. The spell's core mechanic — creating undead companions under the caster's control with a 24-hour renewable control window and a Bonus Action command interface — does not fit any of the four existing `SpellMechanics` families. A new family (`companion_creation`) is required.

## Why Each Existing Family Fails

| Family | Why it fails |
|---|---|
| `ongoing_effect` | Requires a concentration or timed duration on the spell itself. Animate Dead's Duration is **Instantaneous**. The creatures are not attached to the caster's concentration — they exist independently in the world after the cast. |
| `activation` | Phases must resolve as `attack_roll` or `save_gate`. The `Effect` union (`DamageEffect \| NoneEffect`) has no companion-creation variant. An `activation` with a `create_companion` effect would require widening both the family shape and the `Effect` union. |
| `triggered_reaction` | Animate Dead is not a reaction spell. |
| `anchored_trigger` | The anchored_trigger family plants a conditional release tied to an environmental event. Animate Dead plants no such trigger. |

## What the Missing Family Needs

A `companion_creation` spell family would need to express:

### 1. Companion count (fixed or slot-scaled)
```typescript
type CompanionCount =
  | { readonly kind: "fixed"; readonly n: number }
  | { readonly kind: "slot_scaled"; readonly base: number; readonly perSlotAboveBase: number; readonly baseLevel: number };
```
Animate Dead: base 1, +2 per slot above 3.

### 2. Companion kind
The spell creates Undead (Skeleton from bones, Zombie from corpse). A closed enum of summoning categories is needed (`undead`, `beast`, `elemental`, `fey`, etc.) to categorize the companion_creation family for the taxonomy. The specific creature selected is constrained by material input (bones → Skeleton, corpse → Zombie) — a new `companionKind` variant that maps material/choice to creature type.

### 3. Control interface
```typescript
type CompanionControlInterface = {
  readonly kind: "mental_command";
  readonly activationCost: { readonly kind: "bonus_action" };
  readonly rangeInFeet: number;          // 60
  readonly multiTargetSameOrder: boolean; // "issuing the same command to each one"
};
```
The Bonus Action command interface is a recurrent within-turn action, distinct from anything the existing surface models.

### 4. Control duration and expiry
The control relationship lasts 24 hours. This is not a spell duration (the spell is Instantaneous) and not concentration. A new surface concept is needed:
```typescript
type ControlLink = {
  readonly duration: DurationValue;         // { unit: "hour", amount: 24 }
  readonly expiry: "stops_obeying_commands";
};
```

### 5. Recast-to-maintain behavior
Recasting on an existing creature reasserts control (does not animate a new creature), and covers up to 4 existing controlled creatures per cast. This is a novel recast semantic:
```typescript
type RecastBehavior =
  | { readonly kind: "animate_new" }
  | { readonly kind: "reassert_control"; readonly maxControlled: number };
```
No existing family has recast semantics.

## Sketch of the New Family

```typescript
export type CompanionCreationMechanics = SpellMechanicsHeader & {
  readonly family: "companion_creation";
  readonly companionKind: "undead" | "beast" | "elemental" | "fey" | "celestial" | "fiend";
  readonly count: CompanionCount;
  readonly control: CompanionControlInterface;
  readonly controlLink: ControlLink;
  readonly recastBehavior: RecastBehavior;
};
```

## v4 Atom Coverage

The v4 taxonomy already has the relevant atoms:
- `create_companion` (effect) — creating the Skeleton/Zombie
- `command_companion` (effect) — the Bonus Action control action
- `persist` (lifecycle) — the 24-hour control window

The gap is entirely at the **surface level**: no `SpellMechanics` family can route to these atoms, and the `Effect` union does not include `create_companion`.

## Scope of Impact

This family would also cover (all currently un-encodable):
- **Create Undead** (same pattern, higher level, more powerful undead)
- **Find Familiar** (permanent, no 24h window, but same companion_creation shape)
- **Find Steed** (permanent mount companion)
- **Conjure Animals / Elemental / Fey** (different creature kinds, concentration-based — a variant)
- **Summon Beast / Aberration / Celestial / etc.** (xphb summoning spells)

The `companion_creation` family is the largest unrepresented structural category in the spell corpus.

## Classification

`structural_widening` — no existing family shape; requires a new `SpellMechanics` discriminant and associated surface types. Secondary widenings: `CompanionEffect` in the `Effect` union, `control_link` duration concept, slot-scaled companion count on a spell family field.
