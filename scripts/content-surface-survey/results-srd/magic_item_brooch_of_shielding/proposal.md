# Proposal: Brooch of Shielding — structural_widening

## Outcome

`structural_widening` — the unit cannot be encoded in any existing `UnitRecord` family.

## Root cause

`UnitRecord` in `src/surface/types.ts` is:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The TAXONOMY v4 lists `magic_item_root` as a source atom, but the surface was never extended to include a magic item record shape or mechanics family.

## What the Brooch of Shielding actually does

```
While wearing this brooch, you have Resistance to Force damage,
and you have Immunity to damage from the Magic Missile spell.
Requires Attunement.
```

Two always-on passive effects:
1. **Resistance** to Force damage — maps to existing v4 atom `grant_resistance`.
2. **Immunity to damage from Magic Missile** — maps to v4 atom `negate_named_effect` with `scope: "damage_only"`, but in a passive context (not a reaction).

Neither effect has an activation cost, casting time, trigger, or hit window. They are simply "while worn + attuned."

## Required widenings

### 1. `MagicItemRecord` top-level kind (structural)

A new record variant must be added to `UnitRecord`:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};
```

The tracer needs a `traceMagicItemUnit` path and a `magic_item_root` source atom emission.

### 2. `passive_grant` mechanics family (structural)

All existing spell/feature mechanics families require an activation event. Magic items with always-on passive effects need a new family:

```typescript
export type PassiveGrantMechanics = {
  readonly family: "passive_grant";
  readonly effects: ReadonlyArray<PassiveEffect>;
};
```

Where `PassiveEffect` could include:
- `grant_resistance` (already in v4 atoms)
- `grant_immunity` (new variant — see below)
- `grant_sense`, `modify_ac`, etc. (existing v4 atoms)

### 3. `grant_immunity` effect (surface widening — or reuse via passive negate_named_effect)

The brooch's immunity to Magic Missile is specific to a named source. Two options:

**Option A** — new `GrantImmunityEffect` variant:
```typescript
export type GrantImmunityEffect =
  | { readonly kind: "grant_immunity"; readonly damageType: DamageType }
  | { readonly kind: "grant_immunity_named_source"; readonly spellId: string; readonly scope: "damage_only" | "all_effects" };
```

**Option B** — reuse `negate_named_effect` inside the passive family (no new atom needed, only a surface path change).

Option B is narrower and preferred if `negate_named_effect` already covers the semantics. The atom exists in v4; it just needs to be reachable from a passive context rather than only from `TriggeredReactionMechanics`.

### 4. Attunement surface field

`requiresAttunement: boolean` on the record (sketched above) is sufficient for now. The v4 `attunement_slot` resource atom can be emitted by the tracer when this is `true`.

## Atom inventory check

| Effect | v4 atom | Status |
|---|---|---|
| Force resistance | `grant_resistance` | Exists |
| Magic Missile immunity (damage) | `negate_named_effect` | Exists (needs passive path) |
| Attunement cost | `attunement_slot` | Exists |
| Item source root | `magic_item_root` | Exists in taxonomy, not in surface |

No new v4 atoms are required. The gap is entirely in the surface type system and tracer family dispatch.

## Suggested encoding (once widened)

```dhall
let broochOfShielding =
  { kind = "magic_item"
  , id = "magic_item_brooch_of_shielding"
  , name = "Brooch of Shielding"
  , requiresAttunement = True
  , provenance = { kind = "srd-5.2.1", section = "Magic-Items/Items-A-H#Brooch of Shielding" }
  , description = "While wearing this brooch, you have Resistance to Force damage, and you have Immunity to damage from the Magic Missile spell."
  , mechanics =
      { family = "passive_grant"
      , effects =
          [ { kind = "grant_resistance", damageType = "force" }
          , { kind = "negate_named_effect", spellId = "magic_missile", scope = "damage_only" }
          ]
      }
  }
in broochOfShielding
```

## Classification confidence

**High.** The surface gap is unambiguous — `UnitRecord` has no `magic_item` arm. The atomic effects map cleanly to existing v4 atoms once the structural scaffolding is in place.
