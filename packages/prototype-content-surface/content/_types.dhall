-- Shared Dhall types for authored content/*.dhall files.
--
-- Purpose: Dhall's strict homogeneous-list typing rejects lists whose
-- elements have different record shapes (e.g., an ActivationPhase list
-- with an attack_roll phase next to a save_gate phase). Superset
-- records here carry every variant-specific field as Optional; content
-- files construct values by merging overrides into the default, so
-- every list element has the same Dhall type.
--
-- `dhall-to-json --omit-empty` drops None fields at serialization, so
-- the emitted JSON matches the compact `{kind, ...used-fields}` shape
-- the tracer expects. Grow this file as new heterogeneous cases
-- surface; keep it minimal — only add fields currently authored.

let DiceExpr : Type = { dice : Natural, dieSize : Natural }

let DiceExprDelta : Type = { dice : Natural, dieSize : Optional Natural }

let DiceAmount : Type =
      { kind : Text
      , expr : Optional DiceExpr
      , axis : Optional Text
      , base : Optional DiceExpr
      , perLevel : Optional DiceExprDelta
      , startingAtLevel : Optional Natural
      , abilityModifier : Optional Text
      }

let defaultDiceAmount : DiceAmount =
      { kind = ""
      , expr = None DiceExpr
      , axis = None Text
      , base = None DiceExpr
      , perLevel = None DiceExprDelta
      , startingAtLevel = None Natural
      , abilityModifier = None Text
      }

let Effect : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional DiceAmount
      }

let defaultEffect : Effect =
      { kind = ""
      , damageType = None Text
      , amount = None DiceAmount
      }

let Trigger : Type =
      { kind : Text
      , perFeet : Optional Natural
      }

let defaultTrigger : Trigger =
      { kind = ""
      , perFeet = None Natural
      }

-- Attachment superset. Fields used:
--   target: selection
--   area: shape, origin
--   mark: selection
--   object: count
--   hole: holeId, label, value (carries an inner AttachmentValue)
let AreaShape : Type =
      { kind : Text
      , radiusFeet : Optional Natural
      , sideFeet : Optional Natural
      , lengthFeet : Optional Natural
      }

let defaultAreaShape : AreaShape =
      { kind = ""
      , radiusFeet = None Natural
      , sideFeet = None Natural
      , lengthFeet = None Natural
      }

-- AttachmentValue is the inner record when an attachment is wrapped in
-- a hole. Same field shape as the non-hole attachment; the difference
-- is purely whether it sits at the top level or nested under `value`.
let AttachmentValue : Type =
      { kind : Text
      , selection : Optional { mode : Text }
      , shape : Optional AreaShape
      , origin : Optional { kind : Text }
      , count : Optional Natural
      }

let defaultAttachmentValue : AttachmentValue =
      { kind = ""
      , selection = None { mode : Text }
      , shape = None AreaShape
      , origin = None { kind : Text }
      , count = None Natural
      }

let Attachment : Type =
      { kind : Text
      , holeId : Optional Text
      , label : Optional Text
      , value : Optional AttachmentValue
      , selection : Optional { mode : Text }
      , shape : Optional AreaShape
      , origin : Optional { kind : Text }
      , count : Optional Natural
      }

let defaultAttachment : Attachment =
      { kind = ""
      , holeId = None Text
      , label = None Text
      , value = None AttachmentValue
      , selection = None { mode : Text }
      , shape = None AreaShape
      , origin = None { kind : Text }
      , count = None Natural
      }

let DcSource : Type = { kind : Text, dc : Optional Natural }

-- ActivationPhase superset — covers attack_roll, save_gate,
-- ability_check_gate, direct phase kinds.
let Phase : Type =
      { kind : Text
      , attachment : Optional Attachment
      , attackKind : Optional Text
      , ability : Optional Text
      , dc : Optional DcSource
      , onHit : Optional (List Effect)
      , onMiss : Optional (List Effect)
      , onFail : Optional Effect
      , onSuccess : Optional Effect
      , onPass : Optional Effect
      , effects : Optional (List Effect)
      }

let defaultPhase : Phase =
      { kind = ""
      , attachment = None Attachment
      , attackKind = None Text
      , ability = None Text
      , dc = None DcSource
      , onHit = None (List Effect)
      , onMiss = None (List Effect)
      , onFail = None Effect
      , onSuccess = None Effect
      , onPass = None Effect
      , effects = None (List Effect)
      }

in  { DiceExpr
    , DiceExprDelta
    , DiceAmount
    , defaultDiceAmount
    , Effect
    , defaultEffect
    , Trigger
    , defaultTrigger
    , AreaShape
    , defaultAreaShape
    , AttachmentValue
    , defaultAttachmentValue
    , Attachment
    , defaultAttachment
    , DcSource
    , Phase
    , defaultPhase
    }
