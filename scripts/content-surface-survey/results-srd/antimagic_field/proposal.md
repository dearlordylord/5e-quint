# Proposal: Antimagic Field — Surface Widening

## Outcome: `surface_widening`

Antimagic Field fits the `ongoing_effect` family structurally — it is a concentration spell with a persistent area-of-effect operation. Two blockers prevent honest encoding, and a structural tension compounds them.

---

## Blocker 1 — `AreaOrigin` missing `self_centered`

```
// Current:
export type AreaOrigin =
  | { readonly kind: "point_within_range" }
  | { readonly kind: "on_primary_target" };
```

Antimagic Field creates a **10-foot Emanation centered on the caster that moves with the caster**. Neither existing variant expresses this:

- `point_within_range` — stationary point chosen at cast time
- `on_primary_target` — anchored to a target creature, not the caster

### Proposed addition

```typescript
export type AreaOrigin =
  | { readonly kind: "point_within_range" }
  | { readonly kind: "on_primary_target" }
  | { readonly kind: "self_centered" };  // NEW — moves with caster
```

**Evidence:** *"An aura of antimagic surrounds you in a 10-foot Emanation."*

This is the same widening needed by other caster-emanation spells (Aura of Protection, Holy Aura, etc.).

---

## Blocker 2 — `OngoingOperation` missing suppression variants

```typescript
// Current:
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

Antimagic Field's core mechanic is a multi-part suppression aura. None of the existing variants can encode it. Three distinct sub-operations are needed:

### 2a — Suppress new magic (block casting, Magic actions, magic item properties)

```typescript
export type SuppressMagicOperation = {
  readonly kind: "suppress_magic";
  // No extra fields needed — the suppression scope is total within the area.
};
```

Maps to v4 atoms: `suppress` (procedure) + `block_targeting` (effect).

**Evidence:** *"No one can cast spells, take Magic actions, or create other magical effects inside the aura, and those things can't target or otherwise affect anything inside it. Magical properties of magic items don't work inside the aura or on anything inside it."*

### 2b — Suppress ongoing spells (with Artifact/deity exception)

This is distinct from blocking new casting. Already-active spells are **paused** — they don't function, but their duration still ticks. Artifact and deity spells are exempt.

```typescript
export type SuppressOngoingSpellsOperation = {
  readonly kind: "suppress_ongoing_spells";
  readonly exemptSources?: ReadonlyArray<"artifact" | "deity">;
};
```

Maps to v4 atoms: `suppress` (procedure) + `persist` / `expire` (lifecycle — duration still runs while suppressed).

**Evidence:** *"Ongoing spells, except those cast by an Artifact or a deity, are suppressed in the area. While an effect is suppressed, it doesn't function, but the time it spends suppressed counts against its duration."*

The `exemptSources` field is a named carve-out with no current surface expression anywhere in the schema. It is not DM-agenda (the exemption is deterministic — Artifact vs. non-Artifact is rule-defined).

### 2c — Block transit (teleportation, planar travel, portals)

```typescript
export type BlockTransitOperation = {
  readonly kind: "block_transit";
  readonly modes: ReadonlyArray<"teleportation" | "planar_travel" | "portal">;
};
```

Maps to v4 atom: `block_travel` (effect).

**Evidence:** *"No one can teleport into or out of it or use planar travel there. Portals close temporarily while in the aura."*

---

## Structural Tension — single `operation` field

`OngoingEffectMechanics` currently carries one operation:

```typescript
export type OngoingEffectMechanics = SpellMechanicsHeader & {
  readonly family: "ongoing_effect";
  readonly attachment: Attachment;
  readonly operation: OngoingOperation;  // singular
};
```

Antimagic Field requires all three sub-operations simultaneously. Options:

**Option A — Compound variant:**  Add a single `suppress_magic_aura` variant that bundles all three sub-effects. Simpler surface; loses individual traceability of sub-effects.

**Option B — Array field:**  Change `operation: OngoingOperation` to `operations: ReadonlyArray<OngoingOperation>`. More honest; requires tracer update to iterate operations.

Option A is lower-risk for this spell but would need revisiting if future spells need mixed sub-operations (e.g., suppress-magic + damage). Option B is the honest long-term shape.

---

## Summary of widenings

| # | Kind | Name | Blocking? |
|---|------|------|-----------|
| 1 | `new_variant` | `AreaOrigin::self_centered` | Yes |
| 2a | `new_variant` | `OngoingOperation::suppress_magic` | Yes |
| 2b | `new_variant` | `OngoingOperation::suppress_ongoing_spells` | Yes |
| 2c | `new_variant` | `OngoingOperation::block_transit` | Yes |
| — | structural | Single `operation` → `operations[]` | Compound only |

All underlying v4 atoms (`suppress`, `block_targeting`, `block_travel`) already exist. This is a surface-schema gap, not a taxonomy gap.

---

## What honest encoding would look like (sketch)

```dhall
{ kind = "spell"
, id = "antimagic_field"
, family = "ongoing_effect"
, level = 8
, school = "abjuration"
, castingTime = { kind = "action" }
, range = { kind = "self" }
, components = { v = True, s = True, m = Some "iron filings" }
, duration = { kind = "concentration", upTo = { unit = "hour", amount = 1 } }
, attachment =
    { kind = "area"
    , shape = { kind = "sphere", radiusFeet = 10 }
    , origin = { kind = "self_centered" }   -- NEEDS WIDENING
    }
, operations =                              -- NEEDS ARRAY + NEW VARIANTS
    [ { kind = "suppress_magic" }
    , { kind = "suppress_ongoing_spells", exemptSources = [ "artifact", "deity" ] }
    , { kind = "block_transit", modes = [ "teleportation", "planar_travel", "portal" ] }
    ]
}
```

No Dhall or JSON artifact is authored because the schema does not yet support this encoding.
