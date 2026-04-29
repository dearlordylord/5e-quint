-- Fly — SRD 5.2.1 Spell, level 3, Transmutation.
--
-- RAW (Spells / Descriptions E-L / Fly):
--   "You touch a willing creature. For the duration, the target gains
--    a Fly Speed of 60 feet and can hover. When the spell ends, the
--    target falls if it is still aloft unless it can stop the fall."
--   "Using a Higher-Level Spell Slot. You can target one additional
--    creature for each spell slot level above 3."
--
-- Consolidated validation reference for:
--   • EffectAtom.grant_speed { speedKind = fly, feet = 60, hover = True }
--     (first unit that grants a NEW speed mode, not an additive delta
--      to Walking Speed; Spider Climb / Water Breathing will later
--      exercise climb / swim kinds.)
--   • TargetSelection.choose_up_to with SlotScaling (base 1, +1/slot)
--   • Duration.concentration up to 10 minutes
--
-- The "target falls if still aloft" clause is DM agenda (physics /
-- geometry resolved by the session, not the spec — see
-- ARCHITECTURE.md §1). Omitted.

let fly =
      { kind = "spell"
      , id = "fly"
      , name = "Fly"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Fly"
          }
      , description =
          "You touch a willing creature. For the duration, the target gains a Fly Speed of 60 feet and can hover. When the spell ends, the target falls if it is still aloft unless it can stop the fall. Using a Higher-Level Spell Slot. You can target one additional creature for each spell slot level above 3."
      , mechanics =
          { family = "activation"
          , level = 3
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = Some "a feather"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "fly_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "choose_up_to"
                            , count =
                                { kind = "linear"
                                , base = 1
                                , perSlotAboveBase = 1
                                , baseLevel = 3
                                }
                            }
                        }
                    }
                , effects =
                    [ { kind = "grant_speed"
                      , speedKind = "fly"
                      , feet = 60
                      , hover = True
                      }
                    ]
                }
              ]
          }
      }

in  fly
