# Proposal: Surface Widenings for Maze

## Unit

**Maze** — SRD 5.2.1, Level 8 Conjuration spell  
Banishes one visible creature to a demiplane for concentration up to 10 minutes. Target may Study to escape (DC 20 Int/Investigation). Returns to original space when spell ends.

## Outcome

`surface_widening` — Three related gaps prevent honest encoding. The `ongoing_effect` family, `transport_exile` atom, and `on_creature_studies` trigger all exist and are correctly applicable; the missing pieces are variants/fields on existing types.

---

## Gap 1 — No DurationEndTrigger for target ability-check success

### Problem

The concentration duration needs an early-end trigger: "target succeeds on DC 20 Int (Investigation) check via Study action." The current `DurationEndTrigger` union covers output-based target actions:

```typescript
export type DurationEndTrigger =
  | { readonly kind: "target_makes_attack_roll" }
  | { readonly kind: "target_deals_damage" }
  | { readonly kind: "target_casts_spell" }
  | { readonly kind: "target_dons_armor" }
  | { readonly kind: "target_damaged_by_caster_or_ally" }
  | { readonly kind: "target_takes_damage" }
  | { readonly kind: "caster_recasts_spell" };
```

None captures a target's resolution-success as a termination trigger. Maze is the first spell with "target passes a check → spell ends" semantics.

### Proposed Widening

Add a new `DurationEndTrigger` variant:

```typescript
| {
    readonly kind: "target_check_success";
    readonly ability: Ability;
    readonly dc: number;
    readonly skill?: Skill;
    readonly via?: "study_action";
  }
```

This would allow the Maze duration to declare:

```dhall
earlyEnd = Some
  [ { kind = "target_check_success"
    , ability = "int"
    , dc = 20
    , skill = Some "investigation"
    , via = Some "study_action"
    }
  ]
```

This variant could also handle other "target escapes by passing a check" mechanics if they arise in future content.

---

## Gap 2 — transport_exile has no returnOnSpellEnd semantics

### Problem

When Maze ends (concentration broken, duration expires, or target escapes), RAW states:

> "When the spell ends, the target reappears in the space it left or, if that space is occupied, in the nearest unoccupied space."

The `transport_exile` atom encodes only the outbound banishment:

```typescript
| {
    readonly kind: "transport_exile";
    readonly destination: ExileDestination;
  }
```

There is no field for the return destination, nor is this behavior captured by the duration lifecycle (which only emits `expire`). The return is a first-class game mechanic — not DM-agenda — and must be representable.

### Proposed Widening

Add an optional `returnOnEnd` field to `transport_exile`:

```typescript
| {
    readonly kind: "transport_exile";
    readonly destination: ExileDestination;
    readonly returnOnEnd?:
      | "original_space"
      | "original_space_or_nearest_unoccupied";
  }
```

`original_space_or_nearest_unoccupied` covers Maze's RAW text. `original_space` may be needed for simpler banishment variants. Omitting the field leaves the current meaning unchanged (no explicit return encoding, for items like Rod of Security where return is player-initiated via a command word).

---

## Gap 3 — ability_check_gate (OngoingEffect) has no skillFilter

### Problem

Maze's escape check is "Intelligence (Investigation)" — a sub-skill of Intelligence. The `OngoingEffect.ability_check_gate` type exposes only `ability: Ability`:

```typescript
| {
    readonly kind: "ability_check_gate";
    readonly ability: Ability;
    readonly dc: DcSource;
    readonly onPass: EffectAtom;
    readonly onFail?: EffectAtom;
  }
```

The `modify_roll_numeric` effect atom already has `skillFilter?: SkillFilter` for narrowing ability-check riders. The same field should be available on `ability_check_gate` (both the `OngoingEffect` and `ActivationPhase` variants).

### Proposed Widening

Add `skillFilter?: SkillFilter` to both `ability_check_gate` variants:

```typescript
// OngoingEffect variant
| {
    readonly kind: "ability_check_gate";
    readonly ability: Ability;
    readonly dc: DcSource;
    readonly skillFilter?: SkillFilter;   // ← new
    readonly onPass: EffectAtom;
    readonly onFail?: EffectAtom;
  }
```

This is additive and backward-compatible. When absent, the check is unnarrowed (any check of the stated ability).

---

## Interaction Between Gaps 1 and 2

Gaps 1 and 2 are related: once Gap 1 is resolved (target check success as DurationEndTrigger), Gap 2 determines what happens when that trigger fires (the creature returns). Both must be addressed for Maze to encode completely.

An alternative encoding strategy would keep the escape check in the `operations` block (using the existing `on_creature_studies` trigger and `ability_check_gate` ongoing effect) and add a new EffectAtom `terminate_host_spell` for the `onPass` slot. This would avoid widening `DurationEndTrigger` but introduces a self-referential effect atom. The `DurationEndTrigger` approach is cleaner and more composable.

## Encoding Sketch (after widenings applied)

```dhall
{ kind = "spell"
, id = "maze"
, name = "Maze"
, provenance = { kind = "srd-5.2.1", section = "Spells/Descriptions-M#Maze" }
, description = "..."
, mechanics =
    { family = "ongoing_effect"
    , level = 8
    , school = "conjuration"
    , castingTime = { kind = "action" }
    , range = { kind = "point", feet = 60 }
    , components = { v = True, s = True, m = False }
    , duration =
        { kind = "concentration"
        , upTo = { unit = "minute", amount = 10 }
        , earlyEnd = Some
            [ { kind = "target_check_success"   -- Gap 1
              , ability = "int"
              , dc = 20
              , skill = Some "investigation"
              , via = Some "study_action"
              }
            ]
        }
    , attachment = { kind = "target", selection = { mode = "one" } }
    , initialPhase =
        Some { kind = "direct"
             , attachment = { kind = "target", selection = { mode = "one" } }
             , effects = Some
                 [ { kind = "transport_exile"
                   , destination = "demiplane"
                   , returnOnEnd = Some "original_space_or_nearest_unoccupied"  -- Gap 2
                   }
                 ]
             }
    , operations =
        [ { trigger = { kind = "on_creature_studies" }
          , effect =
              { kind = "ability_check_gate"
              , ability = "int"
              , dc = { kind = "fixed", dc = 20 }
              , skillFilter = Some { kind = "fixed", skills = [ "investigation" ] }  -- Gap 3
              , onPass = { kind = "none" }  -- moot: early-end handled by DurationEndTrigger
              }
          }
        ]
    }
}
```

Note: With Gap 1 addressed via `DurationEndTrigger`, the `operations` block's `ability_check_gate` becomes redundant — the escape is modeled entirely by the duration's `earlyEnd`. One or the other encoding should be chosen; `DurationEndTrigger` is preferred as it keeps escape semantics in the duration lifecycle where they belong.
