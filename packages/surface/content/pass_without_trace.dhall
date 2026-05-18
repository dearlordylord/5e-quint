-- Pass without Trace — SRD 5.2.1 Spell, level 2, Abjuration.
--
-- RAW (Spells / Descriptions M-P / Pass without Trace):
--   "You radiate a concealing aura in a 30-foot Emanation for the
--    duration. While in the aura, you and each creature you choose
--    have a +10 bonus to Dexterity (Stealth) checks and leave no
--    tracks."
--
-- FULL AUTHOR (after §A1 landed). Uses the new `skillFilter` on
-- `RollModifierOperation` to narrow the +10 bonus to Stealth only
-- (previously this unit was DEFERRED on §A1 because encoding
-- `on: ["ability_check"]` without skill narrowing would over-apply
-- to all ability checks).
--
-- Encoded:
--   • family: ongoing_effect
--   • attachment: area { shape = emanation 30, origin = self }
--     (Emanation geometry anchored on caster)
--   • operation: roll_modifier on ability_check with
--     skillFilter=[stealth], delta=+10 flat
--
-- Selection nuance: RAW says "you and each creature you choose" —
-- caster plus a caster-picked subset of creatures within the aura.
-- The content surface models the aura geometry (area + emanation);
-- battle runtime uses a caster-included target-list fill at cast time,
-- with caller/session facts supplying which chosen non-caster creatures
-- are in the aura.
--
-- DM AGENDA. "Leave no tracks" is world-layer / pursuit agenda
-- (§B movement-conversion). Not encoded.

let passWithoutTrace =
      { kind = "spell"
      , id = "pass_without_trace"
      , name = "Pass without Trace"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Pass without Trace"
          }
      , description =
          "You radiate a concealing aura in a 30-foot Emanation for the duration. While in the aura, you and each creature you choose have a +10 bonus to Dexterity (Stealth) checks and leave no tracks."
      , mechanics =
          { family = "ongoing_effect"
          , level = 2
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components =
              { v = True
              , s = True
              , m = Some "ashes from burned mistletoe"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "hour", amount = 1 }
              }
          , attachment =
              { kind = "area"
              , shape = { kind = "emanation", radiusFeet = 30 }
              , origin = { kind = "self" }
              }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect =
                    { kind = "modify_roll_numeric"
                    , on = [ "ability_check" ]
                    , delta =
                        { kind = "fixed_dice"
                        , dice = 10
                        , dieSize = 1
                        , sign = "+"
                        }
                    , skillFilter = { kind = "fixed", skills = [ "stealth" ] }
                    }
                }
              ]
          }
      }

in  passWithoutTrace
