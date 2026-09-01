-- Pass without Trace — SRD 5.2.1 Spell, level 2, Abjuration.
--
-- RAW (Spells / Descriptions M-P / Pass without Trace):
--   "You radiate a concealing aura in a 30-foot Emanation for the
--    duration. While in the aura, you and each creature you choose
--    have a +10 bonus to Dexterity (Stealth) checks and leave no
--    tracks."
--
-- Encoded:
--   • family: ongoing_effect
--   • attachment: area { shape = emanation 30, origin = self }
--     (Emanation geometry anchored on caster)
--   • passive operation: roll_modifier on ability_check with
--     skillFilter=[stealth], delta=+10 flat
--   • passive operation: suppress_movement_trace
--
-- Selection nuance: RAW says "you and each creature you choose" —
-- caster plus a caster-picked subset of creatures within the aura.
-- The content surface models the aura geometry (area + emanation);
-- battle runtime uses a caster-included target-list fill at cast time,
-- with caller/session facts supplying which chosen non-caster creatures
-- are in the aura.
--
-- `suppress_movement_trace` retains the authored exploration fact without
-- inventing pursuit state or Battle execution. Its consumer remains the
-- exploration/tracking owner.
let FixedDiceDelta
    : Type
    = { kind : Text, dice : Natural, dieSize : Natural, sign : Text }

let FixedSkillFilter
    : Type
    = { kind : Text, skills : List Text }

let OperationEffect
    : Type
    = { kind : Text
      , on : Optional (List Text)
      , delta : Optional FixedDiceDelta
      , skillFilter : Optional FixedSkillFilter
      }

let numericStealthBonus
    : OperationEffect
    = { kind = "modify_roll_numeric"
      , on = Some [ "ability_check" ]
      , delta = Some { kind = "fixed_dice", dice = 10, dieSize = 1, sign = "+" }
      , skillFilter = Some { kind = "fixed", skills = [ "stealth" ] }
      }

let movementTraceSuppression
    : OperationEffect
    = { kind = "suppress_movement_trace"
      , on = None (List Text)
      , delta = None FixedDiceDelta
      , skillFilter = None FixedSkillFilter
      }

let passWithoutTrace =
      { kind = "spell"
      , id = "pass_without_trace"
      , name = "Pass without Trace"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "Spells/Descriptions-M-P#Pass without Trace"
        }
      , mechanics =
        { family = "ongoing_effect"
        , level = 2
        , school = "abjuration"
        , castingTime.kind = "action"
        , range.kind = "self"
        , components =
          { v = True, s = True, m = Some "ashes from burned mistletoe" }
        , duration =
          { kind = "concentration", upTo = { unit = "hour", amount = 1 } }
        , attachment =
          { kind = "area"
          , shape = { kind = "emanation", radiusFeet = 30 }
          , origin.kind = "self"
          }
        , operations =
          [ { trigger.kind = "passive", effect = numericStealthBonus }
          , { trigger.kind = "passive", effect = movementTraceSuppression }
          ]
        }
      }

in  passWithoutTrace
