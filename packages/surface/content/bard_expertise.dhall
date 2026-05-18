-- Expertise — SRD 5.2.1 Bard level 2.
--
-- RAW: "You gain Expertise (see "Rules Glossary") in two of your skill
-- proficiencies of your choice. Performance and Persuasion are recommended if
-- you have proficiency in them.
--
-- At Bard level 9, you gain Expertise in two more of your skill proficiencies
-- of your choice."

let expertise =
      { kind = "class_feature"
      , id = "bard_expertise"
      , name = "Expertise"
      , className = "bard"
      , acquiredAtLevel = 2
      , provenance = { kind = "srd-5.2.1", section = "Classes/Bard#Expertise" }
      , description =
          "Gain Expertise in two skill proficiencies of your choice, then two more at Bard level 9."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_expertise"
                , skills = { kind = "owned_skill_proficiencies_without_expertise" }
                , choiceCount =
                    { kind = "class_level_additional_choices"
                    , initial = 2
                    , increases = [ { atLevel = 9, choose = 2 } ]
                    }
                }
              ]
          }
      }

in  expertise
