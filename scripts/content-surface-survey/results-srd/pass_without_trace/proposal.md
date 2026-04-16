# Proposal: Surface Widening for Pass without Trace

## Unit

- **Slug:** `pass_without_trace`
- **Kind:** spell
- **Level:** 2, Abjuration
- **Family:** `ongoing_effect` (concentration, 1 hour)

## Outcome

`surface_widening` — two variants of existing surface types are missing. No new v4 atoms are required.

---

## Gap 1: `AreaOrigin.on_caster` (Emanation)

### What is missing

`AreaOrigin` currently has two variants:

```typescript
export type AreaOrigin =
  | { readonly kind: "point_within_range" }
  | { readonly kind: "on_primary_target" };
```

Pass without Trace creates a 30-foot Emanation **centered on the caster** that moves with them for the duration. This is a distinct geometry from both existing variants:

- `point_within_range` — a fixed point chosen at cast time; the area does not move.
- `on_primary_target` — centered on a selected creature other than the caster (e.g., Moonbeam-style persistent area on a target).

An Emanation is anchored to the **caster's current position at every instant**. Forcing it into `point_within_range` would be false: the area is not fixed in space. A new variant is required:

```typescript
| { readonly kind: "on_caster" }
```

### Other spells that would use this

Any spell described as "you radiate an aura" or "Emanation" in SRD 5.2.1: Paladin's Aura of Protection, Holy Aura, Death Ward (if aura-flavored), etc. This is a recurring shape, not a one-off.

### Proposed addition to `types.ts`

```typescript
export type AreaOrigin =
  | { readonly kind: "point_within_range" }
  | { readonly kind: "on_primary_target" }
  | { readonly kind: "on_caster" };            // Emanation — moves with caster
```

The tracer already handles `area` attachment and `activate`/`ongoing_effect` families; the new variant would slot into `traceAttachment` with a label like `"origin: caster (emanation)"`.

---

## Gap 2: `RollKind.ability_check`

### What is missing

`RollKind` currently has:

```typescript
export type RollKind = "attack_roll" | "saving_throw";
```

The spell's core effect is:

> "you and each creature you choose have a **+10 bonus to Dexterity (Stealth) checks**"

This is a numeric modifier on an **ability check** — a mechanically distinct roll type from attack rolls and saving throws. The `modify_roll_numeric` v4 atom is the right atom for this effect; the surface type `RollModifierOperation` already has the right shape. The only missing piece is the `RollKind` variant needed to name the target roll.

A general `"ability_check"` variant is sufficient for this spell. A more refined expansion (e.g., `"dexterity_check"` or `"skill_check"`) could follow as further pressure accumulates.

### Proposed addition to `types.ts`

```typescript
export type RollKind = "attack_roll" | "saving_throw" | "ability_check";
```

This unlocks the full `RollModifierOperation` shape for skill/ability check riders. Bless and similar spells already cover attack rolls and saving throws; ability checks are the third roll category in SRD 5.2.1 and will appear repeatedly.

---

## Omitted mechanic: "Leave no tracks"

The spell also grants: "leave no tracks." This is a world-state / exploration-layer effect — track-presence is DM-controlled, not a deterministic combat-mechanic with a dice boundary. Per `ARCHITECTURE.md`, caller-owned facts and DM-adjudicated effects are out of core. This rider should be omitted from the encoded mechanics without penalty; it belongs to narrative description.

---

## What the encoding would look like once widened

```dhall
let passWithoutTrace =
      { kind = "spell"
      , id = "pass_without_trace"
      , name = "Pass without Trace"
      , provenance = { kind = "srd-5.2.1", section = "Spells/Descriptions-N-P#Pass-without-Trace" }
      , description = "..."
      , mechanics =
          { family = "ongoing_effect"
          , level = 2
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = Some "ashes from burned mistletoe" }
          , duration = { kind = "concentration", upTo = { unit = "hour", amount = 1 } }
          , attachment =
              { kind = "area"
              , shape = { kind = "sphere", radiusFeet = 30 }
              , origin = { kind = "on_caster" }      -- NEW variant
              }
          , operation =
              { kind = "roll_modifier"
              , on = [ "ability_check" ]              -- NEW variant (Stealth is a DEX check)
              , delta = { dice = 0, dieSize = 1, sign = "+", flat = 10 }
              -- NOTE: flat-only delta may also need DiceDelta to allow flat field;
              -- or use the numeric bonus representation. Exact delta shape TBD.
              }
          }
      }
```

> Note: The `DiceDelta` type (`dice`, `dieSize`, `sign`) is designed for die-step bonuses. A flat +10 (no dice) would need either: (a) `DiceDelta` extended with an optional `flat` field, or (b) a separate `NumericDelta` variant. This is a secondary surface concern; the two widenings above are the primary blockers.

---

## Summary

| Gap | Classification | Resolution |
|-----|---------------|-----------|
| `AreaOrigin` missing `on_caster` (Emanation) | `surface_widening` | Add `{ kind: "on_caster" }` variant |
| `RollKind` missing `ability_check` | `surface_widening` | Add `"ability_check"` to union |
| `DiceDelta` flat-only bonus | secondary (low pressure) | Extend or add `flat` field to `DiceDelta`, or introduce `NumericDelta` |
| "Leave no tracks" | `dm_agenda` | Omit from encoding — caller-owned |
