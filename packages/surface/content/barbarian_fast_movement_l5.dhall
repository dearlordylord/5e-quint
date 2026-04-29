-- Fast Movement — SRD 5.2.1 Barbarian level 5.
--
-- RAW (Classes / Barbarian / Level 5: Fast Movement):
--   "Your speed increases by 10 feet while you aren't wearing Heavy armor."
--
-- Clean fit:
--   • ClassFeatureRecord with PassiveMechanics.
--   • Existing EquipmentPredicate.not_wearing_armor scoped to [ "heavy" ].
--   • Existing modify_speed atom for the +10 ft walking-speed increase.

let fastMovement =
      { kind = "class_feature"
      , id = "barbarian_fast_movement_l5"
      , name = "Fast Movement"
      , className = "barbarian"
      , acquiredAtLevel = 5
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Barbarian#Fast Movement"
          }
      , description =
          "Your speed increases by 10 feet while you aren't wearing Heavy armor."
      , mechanics =
          { family = "passive"
          , condition =
              { kind = "not_wearing_armor"
              , categories = [ "heavy" ]
              }
          , grants =
              [ { kind = "modify_speed"
                , delta = 10
                , unit = "feet"
                }
              ]
          }
      }

in  fastMovement
