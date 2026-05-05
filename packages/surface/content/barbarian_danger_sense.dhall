-- Danger Sense — SRD 5.2.1 Barbarian level 2.
--
-- RAW:
--   "You have Advantage on Dexterity saving throws unless you have the
--    Incapacitated condition."
--
-- Clean fit:
--   • ClassFeatureRecord with PassiveMechanics.
--   • Passive suppressor keyed to Incapacitated.
--   • modify_roll_advantage narrowed to saving throws with
--     saveAbilityFilter = [ "dex" ].

let dangerSense =
      { kind = "class_feature"
      , id = "barbarian_danger_sense"
      , name = "Danger Sense"
      , className = "barbarian"
      , acquiredAtLevel = 2
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Barbarian#Danger Sense"
          }
      , description =
          "You gain an uncanny sense of when things aren't as they should be, giving you an edge when you dodge perils. You have Advantage on Dexterity saving throws unless you have the Incapacitated condition."
      , mechanics =
          { family = "passive"
          , suppressedBy =
              [ { kind = "condition_active"
                , conditions = [ "incapacitated" ]
                }
              ]
          , grants =
              [ { kind = "modify_roll_advantage"
                , mode = "advantage"
                , on = [ "saving_throw" ]
                , saveAbilityFilter = [ "dex" ]
                }
              ]
          }
      }

in  dangerSense
