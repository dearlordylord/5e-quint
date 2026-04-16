# Proposal: Widening for Hat of Disguise

## Outcome

`structural_widening` — the `magic_item` kind does not exist in `UnitRecord`.

## Primary Gap: MagicItemRecord missing from UnitRecord

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The `kind: "magic_item"` value is not representable. No amount of mechanics-family creativity can work around this — the top-level discriminant is absent.

Required addition (sketch):

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | MagicItemRecord;
```

The tracer also needs a `traceMagicItemUnit` branch in its top-level `switch`.

## Secondary Gap: No mechanics family for spell-granting items

The Hat of Disguise grants the ability to cast *Disguise Self* at will while wearing the hat — no spell slot consumed, no material components required beyond the item itself.

None of the existing families cover this:

| Family | Why it doesn't fit |
|---|---|
| `ongoing_effect` | Ongoing operations (roll_modifier, damage_on_hit) — not spell access |
| `activation` | Instant one-shot — not "while worn you may cast" |
| `triggered_reaction` | Reaction-shaped — not proactive at-will casting |
| `anchored_trigger` | Planted trigger released by event — not this pattern |
| `class_feature activation` | Class-owned feature — not an item |
| `on_hit_trigger` | Weapon-hit rider — not this pattern |

A new family is needed — tentatively `spell_grant`:

```typescript
export type MagicItemSpellGrantMechanics = {
  readonly family: "spell_grant";
  readonly spellId: string;           // "disguise_self"
  readonly activationCost: { readonly kind: "action" };
  readonly usesSlot: false;           // item provides the "slot"
  readonly spellDuration: Duration;   // modified by item-conditioned expiry (see below)
};
```

The v4 atom `grant_spell_access` exists and maps well to this family's effect node.

## Tertiary Gap: Item-conditioned spell expiry

The SRD text states: *"The spell ends if the hat is removed."*

Disguise Self normally lasts 1 hour (`timed`, 1 hour). The hat adds an additional expiry condition: the spell also ends when the item is no longer worn. This is not representable by any current `Duration` variant:

- `instantaneous` — no
- `concentration` — no (Disguise Self is not concentration)
- `timed` — captures the 1-hour ceiling but not the item-removal condition

Options:
1. A new `Duration` variant: `{ kind: "while_worn"; fallback?: DurationValue }` — expiry is whichever comes first, item removal or the fallback timer.
2. A composable expiry modifier on an existing `timed` duration: `{ kind: "timed"; value: ...; endsIf?: ItemRemovedCondition }`.

Option 1 is cleaner for the closed-vocabulary approach used elsewhere.

## Quaternary Gap: Attunement on MagicItemRecord

The item requires attunement. The v4 atom `attune` and resource `attunement_slot` exist, but the surface type has no field to declare whether a magic item requires attunement and, if so, any class/alignment restrictions.

Minimum field:

```typescript
readonly requiresAttunement: boolean;
// Or richer: readonly attunement: { required: true; restriction?: string } | { required: false }
```

## What Already Exists in v4

The following atoms cover the Hat's mechanics once the structural gap is filled:

| Concern | v4 atom |
|---|---|
| Item identity | `magic_item_root` |
| Attunement process | `attune` |
| Attunement slot consumed | `attunement_slot` |
| Spell granted | `grant_spell_access` |
| Activation (cast the spell) | `activate` |
| Action quota consumed | `action_quota` |
| Item-conditioned expiry | not in v4 — new lifecycle variant needed |

The gap is purely on the **surface type / record layer** and the **Duration variant**. No new v4 atoms are required; only new TypeScript types and a new tracer branch.
