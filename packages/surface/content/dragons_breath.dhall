-- Dragon's Breath - SRD 5.2.1 Spell, level 2, Transmutation.
--
-- RAW (Spells / Descriptions A-D / Dragon's Breath):
--   "You touch one willing creature and choose Acid, Cold, Fire,
--    Lightning, or Poison. Until the spell ends, the target can take a
--    Magic action to exhale a 15-foot Cone. Each creature in that area
--    makes a Dexterity saving throw, taking 3d6 damage of the chosen
--    type on a failed save or half as much damage on a successful one."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d6 for
--    each spell slot level above 2."

let dragonsBreath =
      { kind = "spell"
      , id = "dragons_breath"
      , name = "Dragon's Breath"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Dragon's Breath"
          }
      , description =
          "You touch one willing creature and choose Acid, Cold, Fire, Lightning, or Poison. Until the spell ends, the target can take a Magic action to exhale a 15-foot Cone. Each creature in that area makes a Dexterity saving throw, taking 3d6 damage of the chosen type on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 2."
      , mechanics =
          { family = "ongoing_effect"
          , level = 2
          , school = "transmutation"
          , castingTime = { kind = "bonus_action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = Some "a hot pepper"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment =
              { kind = "hole"
              , holeId = "dragons_breath_target"
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
          , operations =
              [ { trigger =
                    { kind = "on_attached_spends_action"
                    , cost = { kind = "standard_action", action = "magic" }
                    }
                , effect =
                    { kind = "save_gate"
                    , attachment =
                        { kind = "area"
                        , shape = { kind = "cone", lengthFeet = 15 }
                        , origin = { kind = "on_attached_creature" }
                        }
                    , ability = "dex"
                    , dc = { kind = "caster_spell_save_dc" }
                    , onFail =
                        { kind = "damage"
                        , damageType =
                            { kind = "hole"
                            , holeId = "dragons_breath_damage_type"
                            , label = "damage type"
                            , value =
                                { kind = "choice"
                                , label = "damage type"
                                , options =
                                    [ "acid"
                                    , "cold"
                                    , "fire"
                                    , "lightning"
                                    , "poison"
                                    ]
                                }
                            }
                        , amount =
                            { kind = "linear_per_level"
                            , axis = "slot"
                            , base = { dice = 3, dieSize = 6 }
                            , perLevel = { dice = 1 }
                            , startingAtLevel = 2
                            }
                        }
                    , onSuccess = { kind = "half_damage" }
                    }
                }
              ]
          }
      }

in  dragonsBreath
