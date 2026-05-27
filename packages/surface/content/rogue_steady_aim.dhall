let steadyAim =
      { kind = "class_feature"
      , id = "rogue_steady_aim"
      , name = "Steady Aim"
      , className = "rogue"
      , acquiredAtLevel = 3
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Rogue.md:89-91" }
      , description =
          "As a Bonus Action, if you haven't moved during the current turn, you gain Advantage on your next attack roll this turn, and your Speed becomes 0 until the turn ends."
      , mechanics =
          { family = "steady_aim"
          , activationCost = { kind = "bonus_action" }
          , precondition = { kind = "no_movement_this_turn" }
          , attackRoll =
              { mode = "advantage"
              , appliesTo = "next_attack_roll_current_turn"
              }
          , speed = { kind = "set_to_zero", until = "end_of_current_turn" }
          }
      }

in  steadyAim
