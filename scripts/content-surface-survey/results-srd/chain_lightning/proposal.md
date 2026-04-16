# Proposal: Chain Lightning surface widening

## Unit

Chain Lightning — SRD 5.2.1, level 6 evocation, `activation` family, instantaneous.

## What fits

- Family: `activation` with `save_gate` phase — exists.
- Effect atoms: `damage` (10d8 lightning), `save_gate` (DEX) — both in v4 and in `EffectAtom`.
- Resources: `spell_slot` (level 6) — exists.
- Scaling: per-slot secondary target count growth — maps to `scale_target_count` (v4) via `SlotScaling<number>`.
- Save DC: `caster_spell_save_dc` — exists.

## What is missing

### Gap: `TargetSelection` has no chain/proximity-constrained variant

Chain Lightning has a **two-tier targeting structure**:

1. **Primary target** — one creature or object the caster can see within 150 ft.
2. **Secondary targets** — up to 3 creatures or objects (scaled per slot), each of which **must be within 30 ft of the primary target**.

All targets (primary + secondaries) take the same effect simultaneously: DEX save, 10d8 lightning on fail, half on success.

Current `TargetSelection`:

```typescript
export type TargetSelection =
  | { readonly mode: "one" }
  | { readonly mode: "choose_up_to"; readonly count: SlotScaling<number> };
```

Neither variant can express:
- A designated primary target at full spell range
- Secondary targets whose eligibility is spatially constrained relative to the primary

### Why two sequential `save_gate` phases don't work

One might attempt encoding as:
- Phase 1: `save_gate` with `{ kind: "target", selection: { mode: "one" } }` — primary
- Phase 2: `save_gate` with `{ kind: "target", selection: { mode: "choose_up_to", ... } }` — secondaries

This is dishonest for two reasons:
1. The `branches_on_completion` edge between phases implies phase 2 depends on phase 1 resolving first. Chain Lightning applies to all targets simultaneously — the primary's save result does not gate the secondaries.
2. The 30 ft proximity constraint (secondaries must be within 30 ft of the primary) is completely lost.

## Proposed widening

Add a `chain` mode to `TargetSelection`:

```typescript
export type TargetSelection =
  | { readonly mode: "one" }
  | { readonly mode: "choose_up_to"; readonly count: SlotScaling<number> }
  | {
      readonly mode: "chain";
      readonly secondary: {
        readonly count: SlotScaling<number>;
        readonly withinFeetOfPrimary: number;
      };
    };
```

The `chain` mode implies:
- Exactly one primary target (at the spell's full range, chosen by the caster).
- Up to `secondary.count` secondary targets, each within `secondary.withinFeetOfPrimary` feet of the primary.
- All targets (primary + secondaries) are included in the same resolution gate (save or attack roll).

### Chain Lightning encoding (once chain mode exists)

```dhall
{ family = "activation"
, level = 6
, school = "evocation"
, castingTime = { kind = "action" }
, range = { kind = "point", feet = 150 }
, components = { v = True, s = True, m = Some "three silver pins" }
, duration = { kind = "instantaneous" }
, phases =
    [ { kind = "save_gate"
      , attachment =
          { kind = "target"
          , selection =
              { mode = "chain"
              , secondary =
                  { count =
                      { kind = "linear"
                      , base = 3
                      , perSlotAboveBase = 1
                      , baseLevel = 6
                      }
                  , withinFeetOfPrimary = 30
                  }
              }
          }
      , ability = "dex"
      , dc = { kind = "caster_spell_save_dc" }
      , onFail =
          { kind = "damage"
          , damageType = "lightning"
          , amount = { kind = "fixed", expr = { dice = 10, dieSize = 8 } }
          }
      , onSuccess =
          { kind = "damage"
          , damageType = "lightning"
          , amount = { kind = "fixed", expr = { dice = 5, dieSize = 8 } }
          }
      }
    ]
}
```

Note: the half-damage on success would itself require `DiceAmount` to express "half of 10d8" — either as `{ dice = 5, dieSize = 8 }` (approximate) or as a new `half_of_fail` sentinel. For the purposes of this proposal, the structural gap in `TargetSelection` is the primary issue.

## Taxonomy classification

This is **`surface_widening`**: the v4 taxonomy's `target` attachment atom is sufficient — the concept is still "the spell attaches to chosen creatures." No new v4 atom is needed. The gap is exclusively in the TS surface type `TargetSelection`, which lacks a shape to express proximity-constrained secondary target selection.

## Other spells that would use this shape

This pattern recurs in SRD spells such as:
- **Scorching Ray** (3 independent rays, same target or different — though no proximity constraint there)
- **Prismatic Spray** — independent targets, similar multi-bolt shape

The `chain` variant is specifically motivated by the "leap from primary to nearby secondaries" mechanic.
