-- False Life — SRD 5.2.1 Spell, level 1, Necromancy.
--
-- RAW (Spells / Descriptions E-L / False Life):
--   "You gain 2d4 + 4 Temporary Hit Points."
--   "Using a Higher-Level Spell Slot. You gain 5 additional Temporary
--    Hit Points for each spell slot level above 1."
--
-- ZERO-WIDENING VALIDATION REFERENCE. Exercises
-- EffectAtom.grant_temp_hp with a linear_per_level DiceAmount and a
-- direct phase self-attached (self-cast, Range: Self).

let falseLife =
      { kind = "spell"
      , id = "false_life"
      , name = "False Life"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#False Life"
          }
      , description =
          "You gain 2d4 + 4 Temporary Hit Points. Using a Higher-Level Spell Slot. You gain 5 additional Temporary Hit Points for each spell slot level above 1."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "necromancy"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components =
              { v = True
              , s = True
              , m = Some "a drop of alcohol"
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "grant_temp_hp"
                      , amount =
                          { kind = "linear_per_level"
                          , axis = "slot"
                          , base = { dice = 2, dieSize = 4, flat = 4 }
                          , perLevel = { flat = 5 }
                          , startingAtLevel = 2
                          }
                      }
                    ]
                }
              ]
          }
      }

in  falseLife
