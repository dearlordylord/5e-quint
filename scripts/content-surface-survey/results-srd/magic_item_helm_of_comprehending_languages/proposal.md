# Proposal: structural_widening for `magic_item_helm_of_comprehending_languages`

## Unit

- **Name:** Helm of Comprehending Languages
- **Kind:** magic_item
- **Rarity:** Uncommon Wondrous Item
- **Attunement:** None
- **Rule text:** "While wearing this helm, you can cast *Comprehend Languages* from it."

## Why encoding fails

`UnitRecord` in `types.ts` is:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `magic_item` kind. The tracer's `traceUnit` switch covers only `"spell"`, `"class_feature"`, and `"mastery"`. Attempting to pass a `kind: "magic_item"` JSON would cause the tracer to throw:

```
Error: unhandled unit kind: magic_item
```

No honest encoding is possible without first adding the record type.

## Gap 1 — MagicItemRecord (structural)

A `MagicItemRecord` type must be added to `UnitRecord`:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | MagicItemRecord;
```

## Gap 2 — MagicItemMechanics family (structural)

At minimum, a `passive_while_worn` (or `spell_access_grant`) mechanics family is needed to express items that grant unlimited spell access while equipped:

```typescript
// Proposed shape — subject to revision
export type SpellAccessGrantMechanics = {
  readonly family: "spell_access_grant";
  readonly spellId: string;
  // Charges if limited-use; absent/null for unlimited (Helm of Comprehending Languages case)
  readonly charges?: UseCountResource;
  readonly castingCostOverride?: CastingTime;
};

export type MagicItemMechanics = SpellAccessGrantMechanics; // | future families
```

This item specifically:
- `spellId`: `"comprehend_languages"`
- No charges — unlimited while worn
- No attunement
- No casting cost override (standard casting time of Comprehend Languages applies)

## Atom coverage

All needed v4 atoms already exist:

| Role | v4 atom |
|---|---|
| Source root | `magic_item_root` |
| Procedure | `activate` (casting the spell) |
| Attachment | `self` (wearer) |
| Effect | `grant_spell_access` |
| Lifecycle | `persist` + `expire` (while worn) |
| Optionally | `attune` (for items that require attunement — not this one) |

No new atoms are required. The entire gap is at the `UnitRecord` type and mechanics-family level.

## Scope of widening

- **Narrowest correct classification:** `structural_widening`
- `surface_widening` would be wrong — this is not a missing variant of an existing surface shape; the entire record kind is absent.
- `atom_widening` would be wrong — all needed atoms exist in v4.

## Items that would benefit from the same widening

All magic items in the SRD share this blocker. Examples that would also use `spell_access_grant`:
- Hat of Disguise (cast Disguise Self at will)
- Helm of Telepathy (cast Detect Thoughts)
- Boots of Levitation (cast Levitate on self at will)
- Cape of the Mountebank (cast Dimension Door once per day — adds charges)

A charge-bearing variant of `SpellAccessGrantMechanics` (with `UseCountResource` + `RestResetCadence`) would cover many of these.
