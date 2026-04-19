-- Shared Dhall types for authored content/*.dhall files.
--
-- Purpose: Dhall's strict homogeneous-list typing rejects a
-- `List { effect : { ... } }` when the effect records have different
-- fields. To author ongoing operations that mix effect variants (e.g.,
-- Spike Growth's `area_is_difficult_terrain` passive + `damage` per-foot
-- trigger), each effect record must be the same Dhall type — a superset
-- with all variant-specific fields marked Optional.
--
-- `dhall-to-json --omit-empty` drops `None` fields at JSON generation
-- time, so the output JSON matches the compact `{kind, ...used-fields}`
-- shape the tracer expects.
--
-- This file is a scaffold: it grows as authored content surfaces new
-- heterogeneous-list requirements. Do NOT preemptively add every
-- EffectAtom variant's fields here — only add what authored content
-- actually needs. `_types.dhall` vs `types.dhall`: underscore prefix
-- so tools that enumerate content/*.dhall can skip it by pattern.

let DiceExpr : Type = { dice : Natural, dieSize : Natural }

let DiceAmountFixed : Type =
      { kind : Text, expr : DiceExpr }

let Effect : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional DiceAmountFixed
      }

let defaultEffect : Effect =
      { kind = ""
      , damageType = None Text
      , amount = None DiceAmountFixed
      }

let Trigger : Type =
      { kind : Text
      , perFeet : Optional Natural
      }

let defaultTrigger : Trigger =
      { kind = ""
      , perFeet = None Natural
      }

in  { Effect
    , defaultEffect
    , Trigger
    , defaultTrigger
    , DiceExpr
    , DiceAmountFixed
    }
