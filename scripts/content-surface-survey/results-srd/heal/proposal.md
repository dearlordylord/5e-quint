# Proposal: Surface Widening for `Heal`

## Unit

- **Name:** Heal
- **Kind:** spell
- **Level:** 6 (Abjuration)
- **Provenance:** SRD 5.2.1

## Outcome

`surface_widening` — The `activation` family exists and would be the correct home for this
spell, but three surface shapes are missing. No new v4 atoms are needed.

---

## Gap 1 — `ActivationPhase` lacks an unconditional variant

**Current state:** `ActivationPhase` is a discriminated union with two members:

```typescript
| { readonly kind: "attack_roll"; ... }
| { readonly kind: "save_gate"; ... }
```

Both require a resolution gate. Heal delivers its effect unconditionally — no roll, no save.

**Proposed addition:**

```typescript
| {
    readonly kind: "unconditional";
    readonly attachment: Attachment;
    readonly onApply: Effect;
  }
```

This covers all spells whose effect fires on cast without a prior roll (Heal, Cure Wounds,
Healing Word, Power Word Heal, Revivify, etc.). The `onApply` field uses the widened `Effect`
union (see Gap 2).

---

## Gap 2 — `HealHpEffect` not in spell `Effect` union

**Current state:** The spell `Effect` type is:

```typescript
export type Effect = DamageEffect | NoneEffect;
```

`HealHpEffect` exists only as a `ClassFeatureEffect`:

```typescript
export type HealHpEffect = {
  readonly kind: "heal_hp";
  readonly amount: DiceAmount;
  readonly target: "self" | "target_creature";
};
```

**Proposed addition:** Promote `HealHpEffect` into the `Effect` union (or alias it there):

```typescript
export type Effect = DamageEffect | HealHpEffect | NoneEffect;
```

No structural change to `HealHpEffect` itself is needed. The `amount: DiceAmount` field already
supports fixed, threshold_tiers, and linear_per_level shapes, covering Heal's base-70 + slot
scaling.

---

## Gap 3 — No `RemoveConditionEffect` in spell `Effect` union

**Current state:** The v4 atom `remove_condition` is in the taxonomy but has no surface type
in spell mechanics. Heal removes Blinded, Deafened, and Poisoned.

**Proposed addition:**

```typescript
export type RemoveConditionEffect = {
  readonly kind: "remove_condition";
  readonly conditions: ReadonlyArray<Condition>;
};
```

And widen `Condition` (currently `"prone"` only) to include at minimum:
`"blinded" | "deafened" | "poisoned" | "prone"`.

Then add to `Effect`:

```typescript
export type Effect = DamageEffect | HealHpEffect | RemoveConditionEffect | NoneEffect;
```

---

## Gap 4 (minor) — Flat-only amounts in `DiceExpr`

Heal's base amount is 70 flat HP — no dice. `DiceExpr` requires `dice` and `dieSize`:

```typescript
export type DiceExpr = { readonly dice: number; readonly dieSize: number; readonly flat?: number };
```

A flat-only amount is representable as `{ dice: 0, dieSize: 0, flat: 70 }` but is semantically
odd. A dedicated `FlatAmount` kind in `DiceAmount` would be cleaner:

```typescript
| { readonly kind: "flat"; readonly value: number }
```

This is lower priority — the `{ dice: 0, dieSize: 0, flat: N }` workaround typechecks and the
tracer already handles the `fixed` kind.

---

## Proposed `heal.dhall` (draft, pending surface widening)

```dhall
let heal =
      { kind = "spell"
      , id = "heal"
      , name = "Heal"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-H#Heal"
          }
      , description =
          "Choose a creature that you can see within range. Positive energy washes through the target, restoring 70 Hit Points. This spell also ends the Blinded, Deafened, and Poisoned conditions on the target. Using a Higher-Level Spell Slot: The healing increases by 10 for each spell slot level above 6."
      , mechanics =
          { family = "activation"
          , level = 6
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "unconditional"           -- MISSING VARIANT
                , attachment =
                    { kind = "target"
                    , selection = { mode = "one" }
                    }
                , onApply =
                    -- Multiple effects: heal_hp AND remove_condition.
                    -- Needs either a composite effect type or both variants in Effect.
                    { kind = "heal_hp"              -- MISSING IN spell Effect
                    , amount =
                        { kind = "linear_per_level"
                        , axis = "slot"
                        , base = { dice = 0, dieSize = 0, flat = 70 }
                        , perLevel = { flat = 10 }
                        , startingAtLevel = 6
                        }
                    , target = "target_creature"
                    }
                }
              -- remove_condition phase would also be needed (or combined with heal_hp)
              ]
          }
      }

in  heal
```

Note: the draft above shows the shape after widening but cannot be compiled today. An additional
design question: should a single `unconditional` phase carry one effect, or should `onApply` be
`ReadonlyArray<Effect>` to allow Heal's combined heal + condition-removal in one phase?

---

## Summary of proposed surface changes

| Change | Kind | Priority |
|---|---|---|
| `ActivationPhase { kind: "unconditional" }` | new_variant | high |
| `HealHpEffect` in spell `Effect` union | new_variant | high |
| `RemoveConditionEffect` in spell `Effect` union | new_variant | high |
| Widen `Condition` to include blinded/deafened/poisoned | new_variant | high |
| `FlatAmount` in `DiceAmount` | new_variant | low |
| `onApply: ReadonlyArray<Effect>` vs single effect | design question | medium |
