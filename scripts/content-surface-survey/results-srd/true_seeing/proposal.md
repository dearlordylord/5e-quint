# Proposal: True Seeing — surface_widening

## Spell summary

- Level 6 Divination, Action cast, Touch range, 1-hour timed duration (no concentration)
- "For the duration, the willing creature you touch has Truesight with a range of 120 feet."

## What fits

The spell maps cleanly to the `ongoing_effect` family:

| Dimension | Value | Status |
|---|---|---|
| Family | `ongoing_effect` | exists |
| Level | 6 | valid `SpellLevel` |
| School | `divination` | valid `SpellSchool` |
| Casting time | `{ kind: "action" }` | exists |
| Range | `{ kind: "touch" }` | exists |
| Components | `{ v: true, s: true, m: "mushroom powder worth 25+ GP (consumed)" }` | exists |
| Duration | `{ kind: "timed", value: { unit: "hour", amount: 1 } }` | exists |
| Attachment | `{ kind: "target", selection: { mode: "one" } }` | exists |
| Effect atom | `grant_sense` | **exists in v4 taxonomy §9** |

## The gap

`OngoingOperation` in `types.ts` only has two variants:

```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

Neither variant can carry "grant this sense for the duration." True Seeing's operation is neither a roll modifier nor a damage-on-hit rider — it is a persistent sense grant. Using either existing variant would produce a false trace.

The v4 atom `grant_sense` exists in the taxonomy (§9 Effect Atoms, unchanged from v3). The gap is purely at the surface schema level: a missing `operation` variant.

## Proposed widening

Add a `GrantSenseOperation` variant to `OngoingOperation`:

```typescript
// Closed sense enum; widen as further units land.
export type SenseKind = "truesight" | "blindsight" | "darkvision" | "tremorsense";

export type GrantSenseOperation = {
  readonly kind: "grant_sense";
  readonly sense: SenseKind;
  readonly rangeFeet: number;
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | GrantSenseOperation;
```

The tracer would need a corresponding `case "grant_sense"` arm in `traceOngoingOperation` emitting a `grant_sense` atom node.

## What the encoding would look like

```dhall
{ kind = "spell"
, id = "true_seeing"
, name = "True Seeing"
, provenance = { kind = "srd-5.2.1", section = "Spells/Descriptions-T#True Seeing" }
, description = "For the duration, the willing creature you touch has Truesight with a range of 120 feet."
, mechanics =
    { family = "ongoing_effect"
    , level = 6
    , school = "divination"
    , castingTime = { kind = "action" }
    , range = { kind = "touch" }
    , components = { v = True, s = True, m = Some "mushroom powder worth 25+ GP, which the spell consumes" }
    , duration = { kind = "timed", value = { unit = "hour", amount = 1 } }
    , attachment = { kind = "target", selection = { mode = "one" } }
    , operation = { kind = "grant_sense", sense = "truesight", rangeFeet = 120 }
    }
}
```

## Pressure assessment

The `grant_sense` atom appears in v4 because multiple spells grant senses (Darkvision, See Invisibility, True Seeing, etc.). This widening is low-risk and expected — `OngoingOperation` is the natural home for any persistent sense grant cast on a target creature. The `SenseKind` enum can start with `"truesight"` and widen as other sense-granting spells are encoded.

## Classification

**`surface_widening`** — new variant of existing `OngoingOperation` surface type. The `grant_sense` v4 atom already exists; no taxonomy change needed.
