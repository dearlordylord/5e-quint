-- Cunning Action — SRD 5.2.1 Rogue level 2.
--
-- RAW (Classes / Rogue / Level 2: Cunning Action):
-- On your turn, you can take Dash, Disengage, or Hide as a Bonus Action.

let rogueCunningAction =
      { acquiredAtLevel = 2
      , className = "rogue"
      , description =
          "On your turn, you can take the Dash, Disengage, or Hide action as a Bonus Action."
      , id = "rogue_cunning_action"
      , kind = "class_feature"
      , mechanics =
        { family = "alternate_action_cost"
        , from =
          { kind = "standard_action"
          , actions = [ "dash", "disengage", "hide" ]
          }
        , to = { kind = "bonus_action" }
        }
      , name = "Cunning Action"
      , provenance =
        { kind = "srd-5.2.1", section = "Classes/Rogue.md:81-83" }
      }

in  rogueCunningAction
