-- Blur — SRD 5.2.1 Spell, level 2, Illusion.
--
-- RAW (Spells / Descriptions A-D / Blur):
--   "Your body becomes blurred. For the duration, any creature has
--    Disadvantage on attack rolls against you. An attacker is immune
--    to this effect if it perceives you with Blindsight or Truesight."
--
-- ZERO-WIDENING VALIDATION REFERENCE. Uses modify_roll_advantage
-- with no attackerTypeFilter — any attacker targeting the caster
-- gets disadvantage. Contrasts with Protection from Evil and Good
-- which uses the same atom with a creature-type filter.
--
-- The Blindsight/Truesight immunity is DM agenda — the session
-- resolves whether the attacker has a sense that pierces the blur.
-- Omitted per ARCHITECTURE.md §1.

let blur =
      { kind = "spell"
      , id = "blur"
      , name = "Blur"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Blur"
          }
      , description =
          "Your body becomes blurred. For the duration, any creature has Disadvantage on attack rolls against you. An attacker is immune to this effect if it perceives you with Blindsight or Truesight."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "illusion"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components = { v = True, s = False, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "modify_roll_advantage"
                      , mode = "disadvantage"
                      , on = [ "attack_roll" ]
                      }
                    ]
                }
              ]
          }
      }

in  blur
