# Proposal: surface_widening for Antilife Shell

## Unit

**Antilife Shell** — SRD 5.2.1, Level 5 Abjuration spell  
Concentration, up to 1 hour; Casting Time: Action; Range: Self (10-ft Emanation); Components: V, S

## What fits

- **Family:** `ongoing_effect` — a persistent area effect while concentration holds. ✓  
- **Attachment:** `area` with shape `{ kind: "emanation", radiusFeet: 10 }` and `origin: { kind: "self" }`. ✓  
- **Trigger:** `passive` — the barrier is always active while the spell persists. ✓  
- **Effect atom:** `block_travel` exists in the surface and represents "prevents passage through". ✓  
- **Duration:** `concentration, upTo: { unit: "hour", amount: 1 }`. ✓  

## What is missing

### 1. Creature-type filter on area occupant effects (surface_widening)

**The gap:** Antilife Shell blocks passage for most creature types but explicitly exempts Constructs and Undead. The current surface has `occupantDispositionFilter?: "friendly_to_source" | "hostile_to_source"` on area attachments, which distinguishes creatures by relationship to the source — not by creature type.

There is no structured field to say "this area effect applies only to creatures of types [list]" or "excluding creature types [list]". Encoding the exclusion in `block_travel.scope: string` (a freeform label) would be dishonest: the creature-type constraint is load-bearing and needs to be machine-readable for any downstream engine or tracer to behave correctly.

**Proposed addition:** An optional `occupantTypeFilter` on the `area` attachment (or equivalently on the `OngoingOperation` itself), supporting inclusion/exclusion of `CreatureType` values:

```typescript
occupantTypeFilter?: {
  readonly exclude?: ReadonlyNonEmptyArray<CreatureType>;
  readonly include?: ReadonlyNonEmptyArray<CreatureType>;
};
```

For Antilife Shell the encoding would be `exclude: ["construct", "undead"]`.

This same filter shape would also serve other area spells that scope by creature type (e.g. Spirit Guardians affecting only creatures of the caster's choice, Forbiddance targeting specific creature categories).

### 2. DurationEndTrigger: caster movement forces target through barrier (surface_widening)

**The gap:** "If you move so that an affected creature is forced to pass through the barrier, the spell ends." This early termination fires when the **caster's own movement** causes the geometric footprint of the emanation to engulf an existing position, forcing a creature through the boundary. None of the existing `DurationEndTrigger` variants cover it:

| Existing variant | Why it doesn't fit |
|---|---|
| `target_makes_attack_roll` | target action, not caster movement |
| `target_deals_damage` | target action, not caster movement |
| `target_casts_spell` | target action, not caster movement |
| `target_dons_armor` | target action, not caster movement |
| `target_damaged_by_caster_or_ally` | damage event, not movement |
| `target_takes_damage` | damage event, not movement |
| `caster_recasts_spell` | recast event, not movement |

**Proposed addition:**

```typescript
| { readonly kind: "caster_movement_forces_target_through_barrier" }
```

This variant is narrow and specific to emanation-type barriers, but it's the honest representation of the RAW text. A more general `caster_moves` trigger would also work and might serve future units.

## Encoding path once widenings land

With both additions, Antilife Shell encodes as a single `OngoingOperation`:

```
family: ongoing_effect
attachment: area { kind: emanation, radiusFeet: 10, origin: self }
  + occupantTypeFilter: { exclude: ["construct", "undead"] }
duration: concentration, upTo: 1 hour
  + earlyEnd: [{ kind: "caster_movement_forces_target_through_barrier" }]
operations:
  - trigger: passive
    effect: block_travel { scope: "physical_passage_and_reach" }
```

The "affected creatures can still cast spells or attack with Ranged/Reach weapons through the barrier" clause is a **negative constraint** (what the barrier does NOT block), not a separate atom. It is clarifying text on `block_travel.scope` rather than a new effect.

## Classification

`surface_widening` — all required v4 atoms exist (`block_travel`, `area` attachment, `ongoing_effect` family). The two missing pieces are new variants of existing surface types (`Attachment.area` filter and `DurationEndTrigger` union).
