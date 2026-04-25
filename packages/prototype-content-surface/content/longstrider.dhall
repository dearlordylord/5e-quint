-- Longstrider — SRD 5.2.1 Spell, level 1, Transmutation.
--
-- RAW (Spells / Descriptions E-L / Longstrider):
--   "You touch a creature. The target's Speed increases by 10 feet
--    until the spell ends."
--   "Using a Higher-Level Spell Slot. You can target one additional
--    creature for each spell slot level above 1."
--
-- ZERO-WIDENING VALIDATION REFERENCE. First timed (non-concentration)
-- multi-target buff using modify_speed. The additive delta on
-- Walking Speed (modify_speed) is distinct from grant_speed (which
-- would add a NEW speed mode like Fly). The effect persists for the
-- timed duration of the spell (direct phase under a timed window).

let longstrider =
      { kind = "spell"
      , id = "longstrider"
      , name = "Longstrider"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Longstrider"
          }
      , description =
          "You touch a creature. The target's Speed increases by 10 feet until the spell ends. Using a Higher-Level Spell Slot. You can target one additional creature for each spell slot level above 1."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = Some "a pinch of dirt"
              }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "longstrider_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "choose_up_to"
                            , count =
                                { kind = "linear"
                                , base = 1
                                , perSlotAboveBase = 1
                                , baseLevel = 1
                                }
                            }
                        }
                    }
                , effects =
                    [ { kind = "modify_speed"
                      , delta = 10
                      , unit = "feet"
                      }
                    ]
                }
              ]
          }
      }

in  longstrider
