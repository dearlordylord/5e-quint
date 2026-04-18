-- Ranger Roving — SRD 5.2.1 Ranger level 6.
--
-- RAW (Classes / Ranger / Level 6: Roving):
--   "Your Speed increases by 10 feet while you aren't wearing Heavy armor.
--    You also have a Climb Speed and a Swim Speed equal to your Speed."
--
-- Two independent passive parts encoded as CompositeClassFeatureMechanics:
--   1. Conditional: +10 Speed, gated by not_wearing_armor ["heavy"].
--   2. Unconditional: Climb Speed = Speed, Swim Speed = Speed.
--      Uses existing grant_speed + LinkedSpeed { kind = "walk_speed" }.
--
-- All atoms exist in v4 / surface. Clean composite fit.

let roving =
      { kind = "class_feature"
      , id = "ranger_roving_l6"
      , name = "Roving"
      , className = "ranger"
      , acquiredAtLevel = 6
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Ranger#Roving"
          }
      , description =
          "Your Speed increases by 10 feet while you aren't wearing Heavy armor. You also have a Climb Speed and a Swim Speed equal to your Speed."
      , mechanics =
          { family = "composite"
          , parts =
              [ { family = "passive"
                , condition =
                    Some
                      { kind = "not_wearing_armor"
                      , categories = [ "heavy" ]
                      }
                , grants =
                    [ { kind = "modify_speed"
                      , delta = Some 10
                      , unit = Some "feet"
                      , speedKind = None Text
                      , feet = None { kind : Text }
                      }
                    ]
                }
              , { family = "passive"
                , condition =
                    None { kind : Text, categories : List Text }
                , grants =
                    [ { kind = "grant_speed"
                      , delta = None Natural
                      , unit = None Text
                      , speedKind = Some "climb"
                      , feet = Some { kind = "walk_speed" }
                      }
                    , { kind = "grant_speed"
                      , delta = None Natural
                      , unit = None Text
                      , speedKind = Some "swim"
                      , feet = Some { kind = "walk_speed" }
                      }
                    ]
                }
              ]
          }
      }

in  roving
