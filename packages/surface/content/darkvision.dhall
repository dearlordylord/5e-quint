-- Darkvision - SRD 5.2.1 Spell, level 2, Transmutation.
--
-- RAW (Spells / Descriptions A-D / Darkvision):
--   "For the duration, a willing creature you touch has Darkvision
--    with a range of 150 feet."
--
-- The Surface records the spell-granted sense source fact. Promoted
-- light/obscurement reducers already consume typed Darkvision observer facts
-- from the table/caller boundary; this record does not add a separate
-- Character Sheet or battle active-effect sense projection.

let darkvision =
      { kind = "spell"
      , id = "darkvision"
      , name = "Darkvision"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Darkvision"
          }
      , description =
          "For the duration, a willing creature you touch has Darkvision with a range of 150 feet."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = Some "a dried carrot"
              }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 8 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "darkvision_target"
                    , label = "willing target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one"
                            , targetKinds = [ "creature" ]
                            , disposition = "willing"
                            }
                        }
                    }
                , effects =
                    [ { kind = "grant_sense"
                      , sense = "darkvision"
                      , rangeFeet = 150
                      }
                    ]
                }
              ]
          }
      }

in  darkvision
