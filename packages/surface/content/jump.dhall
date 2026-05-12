-- Jump - SRD 5.2.1 Spell, level 1, Transmutation.
--
-- RAW (Spells / Descriptions E-L / Jump):
--   "You touch a willing creature. Once on each of its turns until the
--    spell ends, that creature can jump up to 30 feet by spending 10
--    feet of movement."
--   "Using a Higher-Level Spell Slot. You can target one additional
--    creature for each spell slot level above 1."
--
-- SURFACE WIDENING REFERENCE (SRDINV46). The effect records the
-- once-per-turn replacement from 10 feet of spent Movement to a jump
-- of up to 30 feet. Jump arc geometry, landing checks, and Movement
-- budget execution remain with table/runtime Movement owners.

let jump =
      { kind = "spell"
      , id = "jump"
      , name = "Jump"
      , provenance =
          { kind = "srd-5.2.1", section = "Spells/Descriptions-E-L#Jump" }
      , description =
          "You touch a willing creature. Once on each of its turns until the spell ends, that creature can jump up to 30 feet by spending 10 feet of movement. Using a Higher-Level Spell Slot. You can target one additional creature for each spell slot level above 1."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "transmutation"
          , castingTime = { kind = "bonus_action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = Some "a grasshopper's hind leg"
              }
          , duration = { kind = "timed", value = { unit = "minute", amount = 1 } }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "jump_target"
                    , label = "willing target"
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
                            , targetKinds = [ "creature" ]
                            , disposition = "willing"
                            }
                        }
                    }
                , effects =
                    [ { kind = "jump_movement_replacement"
                      , frequency = "once_on_each_target_turn"
                      , maxJumpDistanceFeet = 30
                      , movementCostFeet = 10
                      }
                    ]
                }
              ]
          }
      }

in  jump
