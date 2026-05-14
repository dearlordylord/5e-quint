-- Spare the Dying — SRD 5.2.1 Spell, level 0, Necromancy.
--
-- RAW (Spells/Descriptions-S-Z#Spare the Dying):
--   "Choose a creature within range that has 0 Hit Points and isn't
--    dead. The creature becomes Stable."
--   "Cantrip Upgrade. The range doubles when you reach levels 5
--    (30 feet), 11 (60 feet), and 17 (120 feet)."
--
-- The target filter is one domain state because the spell requires both
-- zero Hit Points and not-dead at the selection boundary.

let spareTheDying =
      { kind = "spell"
      , id = "spare_the_dying"
      , name = "Spare the Dying"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Spare the Dying"
          }
      , description =
          "Choose a creature within range that has 0 Hit Points and isn't dead. The creature becomes Stable. Cantrip Upgrade. The range doubles when you reach levels 5 (30 feet), 11 (60 feet), and 17 (120 feet)."
      , mechanics =
          { family = "activation"
          , level = 0
          , school = "necromancy"
          , castingTime = { kind = "action" }
          , range =
              { kind = "point"
              , feet =
                  { kind = "threshold_tiers"
                  , axis = "character"
                  , base = 15
                  , tiers =
                      [ { atLevel = 5, value = 30 }
                      , { atLevel = 11, value = 60 }
                      , { atLevel = 17, value = 120 }
                      ]
                  }
              }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "spare_the_dying_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one"
                            , targetKinds = [ "creature" ]
                            , stateFilter = [ "zero_hp_not_dead" ]
                            }
                        }
                    }
                , effects = [ { kind = "make_stable" } ]
                }
              ]
          }
      }

in  spareTheDying
