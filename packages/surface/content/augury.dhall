-- Augury - SRD 5.2.1 Spell, level 2, Divination.
--
-- RAW (Spells/Descriptions-A-D#Augury):
--   "You receive an omen from an otherworldly entity about the results
--    of a course of action that you plan to take within the next 30
--    minutes. The GM chooses the omen from the Omens table."
--   Omens are Weal for good results, Woe for bad results, Weal and woe
--   for good and bad results, and Indifference for neither good nor bad.
--   "The spell doesn't account for circumstances, such as other spells,
--    that might change the results."
--   "If you cast the spell more than once before finishing a Long Rest,
--    there is a cumulative 25 percent chance for each casting after the
--    first that you get no answer."
--
-- The Surface record owns the Spell Definition and the source facts for
-- the closed omen table. Future-outcome adjudication, changed
-- circumstances, and repeated-casting no-answer resolution are table/session
-- knowledge facts outside promoted battle runtime.

let augury =
      { kind = "spell"
      , id = "augury"
      , name = "Augury"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Augury"
          }
      , description =
          "You receive an omen from an otherworldly entity about the results of a course of action that you plan to take within the next 30 minutes. The GM chooses the omen from the Omens table: Weal for good results, Woe for bad results, Weal and woe for good and bad results, or Indifference for neither good nor bad. The spell doesn't account for circumstances, such as other spells, that might change the results. If you cast the spell more than once before finishing a Long Rest, there is a cumulative 25 percent chance for each casting after the first that you get no answer."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "divination"
          , castingTime =
              { kind = "minutes", amount = 1, ritual = True }
          , range = { kind = "self" }
          , components =
              { v = True
              , s = True
              , m =
                  Some
                    "specially marked sticks, bones, cards, or other divinatory tokens worth 25+ GP"
              , materialCostGp = 25
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "divination_omen"
                      , source = "otherworldly_entity"
                      , subject =
                          { kind = "planned_course_of_action"
                          , plannedWithinMinutes = 30
                          }
                      , adjudication =
                          { kind = "gm_chosen_omen_table"
                          , table =
                              { good = "weal"
                              , bad = "woe"
                              , goodAndBad = "weal_and_woe"
                              , neitherGoodNorBad = "indifference"
                              }
                          }
                      , changedCircumstances = "not_accounted_for"
                      , repeatCasting =
                          { resetBy = "long_rest"
                          , noAnswerChance =
                              { kind =
                                  "cumulative_percent_per_cast_after_first"
                              , percent = 25
                              , result = "no_answer"
                              }
                          }
                      }
                    ]
                }
              ]
          }
      }

in  augury
