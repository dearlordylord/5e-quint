-- Protection from Energy — SRD 5.2.1 Spell, level 3, Abjuration.
--
-- RAW (Spells / Descriptions M-P / Protection from Energy):
--   "For the duration, the willing creature you touch has Resistance
--    to one damage type of your choice: Acid, Cold, Fire, Lightning,
--    or Thunder."
--
-- ZERO-WIDENING VALIDATION REFERENCE. Second consumer of
-- DamageTypeRef.choice (after Dragonborn Damage Resistance) — used
-- at CAST time rather than BUILD time, but the shape is identical
-- (renamed from build_time_choice this session to reflect the wider
-- applicability).

let protectionFromEnergy =
      { kind = "spell"
      , id = "protection_from_energy"
      , name = "Protection from Energy"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Protection from Energy"
          }
      , description =
          "For the duration, the willing creature you touch has Resistance to one damage type of your choice: Acid, Cold, Fire, Lightning, or Thunder."
      , mechanics =
          { family = "activation"
          , level = 3
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "hour", amount = 1 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "protection_from_energy_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , effects =
                    [ { kind = "grant_resistance"
                      , damageType =
                          { kind = "hole"
                          , holeId = "protection_from_energy_damage_type"
                          , label = "energy type"
                          , value =
                              { kind = "choice"
                              , label = "energy type"
                              , options = [ "acid", "cold", "fire", "lightning", "thunder" ]
                              }
                          }
                      }
                    ]
                }
              ]
          }
      }

in  protectionFromEnergy
