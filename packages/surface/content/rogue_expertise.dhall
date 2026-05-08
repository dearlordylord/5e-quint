let expertise =
      { kind = "class_feature"
      , id = "rogue_expertise"
      , name = "Expertise"
      , className = "rogue"
      , acquiredAtLevel = 1
      , provenance = { kind = "srd-5.2.1", section = "Classes/Rogue#Expertise" }
      , description =
          "Gain Expertise in two skill proficiencies of your choice, then two more at Rogue level 6."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_expertise"
                , skills = { kind = "owned_skill_proficiencies_without_expertise" }
                , choiceCount =
                    { kind = "class_level_additional_choices"
                    , initial = 2
                    , increases = [ { atLevel = 6, choose = 2 } ]
                    }
                }
              ]
          }
      }

in  expertise
