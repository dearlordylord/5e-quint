-- Expeditious Retreat - SRD 5.2.1 Spell, level 1, Transmutation.
--
-- RAW (Spells / Descriptions E-L / Expeditious Retreat):
--   "You take the Dash action, and until the spell ends, you can take
--    that action again as a Bonus Action."
--
-- SURFACE WIDENING REFERENCE (SRDINV45). The initial phase records the
-- immediate Dash action included in the Bonus Action spell effect. The
-- ongoing operation records the Concentration-duration permission to
-- take Dash as a Bonus Action. Dash execution and Movement budget
-- updates remain with the Movement/action runtime owners.

let expeditiousRetreat =
      { kind = "spell"
      , id = "expeditious_retreat"
      , name = "Expeditious Retreat"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Expeditious Retreat"
          }
      , description =
          "You take the Dash action, and until the spell ends, you can take that action again as a Bonus Action."
      , mechanics =
          { family = "ongoing_effect"
          , level = 1
          , school = "transmutation"
          , castingTime = { kind = "bonus_action" }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , attachment = { kind = "self" }
          , initialPhase =
              { kind = "direct"
              , attachment = { kind = "self" }
              , effects =
                  [ { kind = "take_standard_action"
                    , action = "dash"
                    , cost = "included_in_effect"
                    }
                  ]
              }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect =
                    { kind = "grant_alternate_action_cost"
                    , from = { kind = "standard_action", actions = [ "dash" ] }
                    , to = { kind = "bonus_action" }
                    }
                }
              ]
          }
      }

in  expeditiousRetreat
