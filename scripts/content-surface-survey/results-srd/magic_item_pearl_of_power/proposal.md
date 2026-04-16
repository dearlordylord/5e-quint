# Proposal: Widenings required for Pearl of Power

## Unit

**Pearl of Power** — Wondrous Item, Uncommon (Requires Attunement by a Spellcaster)

> While this pearl is on your person, you can take a Magic action to regain one expended spell slot of level 3 or lower. Once you use the pearl, it can't be used again until the next dawn.

## Outcome: `structural_widening`

The unit cannot be honestly encoded. The primary blocker is that `magic_item` is not a `UnitRecord` kind. The current union is `SpellRecord | ClassFeatureRecord | MasteryRecord`.

## Required widenings (in dependency order)

### 1. `MagicItemRecord` — new top-level `UnitRecord` kind (structural)

A new record variant is needed:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: AttunementRequirement | false;
  readonly mechanics: MagicItemMechanics;
};
```

The `magic_item_root` source atom already exists in v4. The surface just has no record type that maps to it.

### 2. `AttunementRequirement` — new surface type (surface widening)

Magic items can require attunement, with an optional constraint on who may attune:

```typescript
export type AttunementRequirement =
  | { readonly kind: "any" }
  | { readonly kind: "spellcaster" }
  | { readonly kind: "class"; readonly className: ClassName }
  | { readonly kind: "alignment"; readonly alignment: string };
```

Pearl of Power uses `{ kind: "spellcaster" }`.

v4 atom traced: `attunement_slot` (resource).

### 3. `RestResetCadence.dawn` — new variant (surface widening)

The pearl resets at next dawn, not at a rest. The existing `RestResetCadence` union covers short/long rest patterns only:

```typescript
| { readonly kind: "dawn" }
```

This is the pattern used by many magic items (e.g., "can't be used again until the next dawn"). No v4 atom gap — dawn is a time boundary expressible as a `duration_window` or `expire` lifecycle atom.

### 4. `MagicItemActivationCost.magic_action` — new variant (surface widening)

The item is activated by taking the Magic action (a `StandardActionKind`). `ClassFeatureActivationCost` only covers `free` and `bonus_action`. A magic item activation cost needs to support the full standard action set:

```typescript
export type MagicItemActivationCost =
  | { readonly kind: "free" }
  | { readonly kind: "action" }
  | { readonly kind: "magic_action" }
  | { readonly kind: "bonus_action" }
  | { readonly kind: "reaction"; readonly trigger: ReactionTrigger };
```

v4 atom traced: `action_quota` (resource), labeled with the magic action kind.

### 5. `refund_spell_slot` — new effect shape (surface widening)

The core effect is recovering an expended spell slot up to a maximum level. v4 has a `refund` procedure atom. The surface needs a corresponding effect type:

```typescript
export type RefundSpellSlotEffect = {
  readonly kind: "refund_spell_slot";
  readonly maxLevel: SpellLevel;  // 3 for Pearl of Power
};
```

v4 atom traced: `refund` (procedure) → `spell_slot` (resource).

### 6. `MagicItemMechanics` — new payload family (structural)

The mechanics family for an activated magic item with a use-count and dawn reset:

```typescript
export type MagicItemActivationMechanics = {
  readonly family: "activation";
  readonly activationCost: MagicItemActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;  // extended with dawn variant
  readonly effect: MagicItemEffect;
};

export type MagicItemEffect = RefundSpellSlotEffect | /* future effects */;

export type MagicItemMechanics = MagicItemActivationMechanics;
```

## Encoding (once widened)

```dhall
{ kind = "magic_item"
, id = "magic_item_pearl_of_power"
, name = "Pearl of Power"
, provenance = { kind = "srd-5.2.1", section = "Magic-Items/Items-I-P#Pearl of Power" }
, description = "While this pearl is on your person, you can take a Magic action to regain one expended spell slot of level 3 or lower. Once you use the pearl, it can't be used again until the next dawn."
, requiresAttunement = { kind = "spellcaster" }
, mechanics =
    { family = "activation"
    , activationCost = { kind = "magic_action" }
    , resource = { kind = "use_count", cap = { kind = "fixed", uses = 1 } }
    , resetCadence = { kind = "dawn" }
    , effect = { kind = "refund_spell_slot", maxLevel = 3 }
    }
}
```

## Tracer atoms that would be emitted (once widened)

| atom | category |
|---|---|
| `magic_item_root` | source |
| `activate` | procedure |
| `action_quota` | resource (magic action) |
| `use_count` | resource |
| `duration_window` / `expire` | lifecycle (dawn reset) |
| `attunement_slot` | resource |
| `refund` | procedure |
| `spell_slot` | resource (max level 3) |

All atoms exist in v4 except `refund_spell_slot` as a named effect shape — `refund` exists as a procedure atom, so no new v4 atom is needed, only a new surface effect variant.
