-- Mass Cure Wounds — SRD 5.2.1 Spell, level 5, Abjuration.
--
-- RAW (Spells/Descriptions-M-P#Mass Cure Wounds):
--   "Choose up to six creatures in a 30-foot-radius Sphere centered
--    on that point. Each target regains Hit Points equal to 5d8 plus
--    your spellcasting ability modifier."
--   "Using a Higher-Level Spell Slot. The healing increases by 1d8
--    for each spell slot level above 5."

let massCureWounds =
      { kind = "spell"
      , id = "mass_cure_wounds"
      , name = "Mass Cure Wounds"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Mass Cure Wounds"
          }
      , description =
          "A wave of healing energy washes out from a point you can see within range. Choose up to six creatures in a 30-foot-radius Sphere centered on that point. Each target regains Hit Points equal to 5d8 plus your spellcasting ability modifier. Using a Higher-Level Spell Slot. The healing increases by 1d8 for each spell slot level above 5."
      , mechanics =
          { family = "activation"
          , level = 5
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "mass_cure_wounds_targets"
                    , label = "up to six creatures in 30-foot sphere"
                    , value =
                        { kind = "area"
                        , shape = { kind = "sphere", radiusFeet = 30 }
                        , origin = { kind = "point_within_range" }
                        }
                    }
                , effects =
                    [ { kind = "heal_hp"
                      , amount =
                          { kind = "linear_per_level"
                          , axis = "slot"
                          , base =
                              { dice = 5
                              , dieSize = 8
                              , spellcastingMod = True
                              }
                          , perLevel = { dice = 1 }
                          , startingAtLevel = 5
                          }
                      , target = "target_creature"
                      }
                    ]
                }
              ]
          }
      }

in  massCureWounds
