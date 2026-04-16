# Proposal: Dust of Sneezing and Choking

**Outcome:** `structural_widening`

## Primary Gap: No `magic_item` kind in `UnitRecord`

`types.ts` defines:
```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

The v4 taxonomy includes `magic_item_root` as a source atom (§1), and the survey pipeline tracks `magic_item` as a unit kind, but the surface schema has no `MagicItemRecord`. No Dhall or JSON can be authored — there is nothing honest to typecheck against.

This is the hard blocker. Everything below is downstream.

---

## Secondary Gaps (all require widening even after MagicItemRecord is added)

### 1. `AreaOrigin`: missing `self_emanation`

The dust creates a **30-foot Emanation originating from the user**. Current `AreaOrigin`:
```typescript
| { readonly kind: "point_within_range" }
| { readonly kind: "on_primary_target" }
```
Neither fits. A new variant is needed:
```typescript
| { readonly kind: "self_emanation" }
```
This is a common magic item pattern (many AoE wondrous items, potions, and consumables burst from the user).

### 2. `Condition`: only `"prone"` defined

The item applies **Incapacitated**. The `Condition` type is:
```typescript
export type Condition = "prone";
```
At minimum `"incapacitated"` must be added. The full SRD condition set (blinded, charmed, deafened, exhaustion, frightened, grappled, incapacitated, invisible, paralyzed, petrified, poisoned, prone, restrained, stunned, unconscious) should be added in bulk to avoid piecemeal widening on every future unit.

### 3. Suffocating: not a named condition

Suffocating is a SRD rules state (creature cannot breathe, starts making death saves against suffocation) distinct from the standard condition list. It needs either:
- A new `Condition` variant `"suffocating"` (if modeled as a condition-like state), or
- A dedicated `ApplyStatusEffect` atom or surface variant.

### 4. Creature-type exemption on save gates

> *Constructs, Elementals, Oozes, Plants, and Undead succeed on the save automatically.*

The save gate has no surface type for creature-type-based auto-succeed filters. This pattern recurs across many magic items and some spells (e.g. Sleep, Color Spray). A proposed shape:

```typescript
export type SaveGateCreatureFilter = {
  readonly kind: "creature_type_auto_succeed";
  readonly types: ReadonlyArray<CreatureType>;
};
```

where `CreatureType` would be a new closed enum of SRD creature types.

### 5. Per-turn repeat save (ongoing condition removal)

> *The creature repeats the save at the end of each of its turns, ending the effect on itself on a success.*

The v4 taxonomy has a `repeat_save` atom but there is no surface shape for it. This is the standard SRD "save ends" mechanic and is pervasive across conditions, spells, and magic items. A proposed surface shape for the ongoing effect:

```typescript
export type RepeatSave = {
  readonly kind: "repeat_save";
  readonly timing: "end_of_turn";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly onSuccess: "end_effect";
};
```

### 6. Named-spell cure trigger

> *The effect also ends on any creature targeted by a Lesser Restoration spell.*

No surface type for "named spell clears this effect". This is a distinct cure pathway alongside the repeat save. A minimal shape:

```typescript
export type SpellCure = {
  readonly kind: "named_spell_cure";
  readonly spellId: string;
};
```

---

## Summary Table

| Gap | Classification | Blocking? |
|---|---|---|
| No `MagicItemRecord` kind | `structural_widening` | **Yes** |
| `AreaOrigin: self_emanation` | `surface_widening` | After structural fix |
| `Condition: "incapacitated"` | `surface_widening` | After structural fix |
| Suffocating status | `surface_widening` | After structural fix |
| Creature-type save exemption | `surface_widening` | After structural fix |
| Per-turn repeat save | `surface_widening` | After structural fix |
| Named-spell cure trigger | `surface_widening` | After structural fix |

All secondary gaps are `surface_widening` (new variants of existing shapes or new fields on new record types) — no new v4 atoms are required. The `repeat_save` v4 atom already exists; it just needs a surface encoding.
