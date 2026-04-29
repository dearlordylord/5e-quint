-- Body and Mind — SRD 5.2.1 Monk level 20.
--
-- RAW:
--   "You have developed your body and mind to new heights. Your
--    Dexterity and Wisdom scores increase by 4, to a maximum of 25."
--
-- Clean fit:
--   • ClassFeatureRecord with PassiveMechanics.
--   • Two modify_ability_score grants, one for Dexterity and one for
--     Wisdom, each capped at 25.

let bodyAndMind =
      { kind = "class_feature"
      , id = "monk_body_and_mind_l20"
      , name = "Body and Mind"
      , className = "monk"
      , acquiredAtLevel = 20
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Monk#Body and Mind"
          }
      , description =
          "You have developed your body and mind to new heights. Your Dexterity and Wisdom scores increase by 4, to a maximum of 25."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "modify_ability_score"
                , ability = "dex"
                , delta = +4
                , maximum = Some 25
                }
              , { kind = "modify_ability_score"
                , ability = "wis"
                , delta = +4
                , maximum = Some 25
                }
              ]
          }
      }

in  bodyAndMind
