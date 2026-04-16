# Proposal: Clone widening gaps

## Outcome: `atom_widening`

Clone cannot be encoded honestly. The blocking gap is a missing effect atom. Secondary gaps are new surface type variants.

---

## Closest honest family: `anchored_trigger`

Clone's shape is deferred-trigger: the caster plants something during the cast that waits indefinitely, then fires when a specific event occurs (the original creature's death). This matches the `anchored_trigger` family pattern.

However, `anchored_trigger` as currently specified cannot host Clone without lying about:
1. What the anchor is (vessel, not location/area)
2. What event fires the trigger (creature death, not physical contact / enters area)
3. What the released effect does (soul transfer, no v4 atom exists)
4. What gate must pass (soul-state predicate, not a creature exemption list)
5. The casting time unit (1 hour, no `hours` variant)

---

## Required widenings

### 1. New atom: `soul_transfer` (blocking)

**Category:** effect

**What it models:** The soul of a named creature vacates the original body and takes up residence in a pre-built clone body, restoring the creature there with full memories, personality, and abilities. The original body becomes permanently inert.

**Why no existing atom suffices:**
- `heal` — restores HP; does not move a soul or change which body a creature inhabits
- `create_companion` — summons a new, separate creature; clone is not a companion
- `transport_exile` — moves a creature spatially; clone is not a teleport
- `return_on_end` — lifecycle reset when an effect expires; the trigger here is the *original's death*, not an effect ending
- `fall_on_end` — narrows to gravity-type cleanup

Soul transfer is a distinct mechanical operation: one creature-body's soul vacates and reanimates a waiting body elsewhere. This is the resurrection/reincarnation class of effects, which v4 has not modeled.

**Shape sketch:**
```
soul_transfer {
  sourceCreature: "original"       // implied by the anchor setup
  destinationAnchor: AnchorTarget  // the vessel holding the clone body
}
```

**SRD evidence:**
> "the creature's soul transfers to the clone if the soul is free and willing to return. The clone is physically identical to the original and has the same personality, memories, and abilities"

---

### 2. New `CastingTime` variant: `hours`

**Current surface type** (`CastingTime`) has: `action`, `bonus_action`, `reaction`, `minutes`.

Clone casts in 1 hour. Other long-cast spells (Forbiddance: 10 minutes; Sequester: 1 hour; Astral Projection: 1 hour) suggest an `hours` variant is needed rather than overloading `minutes` with `amount: 60`.

**Proposed addition:**
```typescript
| { readonly kind: "hours"; readonly amount: number; readonly ritual: boolean }
```

---

### 3. New `AnchorTarget` variant: `vessel`

**Current variants:** `location` (door_or_window), `area` (cube max side).

Clone's anchor is a physical container holding an inert creature body. This is neither a location in the movement/contact sense nor an area in the sphere-of-influence sense.

**Proposed addition:**
```typescript
| { readonly kind: "vessel"; readonly description: "sealable_creature_sized_container" }
```

---

### 4. New `AnchoredEvent` variant: `creature_dies`

**Current variants:** `physical_contact`, `enters_area`.

Clone fires when the **original creature dies** — a specific creature-state transition, not a creature-location interaction.

**Proposed addition:**
```typescript
| { readonly kind: "creature_dies"; readonly which: "original" }
```

---

### 5. New `AnchoredFilter` variant: `soul_willing_and_free`

**Current variant:** `creature_exemption_list` (chosen at cast, prevents certain creatures from triggering the release).

Clone has a gate: the soul transfer only completes if the soul is both free (not magically trapped, e.g. by soul cage) and willing (the creature chooses to return). This cannot be modeled as a creature exemption list chosen at cast time — it is a runtime state predicate evaluated at trigger time.

**Proposed addition:**
```typescript
| { readonly kind: "soul_willing_and_free" }
```

Note: the "willing" component has a player-agency dimension, but the SRD treats it as a mechanical gate (the spell simply fails to activate if the soul is unwilling or trapped), so it belongs in the filter grammar rather than DM agenda.

---

## Secondary observation: 120-day gestation

Clone includes a 120-day growth period before the clone body is ready. The current `anchored_trigger` schema has no concept of a preparation delay between casting and the anchor becoming active. This could potentially be modeled as a `timed` duration on the `store` procedure (the spell is "stored" for 120 days before the trigger arms), but `AnchoredTriggerMechanics` has no `readyAfter` or `preparationPeriod` field. This is noted as a minor surface gap; it does not require a new atom.

---

## Summary of widenings by priority

| # | Kind | Name | Blocking? |
|---|------|------|-----------|
| 1 | `new_atom` | `soul_transfer` | Yes |
| 2 | `new_variant` | `CastingTime.hours` | Yes (typecheck) |
| 3 | `new_variant` | `AnchorTarget.vessel` | Yes |
| 4 | `new_variant` | `AnchoredEvent.creature_dies` | Yes |
| 5 | `new_variant` | `AnchoredFilter.soul_willing_and_free` | Yes |
| 6 | (minor) | `AnchoredTriggerMechanics.preparationPeriod` | No |
