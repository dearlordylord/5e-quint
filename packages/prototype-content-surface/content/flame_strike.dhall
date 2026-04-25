-- Flame Strike — SRD 5.2.1 Spell, level 5, Evocation.
--
-- RAW (Spells / Descriptions E-L / Flame Strike):
--   "A vertical column of brilliant fire roars down from above. Each
--    creature in a 10-foot-radius, 40-foot-high Cylinder centered on
--    a point within range makes a Dexterity saving throw, taking 5d6
--    Fire damage and 5d6 Radiant damage on a failed save or half as
--    much damage on a successful one."
--   "Using a Higher-Level Spell Slot. The Fire damage and the Radiant
--    damage increase by 1d6 for each spell slot level above 5."
--
-- ZERO-WIDENING VALIDATION REFERENCE. First multi-damage-type spell
-- authored using composite EffectAtom — one save, both damages apply
-- in full on fail, half on success. Uses the cylinder shape (already
-- in AreaShapeDescriptor but not previously exercised).
--
-- TRACE NOTE. The onSuccess = half_damage sentinel refers to the
-- whole composite onFail bundle. The tracer's half_damage rendering
-- links to the composite node; the session resolves per-damage-type
-- halving at resolution time.

let flameStrike =
      { kind = "spell"
      , id = "flame_strike"
      , name = "Flame Strike"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Flame Strike"
          }
      , description =
          "A vertical column of brilliant fire roars down from above. Each creature in a 10-foot-radius, 40-foot-high Cylinder centered on a point within range makes a Dexterity saving throw, taking 5d6 Fire damage and 5d6 Radiant damage on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. The Fire damage and the Radiant damage increase by 1d6 for each spell slot level above 5."
      , mechanics =
          { family = "activation"
          , level = 5
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components =
              { v = True
              , s = True
              , m = Some "a pinch of sulfur"
              }
          , duration = { kind = "instantaneous" }
          , phases =
              let Dmg
                    : Type
                    = { kind : Text
                      , damageType : Text
                      , amount :
                          { kind : Text
                          , axis : Text
                          , base : { dice : Natural, dieSize : Natural }
                          , perLevel : { dice : Natural }
                          , startingAtLevel : Natural
                          }
                      }
              let fire
                    : Dmg
                    = { kind = "damage"
                      , damageType = "fire"
                      , amount =
                          { kind = "linear_per_level"
                          , axis = "slot"
                          , base = { dice = 5, dieSize = 6 }
                          , perLevel = { dice = 1 }
                          , startingAtLevel = 5
                          }
                      }
              let radiant
                    : Dmg
                    = { kind = "damage"
                      , damageType = "radiant"
                      , amount =
                          { kind = "linear_per_level"
                          , axis = "slot"
                          , base = { dice = 5, dieSize = 6 }
                          , perLevel = { dice = 1 }
                          , startingAtLevel = 5
                          }
                      }
              in  [ { kind = "save_gate"
                    , attachment =
                        { kind = "hole"
                        , holeId = "flame_strike_point"
                        , label = "spell origin point"
                        , value =
                            { kind = "area"
                            , shape =
                                { kind = "cylinder"
                                , radiusFeet = 10
                                , heightFeet = 40
                                }
                            , origin = { kind = "point_within_range" }
                            }
                        }
                    , ability = "dex"
                    , dc = { kind = "caster_spell_save_dc" }
                    , onFail =
                        { kind = "composite", effects = [ fire, radiant ] }
                    , onSuccess = { kind = "half_damage" }
                    }
                  ]
          }
      }

in  flameStrike
