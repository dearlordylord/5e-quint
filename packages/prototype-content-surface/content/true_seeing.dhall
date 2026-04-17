-- True Seeing — SRD 5.2.1 Spell, level 6, Divination.
--
-- RAW (Spells / Descriptions S-Z / True Seeing):
--   "For the duration, the willing creature you touch has Truesight
--    with a range of 120 feet."
--
-- ZERO-WIDENING VALIDATION REFERENCE. Parallel to See Invisibility —
-- same activation + direct + grant_sense pattern, but with a
-- target-creature attachment (touch, willing creature) instead of
-- self, and an explicit 120 ft range. Resolves sub-agent's
-- "GrantSenseOperation" proposal without an OngoingOperation
-- widening: grant_sense is already an EffectAtom; the direct phase
-- reaches it.
--
-- Material component: "mushroom powder worth 25+ GP, which the spell
-- consumes" — encoded via materialCostGp + materialConsumed metadata,
-- same shape as Stoneskin / Protection from Evil and Good.

let trueSeeing =
      { kind = "spell"
      , id = "true_seeing"
      , name = "True Seeing"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#True Seeing"
          }
      , description =
          "For the duration, the willing creature you touch has Truesight with a range of 120 feet."
      , mechanics =
          { family = "activation"
          , level = 6
          , school = "divination"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = Some "mushroom powder worth 25+ GP, which the spell consumes"
              , materialCostGp = 25
              , materialConsumed = True
              }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "target"
                    , selection = { mode = "one" }
                    }
                , effects =
                    [ { kind = "grant_sense"
                      , sense = "truesight"
                      , rangeFeet = 120
                      }
                    ]
                }
              ]
          }
      }

in  trueSeeing
