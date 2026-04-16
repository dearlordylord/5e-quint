# Widening Proposal: False Life

**Unit:** False Life (spell, srd-5.2.1, level 1, Necromancy)  
**Outcome:** `atom_widening`

## Rule text

> You gain 2d4 + 4 Temporary Hit Points.
> Using a Higher-Level Spell Slot: You gain 5 additional Temporary Hit Points for each spell slot level above 1.

Cast time: Action. Range: Self. Duration: Instantaneous. Components: V, S, M (a drop of alcohol).

## Why encoding fails

### 1. Missing v4 atom: `grant_temporary_hp`

Temporary Hit Points (THP) are mechanically distinct from healing:

- They form a **separate pool** that is consumed first.
- They do **not** trigger on-heal riders or interact with healing immunity.
- They **can exceed** the creature's maximum HP.
- They do not add to HP recovered (a creature at full HP still benefits from THP).

The v4 atom `heal` is explicitly for HP restoration. Using it for THP would produce a dishonest trace — the engine would treat THP grants and healing as the same mechanic, which they are not.

No atom in v4 covers THP grants. This is the root gap.

### 2. Missing surface variant: `Effect.grant_temporary_hp`

The spell `Effect` union is `DamageEffect | NoneEffect`. There is no variant for THP. A new surface type is needed:

```typescript
export type GrantTemporaryHpEffect = {
  readonly kind: "grant_temporary_hp";
  readonly amount: DiceAmount;
  readonly target: "self" | "target_creature";
};
```

The upcast scaling (+5 flat per slot above 1) is fully representable with the existing `DiceAmount.linear_per_level`:

```typescript
amount = {
  kind: "linear_per_level",
  axis: "slot",
  base: { dice: 2, dieSize: 4, flat: 4 },
  perLevel: { flat: 5 },
  startingAtLevel: 2
}
```

No new scaling shape is needed — only the effect type.

### 3. Missing surface variant: `ActivationPhase.direct_apply`

False Life has no attack roll and no saving throw. The current `ActivationPhase` union only supports `attack_roll` and `save_gate`. Neither applies here — the effect fires unconditionally on cast.

A new phase kind is needed for spells that resolve without a contested roll:

```typescript
{
  readonly kind: "direct_apply";
  readonly attachment: Attachment;
  readonly effect: Effect;
}
```

This shape recurs in other instantaneous self-buffs (e.g., Heroism, Barkskin in some readings, Aid). It is a pressure point that will reappear.

## Classification rationale

`atom_widening` rather than `surface_widening` because:

- The missing v4 atom `grant_temporary_hp` is the deepest gap. The surface type variants are downstream of admitting the atom.
- Per the guardrails: use `atom_widening` when the missing concept is not in the v4 taxonomy.

## Encoding shape (once widening is admitted)

```dhall
{ kind = "spell"
, id = "false_life"
, name = "False Life"
, provenance = { kind = "srd-5.2.1", section = "Spells/Descriptions-E-H#False Life" }
, description = "..."
, mechanics =
    { family = "activation"
    , level = 1
    , school = "necromancy"
    , castingTime = { kind = "action" }
    , range = { kind = "self" }
    , components = { v = True, s = True, m = Some "a drop of alcohol" }
    , duration = { kind = "instantaneous" }
    , phases =
        [ { kind = "direct_apply"               -- NEW phase kind
          , attachment = { kind = "self" }
          , effect =
              { kind = "grant_temporary_hp"     -- NEW effect kind
              , amount =
                  { kind = "linear_per_level"
                  , axis = "slot"
                  , base = { dice = 2, dieSize = 4, flat = 4 }
                  , perLevel = { flat = 5 }
                  , startingAtLevel = 2
                  }
              , target = "self"
              }
          }
        ]
    }
}
```

## Atoms this encoding would emit (once admitted)

| Atom | Category | Notes |
|---|---|---|
| `spell_root` | source | existing |
| `activate` | procedure | existing |
| `action_quota` | resource | existing |
| `spell_slot` | resource | existing |
| `self` | attachment | existing |
| `grant_temporary_hp` | effect | **NEW** |
| `scale_numeric_bonus` | scaling | existing (flat scaling) |
