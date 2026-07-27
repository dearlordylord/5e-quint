-- Acrobatic Movement — SRD 5.2.1 Monk level 9.
--
-- RAW (Classes / Monk / Level 9: Acrobatic Movement):
--   While you aren't wearing armor or wielding a Shield, you can move
--   along vertical surfaces and across liquids on your turn without
--   falling during the movement.

let Predicate : Type = { kind : Text, categories : Optional (List Text) }

let acrobaticMovement =
      { kind = "class_feature"
      , id = "monk_acrobatic_movement"
      , name = "Acrobatic Movement"
      , className = "monk"
      , acquiredAtLevel = 9
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Monk.md:138-140" }

      , mechanics =
          { family = "acrobatic_movement"
          , condition =
              { kind = "all_of"
              , predicates =
                [ { kind = "not_wearing_armor"
                  , categories = Some [ "light", "medium", "heavy" ]
                  }
                , { kind = "not_wielding_shield"
                  , categories = None (List Text)
                  }
                ] : List Predicate
              }
          , movement =
              { timing = "on_your_turn"
              , verticalSurfaces =
                  { path = "along_vertical_surfaces"
                  , withoutFallingDuringMovement = True
                  }
              , liquids =
                  { path = "across_liquids"
                  , withoutFallingDuringMovement = True
                  }
              }
          }
      }

in  acrobaticMovement
