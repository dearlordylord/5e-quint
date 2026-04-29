-- Greater Invisibility — SRD 5.2.1 Spell, level 4, Illusion.
--
-- RAW (Spells / Descriptions E-L / Greater Invisibility):
--   "A creature you touch has the Invisible condition until the spell
--    ends."
--
-- ZERO-WIDENING VALIDATION REFERENCE. Deliberate control case for the
-- DurationEndTrigger.earlyEnd feature added for Invisibility (L2).
-- Greater Invisibility is structurally the *same spell* minus the
-- self-break triggers — no earlyEnd array. The contrast validates
-- that earlyEnd is genuinely optional and that its absence round-
-- trips cleanly.

let greaterInvisibility =
      { kind = "spell"
      , id = "greater_invisibility"
      , name = "Greater Invisibility"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Greater Invisibility"
          }
      , description =
          "A creature you touch has the Invisible condition until the spell ends."
      , mechanics =
          { family = "activation"
          , level = 4
          , school = "illusion"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "greater_invisibility_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , effects =
                    [ { kind = "apply_condition"
                      , condition = "invisible"
                      }
                    ]
                }
              ]
          }
      }

in  greaterInvisibility
