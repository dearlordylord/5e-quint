-- Scholar — SRD 5.2.1 Wizard level 2.
--
-- RAW: "Choose one of the following skills in which you have proficiency:
-- Arcana, History, Investigation, Medicine, Nature, or Religion.
-- You have Expertise in the chosen skill."

let wizard_scholar =
      { kind = "class_feature"
      , id = "wizard_scholar"
      , name = "Scholar"
      , className = "wizard"
      , acquiredAtLevel = 2
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Wizard#Scholar"
          }
      , description =
          "While studying magic, you also specialized in another field of study. Choose one of the following skills in which you have proficiency: Arcana, History, Investigation, Medicine, Nature, or Religion. You have Expertise in the chosen skill."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_expertise"
                , choiceCount =
                    { kind = "class_level_total_choices"
                    , levels = [ { atLevel = 2, total = 1 } ]
                    }
                , skills =
                    { kind = "listed_owned_skill_proficiencies_without_expertise"
                    , skills =
                        [ "arcana"
                        , "history"
                        , "investigation"
                        , "medicine"
                        , "nature"
                        , "religion"
                        ]
                    }
                }
              ]
          }
      }

in  wizard_scholar
