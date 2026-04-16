# Widening Proposal: Crystal Ball of Mind Reading

**Unit slug:** `magic_item_crystal_ball_of_mind_reading`  
**Outcome:** `structural_widening`  
**Confidence:** high

---

## Summary

Encoding is blocked at the type level. `UnitRecord` is `SpellRecord | ClassFeatureRecord | MasteryRecord` — there is no `magic_item` kind. The TAXONOMY v4 lists `magic_item_root` as a source atom, but `types.ts` has no corresponding record shape or mechanics family. No `.dhall` was authored.

Beyond the missing record type, the unit's rule text forces four further widenings that would need to land before a clean encoding is possible.

---

## Gap 1 — Missing record kind (structural)

`UnitRecord` must grow a `MagicItemRecord` variant:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly rarity: "common" | "uncommon" | "rare" | "very_rare" | "legendary" | "artifact";
  readonly mechanics: MagicItemMechanics;
};
```

`MagicItemMechanics` would need at minimum a `grant_spell_access` family (see Gap 5).

---

## Gap 2 — Fixed save DC (surface widening)

The two spells are cast at save DC 17 regardless of the wielder's stats. Existing `DcSource`:

```typescript
| { readonly kind: "caster_spell_save_dc" }
| { readonly kind: "weapon_attack_dc"; readonly base: number }
```

Neither fits. A new variant is needed:

```typescript
| { readonly kind: "fixed_dc"; readonly value: number }
```

Evidence: *"you can cast Scrying (save DC 17) … you can cast Detect Thoughts (save DC 17)"*

---

## Gap 3 — Waived concentration (atom widening)

Detect Thoughts is a concentration spell, but the item explicitly removes that requirement for its copy of the spell. No existing effect atom represents this. A new atom `waive_concentration` (or a boolean field on a spell-grant operation) is needed.

Evidence: *"You don't need to concentrate on this Detect Thoughts spell to maintain it during its duration"*

---

## Gap 4 — Cross-spell lifecycle dependency (atom/surface widening)

Detect Thoughts granted by the item ends when Scrying ends. This is not concentration coupling — Detect Thoughts has its own duration but is terminated by the outer spell's end. Existing lifecycle atoms (`concentrate`, `persist`, `expire`, `dismiss`) have no "ends when named spell X ends" variant.

A new lifecycle variant is needed:

```typescript
| { readonly kind: "ends_when_spell_ends"; readonly spellId: string }
```

Evidence: *"it ends if the Scrying spell ends"*

---

## Gap 5 — Sensor-relative attachment (surface widening)

Detect Thoughts targets creatures within 30 feet *of the Scrying sensor*, not within 30 feet of the caster. Existing `Attachment` kinds (`self`, `target`, `area`, `mark`) all resolve range from the caster's position or a static origin point. A new `sensor` attachment variant is needed:

```typescript
| {
    readonly kind: "sensor";
    readonly sourceSpellId: string;
    readonly radiusFeet: number;
  }
```

Evidence: *"targeting creatures you can see within 30 feet of the spell's sensor"*

---

## Gap 6 — Item spell-grant mechanics family (structural)

The item's whole mechanic is granting access to two spells with modified parameters. There is no `MagicItemMechanics` family in types.ts. The minimal family needed for Crystal Ball variants would be:

```typescript
export type MagicItemGrantSpellMechanics = {
  readonly family: "grant_spell_access";
  readonly spells: ReadonlyArray<{
    readonly spellId: string;
    readonly dc?: DcSource;           // overrides spell's native DC
    readonly waiveConcentration?: boolean;
    readonly lifecycleDependency?: { readonly kind: "ends_when_spell_ends"; readonly spellId: string };
    readonly attachment?: Attachment; // for sensor-relative variants
  }>;
};
```

---

## Encoding verdict

Do not encode until at minimum Gap 1 (MagicItemRecord), Gap 2 (fixed_dc), Gap 3 (waive_concentration), Gap 4 (cross-spell lifecycle), and Gap 5 (sensor attachment) are added. All five are independently forced by the source text — none is optional.
