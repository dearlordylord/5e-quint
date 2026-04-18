# Proposal: Goodberry — surface_widening

## Unit

**Spell:** Goodberry (L1 Conjuration, SRD 5.2.1)

## What fits

The spell's overall shape is `ongoing_effect` with a 24-hour timed (non-concentration) duration. All of the following atoms exist and would encode cleanly:

- `create_object` with `consumable: true` — 10 magical berries
- `heal_hp` with `amount: {kind: "fixed", expr: {dice: 0, flat: 1}}` — 1 HP restored per berry
- `timed` duration, 24 hours, `earlyEnd: [{kind: "caster_recasts_spell"}]` (berries vanish at spell end)

## What is missing

### 1. `OngoingTrigger` variant: creature-consumes-object (blocking)

The berry-eating event is:
> "A creature can take a Bonus Action to eat one berry."

The current `OngoingTrigger` union has:

```typescript
| { readonly kind: "on_caster_spends_action"; readonly cost: OngoingCasterActionCost; }
```

This fires only when the **caster** spends the action. Goodberry's trigger fires when **any creature** spends a Bonus Action to consume one of the created objects.

**Proposed new variant:**

```typescript
| {
    readonly kind: "on_creature_consumes_object";
    readonly cost: OngoingCasterActionCost;  // reuse: {kind:"bonus_action"} here
  }
```

Semantics: fires when any creature holding or adjacent to one of the attached consumable objects spends the stated action cost to consume it. The attachment host narrows which objects qualify; one use depletes one object from the pool (maps naturally to the 10-berry count via the `create_object` consumable pool).

This trigger would also cover future units where a consumable created by a spell can be used by any creature (not just the caster), such as hypothetical "conjure rations" variants.

### 2. `nourishment` effect atom (non-blocking, borderline dm_agenda)

> "the berry provides enough nourishment to sustain a creature for one day"

There is no effect atom for "satisfies one day of food requirements." This is a survival-system side effect alongside the HP restoration. Likely DM-agenda (the survival tracking system is caller-owned per ARCHITECTURE.md), but it is stated as a mechanical outcome of eating the berry.

If the project ever models the SRD survival/exhaustion rules mechanically, a `grant_nourishment` atom or similar would be the hook. For now, omitting this is acceptable and does not affect the blocking classification.

## Verdict

**`surface_widening`**: one new variant of the existing `OngoingTrigger` union is needed. All v4 atoms required exist in the taxonomy; the gap is in the TS surface type's trigger vocabulary, scoped to "caster" where the RAW mechanic allows "any creature."

## Encoding skeleton (blocked on widening)

```dhall
{ kind = "spell"
, id = "goodberry"
, name = "Goodberry"
, provenance = { kind = "srd-5.2.1", section = "Spells/Descriptions-E-L#Goodberry" }
, mechanics =
    { family = "ongoing_effect"
    , level = 1
    , school = "conjuration"
    , castingTime = { kind = "action" }
    , range = { kind = "touch" }
    , components = { v = True, s = True, m = Some "a sprig of mistletoe" }
    , duration = { kind = "timed", value = { unit = "hour", amount = 24 } }
    , attachment = { kind = "self" }   -- berries appear in caster's hand
    , operations =
        [ { trigger = { kind = "on_creature_consumes_object"  -- MISSING VARIANT
                      , cost = { kind = "bonus_action" } }
          , effect =
              { kind = "heal_hp"
              , amount = { kind = "fixed", expr = { dice = 0, flat = 1 } }
              , target = "target_creature"
              }
          }
        ]
    , initialPhase =
        { kind = "direct"
        , attachment = { kind = "self" }
        , effects =
            [ { kind = "create_object"
              , maxSize = "tiny"
              , consumable = True
              }
            ]
        }
    }
}
```

This skeleton is provided for illustration only — it cannot typecheck until `on_creature_consumes_object` is added to `OngoingTrigger`.
