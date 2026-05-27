let OpenHandChoice : Type =
      { id : Text
      , effect : Optional { kind : Text, expires : Text }
      , save : Optional { ability : Text }
      , onFail :
          Optional
            { kind : Text, distanceFeet : Optional Natural, condition : Optional Text }
      }

let openHandTechnique =
      { kind = "class_feature"
      , id = "monk_open_hand_technique"
      , name = "Open Hand Technique"
      , className = "monk"
      , acquiredAtLevel = 3
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Monk.md:192-202" }
      , description =
          "Whenever you hit a creature with an attack granted by Flurry of Blows, you can Addle, Push, or Topple the target."
      , mechanics =
          { family = "open_hand_technique"
          , trigger =
              { kind = "hit_with_attack_granted_by"
              , resourceOptionUnitId = "monk_monks_focus"
              , optionId = "flurry_of_blows"
              }
          , optional = True
          , effectSaveDc =
              { kind = "class_feature_ability_save_dc"
              , base = 8
              , ability = "wis"
              }
          , choices =
            [ { id = "addle"
              , effect =
                  Some
                    { kind = "deny_opportunity_attacks"
                    , expires = "start_of_target_next_turn"
                    }
              , save = None { ability : Text }
              , onFail =
                  None
                    { kind : Text, distanceFeet : Optional Natural, condition : Optional Text }
              }
            , { id = "push"
              , effect = None { kind : Text, expires : Text }
              , save = Some { ability = "str" }
              , onFail =
                  Some
                    { kind = "push_away"
                    , distanceFeet = Some 15
                    , condition = None Text
                    }
              }
            , { id = "topple"
              , effect = None { kind : Text, expires : Text }
              , save = Some { ability = "dex" }
              , onFail =
                  Some
                    { kind = "apply_condition"
                    , distanceFeet = None Natural
                    , condition = Some "prone"
                    }
              }
            ] : List OpenHandChoice
          }
      }

in  openHandTechnique
