# Proposal: Surface Widenings for Sequester

## Unit

**Sequester** — 7th-level Transmutation, Action, Touch, Permanent (SRD 5.2.1)

## Family

`ongoing_effect` (spell). Sequester is a persistent state applied to a touched target — the structural fit is correct. No new family or kind is required. All four v4 atoms needed (`apply_condition`, `block_targeting`, `persist`, `expire`) exist in the taxonomy.

## Gaps

### 1. `Duration` — missing `permanent` variant

**Current union:** `instantaneous | concentration | timed`

`timed` requires `{ unit, amount }`. Sequester has no scheduled expiry — it lasts until dispelled or until the target takes any damage. Neither `concentration` (requires the caster to maintain) nor `timed` (requires a finite unit/amount) is correct.

**Proposed addition to `Duration`:**

```typescript
| { readonly kind: "permanent" }
// Optionally, early-end triggers could be captured:
// | { readonly kind: "permanent"; readonly endsOn?: ReadonlyArray<"damage" | "dispel"> }
```

The `timed` persist/expire lifecycle still applies (the spell grants `persist`, which then expires on dispel or the end trigger). The simplest extension is a bare `permanent` variant with no `value` field. If early-end triggers warrant surface representation, a `endsOn` array of closed triggers (`"damage"`, `"dispel"`) could be added, but that is optional for the core mechanics trace.

**Evidence:** `duration: [{ type: "permanent", ends: ["dispel"] }]`

---

### 2. `OngoingOperation` — missing `apply_conditions` variant

**Current union:** `RollModifierOperation | DamageOnHitOperation`

Sequester's operation is applying a set of SRD conditions to the attachment for the duration. There is no operation variant for "while this spell persists, the target has the following conditions."

**Proposed addition:**

```typescript
export type ApplyConditionsOperation = {
  readonly kind: "apply_conditions";
  readonly conditions: ReadonlyArray<Condition>;
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | ApplyConditionsOperation;
```

The tracer would emit an `apply_condition` atom node per entry (v4 effect atom, already exists) connected to the attachment.

**Evidence:** `"the target has the Invisible condition"` / `"it has the Unconscious condition"`

---

### 3. `Condition` — missing `"invisible"` and `"unconscious"` (and likely full SRD condition list)

**Current type:** `type Condition = "prone"`

Sequester inflicts both `"invisible"` and `"unconscious"`. These are standard SRD conditions that will recur across dozens of spells and features. The type should be widened to the full SRD condition vocabulary at minimum:

```typescript
export type Condition =
  | "blinded"
  | "charmed"
  | "deafened"
  | "exhausted"   // SRD 5.2.1 exhaustion levels
  | "frightened"
  | "grappled"
  | "incapacitated"
  | "invisible"
  | "paralyzed"
  | "petrified"
  | "poisoned"
  | "prone"
  | "restrained"
  | "stunned"
  | "unconscious";
```

Widening only `"invisible"` and `"unconscious"` would work for Sequester specifically, but the full list is the correct long-term shape.

**Evidence:** `"conditionInflict": ["invisible", "unconscious"]`

---

### 4. `OngoingOperation` — missing `block_detection` variant (anti-divination shielding)

**Current:** No surface operation covers the `block_targeting` v4 atom for divination/magic shielding.

Sequester's secondary effect: the target "can't be targeted by Divination spells, detected by magic, or viewed remotely with magic." This maps to the v4 atom `block_targeting` (already in the taxonomy) but has no surface expression as an ongoing operation.

**Proposed addition:**

```typescript
export type BlockDetectionOperation = {
  readonly kind: "block_detection";
  // Closed set of what is blocked. "divination_spells" | "magic_detection" | "remote_viewing"
  readonly blocks: ReadonlyArray<"divination_targeting" | "magic_detection" | "remote_viewing">;
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | ApplyConditionsOperation
  | BlockDetectionOperation;
```

Note: Sequester has **two** ongoing operations (apply_conditions + block_detection). The current schema allows only one `operation` per `OngoingEffectMechanics`. For Sequester to be fully encoded, either:
- `operation` becomes `operations: ReadonlyArray<OngoingOperation>`, or
- A multi-operation wrapper is introduced.

This is an additional surface shape change but does not require a new family.

**Evidence:** `"can't be targeted by Divination spells, detected by magic, or viewed remotely with magic"`

---

## What Is Intentionally Out of Scope

**Caster-defined end condition:** "The condition can be anything you choose" (e.g., "after 1,000 years", "when the tarrasque awakens"). This is explicitly open-ended text and cannot be encoded in a closed grammar. It is DM-adjudicated narrative. Not encoded — not a gap in the surface, a deliberate exclusion.

**Suspended animation physiology:** "doesn't age, and doesn't need food, water, or air." Per ARCHITECTURE.md, physiological / simulation facts with no deterministic mechanical resolution are caller-owned. Not encoded.

---

## Encoding Sketch (once widened)

```dhall
{ kind = "spell"
, id = "sequester"
, name = "Sequester"
, provenance = { kind = "srd-5.2.1", section = "Spells/Descriptions-R-Z#Sequester" }
, description = "..."
, mechanics =
    { family = "ongoing_effect"
    , level = 7
    , school = "transmutation"
    , castingTime = { kind = "action" }
    , range = { kind = "touch" }
    , components = { v = True, s = True, m = Some "gem dust worth 5,000+ GP, which the spell consumes" }
    , duration = { kind = "permanent" }           -- NEW VARIANT
    , attachment = { kind = "target", selection = { mode = "one" } }
    , operation =
        -- Needs multi-operation support OR separate encoding
        { kind = "apply_conditions"               -- NEW VARIANT
        , conditions = [ "invisible", "unconscious" ]  -- NEW Condition values
        }
    -- block_detection operation omitted until multi-operation support added
    }
}
```

## Summary

| Gap | Kind | Narrowest Fix |
|-----|------|---------------|
| `Duration.permanent` | `new_variant` | Add `{ kind: "permanent" }` to `Duration` union |
| `OngoingOperation.apply_conditions` | `new_variant` | Add `ApplyConditionsOperation` to `OngoingOperation` |
| `Condition: "invisible" \| "unconscious"` | `new_variant` | Widen `Condition` to full SRD condition set |
| `OngoingOperation.block_detection` | `new_variant` | Add `BlockDetectionOperation` to `OngoingOperation` |
| `OngoingEffectMechanics.operations` (plural) | `new_variant` | Allow `ReadonlyArray<OngoingOperation>` instead of single `operation` |
