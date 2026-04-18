# Proposal: Wand of Fear — surface_widening

## Unit

**Wand of Fear** (`magic_item_wand_of_fear`) — SRD 5.2.1, Rare, Requires Attunement.

## What fits

The primary mechanics encode cleanly on the existing `ActivatedAbilityMechanics` (family `activation`) + `charge_pool` pattern established by Wand of Fireballs:

- **7-charge pool**, `cap: { kind: "fixed", uses: 7 }`
- **Two spell grants** at different costs: `grant_spell_access` × 2 with `charge_cast` mode
- **Fixed DC 15** via `dcOverride: { kind: "fixed", dc: 15 }` on each grant
- **Fear area override**: the wand's 60-foot Cone vs the spell's printed 30-foot Cone expressed via `areaOverride: { kind: "cone", lengthFeet: 60 }`
- **Dawn reset** with `regain: 1d6+1`
- **Last-charge destruction** via `last_charge_roll { die: 20, destroyOn: 1 }`
- **Holding predicate** via `condition: { kind: "holding_item" }`

Typecheck passes. Tracer produces a valid graph.

## What does not fit

### Command spell-option restriction

**RAW text:** `Command ("flee" or "grovel" only)`

The Command spell (SRD 5.2.1) normally allows any single word as the command. The wand restricts casts to only two specific options: "flee" or "grovel." This sub-option restriction has no current representation in `grant_spell_access`.

**Proposed widening:** Add an optional `spellCommandRestriction` (or similar) field to `grant_spell_access` that names a closed list of allowed command words or spell sub-options:

```typescript
// on EffectAtom grant_spell_access:
readonly spellCommandRestriction?: ReadonlyNonEmptyArray<string>;
```

**Scope:** `surface_widening` — a new optional variant on an existing surface type. No new v4 taxonomy atom is required; `grant_spell_access` already exists and the restriction is a narrowing qualifier on the cast, not a distinct atom.

**Pressure:** This is the first observed instance of a spell-option restriction in the SRD item catalog. Other Command-granting items (e.g., Ring of Animal Influence) may also carry specific word restrictions — widen once if a second instance confirms the pattern.

## Classification

`surface_widening` — all primary mechanics are representable; one secondary qualifier (Command word restriction) lacks a surface field.
