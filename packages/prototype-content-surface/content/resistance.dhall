-- Resistance — SRD 5.2.1 Abjuration Cantrip (Cleric, Druid).
--
-- RAW (Spells/Descriptions-P-R#Resistance):
--   "You touch a willing creature and choose a damage type: Acid,
--    Bludgeoning, Cold, Fire, Lightning, Necrotic, Piercing, Poison,
--    Radiant, Slashing, or Thunder. When the creature takes damage of
--    the chosen type before the spell ends, the creature reduces the
--    total damage taken by 1d4. A creature can benefit from this spell
--    only once per turn."
--
-- Surface gap: `reduce_damage_taken` has no `count` field to express
-- the "once per turn" limiter. The atom is otherwise a clean fit.
-- Classified as surface_widening; see proposal-resistance.md.

let resistance =
      { kind = "spell"
      , id = "resistance"
      , name = "Resistance"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-P-R#Resistance"
          }
      , description =
          "You touch a willing creature and choose a damage type: Acid, Bludgeoning, Cold, Fire, Lightning, Necrotic, Piercing, Poison, Radiant, Slashing, or Thunder. When the creature takes damage of the chosen type before the spell ends, the creature reduces the total damage taken by 1d4. A creature can benefit from this spell only once per turn."
      , mechanics =
          { family = "ongoing_effect"
          , level = 0
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment =
              { kind = "target"
              , selection = { mode = "one" }
              }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect =
                    { kind = "reduce_damage_taken"
                    , amount =
                        { kind = "fixed"
                        , expr = { dice = 1, dieSize = 4 }
                        }
                    , damageType =
                        { kind = "choice"
                        , label = "damage type"
                        , options =
                            [ "acid"
                            , "bludgeoning"
                            , "cold"
                            , "fire"
                            , "lightning"
                            , "necrotic"
                            , "piercing"
                            , "poison"
                            , "radiant"
                            , "slashing"
                            , "thunder"
                            ]
                        }
                    }
                }
              ]
          }
      }

in  resistance
