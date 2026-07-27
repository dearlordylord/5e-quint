-- Expertise — SRD 5.2.1 Ranger level 9.
--
-- RAW (Classes / Ranger / Level 9: Expertise):
--   "Choose two of your skill proficiencies with which you lack Expertise.
--    You gain Expertise in those skills."

let expertise =
      { kind = "class_feature"
      , id = "ranger_expertise"
      , name = "Expertise"
      , className = "ranger"
      , acquiredAtLevel = 9
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Ranger.md:118-120" }

      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_expertise"
                , choiceCount =
                    { kind = "class_level_total_choices"
                    , levels = [ { atLevel = 9, total = 2 } ]
                    }
                , skills = { kind = "owned_skill_proficiencies_without_expertise" }
                }
              ]
          }
      }

in  expertise
