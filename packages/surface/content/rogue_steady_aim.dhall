let steadyAim =
      { kind = "class_feature"
      , id = "rogue_steady_aim"
      , name = "Steady Aim"
      , className = "rogue"
      , acquiredAtLevel = 3
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Rogue.md:89-91" }
      , description =
          "As a Bonus Action, you give yourself Advantage on your next attack roll on the current turn. You can use this feature only if you haven't moved during this turn, and after you use it, your Speed is 0 until the end of the current turn."
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
