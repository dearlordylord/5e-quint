# Proposal: surface_widening for Detect Magic

## Unit

- Slug: `detect_magic`
- Kind: spell
- SRD 5.2.1, Spells/Descriptions-E-N#Detect Magic

## Why it doesn't fit

Detect Magic is structurally an `ongoing_effect` spell:

- Concentration, up to 10 minutes
- Self attachment
- Passive operation active for the duration

The gap is in `OngoingOperation`:

```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

Detect Magic's operation is neither a roll modifier nor a damage rider — it grants the caster a persistent magical sense that lets them detect magical effects within 30 feet. The v4 taxonomy already has `grant_sense` as an effect atom; the surface's `OngoingOperation` union just doesn't expose it.

## Proposed widening

### New variant: `GrantSenseOperation`

Add to `OngoingOperation`:

```typescript
export type GrantSenseOperation = {
  readonly kind: "grant_sense";
  readonly senseKind: "detect_magic";   // closed enum; widen as Detect Evil and Good etc. arrive
  readonly radiusFeet: number;           // 30 for Detect Magic
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | GrantSenseOperation;
```

With this variant, Detect Magic encodes as:

```dhall
{ family = "ongoing_effect"
, attachment = { kind = "self" }
, operation =
    { kind = "grant_sense"
    , senseKind = "detect_magic"
    , radiusFeet = 30
    }
}
```

The tracer would emit:

- `spell_root` → `activate` (via `action_quota`, `spell_slot ≥ 1`)
- `activate` → `concentration_lock`, `concentrate`, `expire ≤ 10 minutes`
- `activate` → `grant_sense` effect atom, attaches to `self`

## Secondary mechanic (omitted from core)

The spell allows the caster to take the Magic action during concentration to _see_ auras and _learn_ the spell school of active effects. This involves:

1. A conditioned sub-action (only available while sense is active)
2. An informational output — "you learn the spell's school of magic"

The school identification is a DM-reported informational fact, not a deterministic mechanical resolution in the combat engine. Per ARCHITECTURE.md, notification surfaces and caller-owned facts stay out of core. This mechanic is omitted from the encoding; the core record captures only the persistent magical sense.

## Blocking rule (omitted from core)

"The spell is blocked by 1 foot of stone, dirt, or wood; 1 inch of metal; or a thin sheet of lead."

This is a line-of-effect modifier on the sense radius. It is environmental/DM-adjudicated at the table; no atom in v4 covers material-based sensor blocking. Omit.

## Classification

`surface_widening` — a new variant of an existing surface type (`OngoingOperation`) would solve it. The underlying v4 atom (`grant_sense`) already exists. No new top-level family or v4 atom is required.
