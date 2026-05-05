-- Primal Champion — SRD 5.2.1 Barbarian level 20.
--
-- RAW:
--   "You embody primal power. Your Strength and Constitution scores
--    increase by 4, to a maximum of 25."
--
-- Clean fit:
--   • ClassFeatureRecord with PassiveMechanics.
--   • Two modify_ability_score grants, one for Strength and one for
--     Constitution, each capped at 25.

let primalChampion =
      { kind = "class_feature"
      , id = "barbarian_primal_champion"
      , name = "Primal Champion"
      , className = "barbarian"
      , acquiredAtLevel = 20
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Barbarian#Primal Champion"
          }
      , description =
          "You embody primal power. Your Strength and Constitution scores increase by 4, to a maximum of 25."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "modify_ability_score"
                , ability = "str"
                , delta = +4
                , maximum = Some 25
                }
              , { kind = "modify_ability_score"
                , ability = "con"
                , delta = +4
                , maximum = Some 25
                }
              ]
          }
      }

in  primalChampion
