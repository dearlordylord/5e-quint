-- Nondetection - SRD 5.2.1 Spell, level 3, Abjuration.
--
-- RAW (Spells/Descriptions-M-P#Nondetection):
--   "The target can be a willing creature, or it can be a place or an
--    object no larger than 10 feet in any dimension."
--   "The target can't be targeted by any Divination spell or perceived
--    through magical scrying sensors."
--
-- The Surface record owns the Spell Definition and the typed source fact that
-- the ward blocks both Divination targeting and magical scrying-sensor
-- perception. Target legality, Divination spell classification, active sensor
-- perception, and table/place identity remain runtime-detached until a
-- promoted divination/perception owner consumes this fact.

let nondetection =
      { kind = "spell"
      , id = "nondetection"
      , name = "Nondetection"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Nondetection"
          }
      , description =
          "For the duration, you hide a target that you touch from Divination spells. The target can be a willing creature, or it can be a place or an object no larger than 10 feet in any dimension. The target can't be targeted by any Divination spell or perceived through magical scrying sensors."
      , mechanics =
          { family = "activation"
          , level = 3
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m =
                  "a pinch of diamond dust worth 25+ GP, which the spell consumes"
              , materialCostGp = 25
              , materialConsumed = True
              }
          , duration = { kind = "timed", value = { unit = "hour", amount = 8 } }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "nondetection_target"
                    , label = "willing creature, place, or object"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one"
                            , targetKinds =
                                [ "creature", "object", "location" ]
                            , creatureDisposition = "willing"
                            , objectOrLocationMaxDimensionFeet = 10
                            }
                        }
                    }
                , effects =
                    [ { kind =
                          "block_divination_targeting_and_scrying_perception"
                      }
                    ]
                }
              ]
          }
      }

in  nondetection
