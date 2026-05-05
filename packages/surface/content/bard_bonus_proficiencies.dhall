-- Bonus Proficiencies (bard L3) — SRD 5.2.1.
--
-- RAW: "You gain proficiency with three skills of your choice."
--
-- Clean fit on the passive class-feature surface:
--   • family = passive
--   • grant_proficiency with a counted choice over the closed SRD skill list

let bonusProficiencies =
      { kind = "class_feature"
      , id = "bard_bonus_proficiencies"
      , name = "Bonus Proficiencies"
      , className = "bard"
      , acquiredAtLevel = 3
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Bard#Bonus Proficiencies"
          }
      , description =
          "You gain proficiency with three skills of your choice."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_proficiency"
                , proficiency =
                    { kind = "choice"
                    , count = 3
                    , options =
                        [ { kind = "skill", skill = "acrobatics" }
                        , { kind = "skill", skill = "animal_handling" }
                        , { kind = "skill", skill = "arcana" }
                        , { kind = "skill", skill = "athletics" }
                        , { kind = "skill", skill = "deception" }
                        , { kind = "skill", skill = "history" }
                        , { kind = "skill", skill = "insight" }
                        , { kind = "skill", skill = "intimidation" }
                        , { kind = "skill", skill = "investigation" }
                        , { kind = "skill", skill = "medicine" }
                        , { kind = "skill", skill = "nature" }
                        , { kind = "skill", skill = "perception" }
                        , { kind = "skill", skill = "performance" }
                        , { kind = "skill", skill = "persuasion" }
                        , { kind = "skill", skill = "religion" }
                        , { kind = "skill", skill = "sleight_of_hand" }
                        , { kind = "skill", skill = "stealth" }
                        , { kind = "skill", skill = "survival" }
                        ]
                    }
                }
              ]
          }
      }

in  bonusProficiencies
