# Proposal: Cloak of the Bat — Widening Analysis

**Outcome:** `structural_widening`
**Unit slug:** `magic_item_cloak_of_the_bat`

---

## Why this unit cannot be encoded

`UnitRecord` is `SpellRecord | ClassFeatureRecord | MasteryRecord`. There is no `magic_item` kind. Encoding is blocked before any mechanic is examined.

---

## Required widenings (in order of severity)

### 1. `magic_item` kind + `MagicItemRecord` (structural)

The surface needs a new top-level record variant:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};
```

`UnitRecord` must include `MagicItemRecord`. The taxonomy already has `magic_item_root` and `attunement_slot` as v4 atoms, so the atom inventory is ready — only the surface is missing.

---

### 2. `RestResetCadence: { kind: "dawn" }` (surface)

The Polymorph use recharges at dawn. Current variants cover only rest-based resets. A `dawn` cadence (real-time day boundary) is a new variant of `RestResetCadence`.

> *"The cloak can't be used this way again until the next dawn."*

---

### 3. `RollKind: "ability_check"` (surface)

`RollKind` is `"attack_roll" | "saving_throw"`. Advantage on Stealth (a Dexterity ability check) requires a third variant. Depending on design intent, this might be `"ability_check"` (broad) or a finer-grained discriminant that includes skill identity.

> *"you have Advantage on Dexterity (Stealth) checks"*

---

### 4. Passive (non-expiring) roll-advantage shape (surface)

`ModifyRollAdvantageRider` has `count: number` and `expiresOn: RiderExpiry`, which model a temporary, counted buff. The Stealth advantage is permanent while the item is worn — it has no expiry and no count. A new shape without those fields is needed, or `ModifyRollAdvantageRider` must be made a discriminated union with a `permanent` variant.

> *"While wearing this cloak, you have Advantage on Dexterity (Stealth) checks."*

---

### 5. Fly speed grant (atom / surface)

The cloak grants a **Fly Speed** of 40 ft (not a walk speed increase). The v4 atom `modify_speed` exists but the surface exposes no `speedKind` discriminant. A `grant_fly_speed` effect or a `modify_speed` surface type with a `kind: "fly"` field is required.

The fly speed is also conditional: it is lost when the wearer stops gripping the edges or exits dim light/darkness. This expiry shape (a continuous prerequisite) is also absent from any current lifecycle atom.

> *"you can grip the edges of the cloak and use it to gain a Fly Speed of 40 feet. If you ever fail to grip the cloak's edges while flying in this way, or if you are no longer in Dim Light or Darkness, you lose this Fly Speed."*

---

### 6. Environmental condition gate (atom)

Two of the cloak's three mechanics are conditioned on being in **dim light or darkness**. No atom or filter in the current surface models an environmental light-level prerequisite. This is a new atom needed at the activation-gate layer.

> *"In an area of Dim Light or Darkness"* (appears twice)

---

### 7. Stored-spell activation from item (subgraph)

The cloak grants the ability to cast *Polymorph* on the wearer with item-specific overrides:
- Target is always self.
- Form is fixed (Bat).
- Mental ability scores are retained.
- Use is gated on light condition and recharges at dawn.

The v4 taxonomy has a `stored_spell` attachment atom, but the surface has no mechanics family for an item that activates a named spell with per-cast parameter overrides. This is a new `stored_spell_activation` mechanics family (distinct from the spell's own entry).

> *"you can cast Polymorph on yourself, shape-shifting into a Bat. While in that form, you retain your Intelligence, Wisdom, and Charisma scores."*

---

## Summary table

| # | Kind | Name | Blocking? |
|---|------|------|-----------|
| 1 | `new_subgraph` | `magic_item` kind + `MagicItemRecord` | Yes — primary |
| 2 | `new_variant` | `RestResetCadence: { kind: "dawn" }` | Yes |
| 3 | `new_variant` | `RollKind: "ability_check"` | Yes |
| 4 | `new_variant` | Passive roll-advantage shape (no count/expiry) | Yes |
| 5 | `new_atom` | `grant_fly_speed` / `modify_speed` with `speedKind` | Yes |
| 6 | `new_atom` | Environmental condition gate (light level) | Yes |
| 7 | `new_subgraph` | Stored-spell activation from item | Yes |

No encoding is possible until at minimum widening #1 is resolved.
