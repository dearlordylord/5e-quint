-- Scholar — SRD 5.2.1 Wizard level 2.
--
-- RAW: "Choose one of the following skills in which you have proficiency:
-- Arcana, History, Investigation, Medicine, Nature, or Religion.
-- You have Expertise in the chosen skill."
--
-- Expertise = double your Proficiency Bonus for checks with that skill.
-- Since the character already has proficiency (+PB), the net mechanical
-- delta is +PB on ability_check rolls with the chosen skill.
--
-- Omission: the "in which you have proficiency" prerequisite constraint
-- cannot be expressed in the current surface — only the 6-option list
-- is encoded; the proficiency pre-requirement is caller-owned build logic.

let wizard_scholar_l2 =
      { kind = "class_feature"
      , id = "wizard_scholar_l2"
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
              [ { kind = "modify_roll_numeric"
                , on = [ "ability_check" ]
                , delta =
                    { kind = "proficiency_bonus"
                    , sign = "+"
                    }
                , skillFilter =
                    { kind = "choice"
                    , options =
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

in  wizard_scholar_l2
