-- Circle of Death — SRD 5.2.1 Spell, level 6, Necromancy.
-- Family: activation (single save_gate phase).
-- Area: 60-foot-radius Sphere from a point within 150 ft.
-- Each creature: Con save → 8d8 Necrotic on fail, half on success.
-- Upcast: +2d8 per slot level above 6.
--
-- Note: "half damage on success" is encoded as an independent 4d8
-- success branch (scaling: +1d8/slot above 6). The mathematical
-- relationship success = fail/2 is correct in values but is NOT
-- expressible as a linked constraint in the current surface.
-- This is recorded as a surface_widening.

let circleOfDeath =
      { kind = "spell"
      , id = "circle_of_death"
      , name = "Circle of Death"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Circle of Death"
          }
      , description =
          "Negative energy ripples out in a 60-foot-radius Sphere from a point you choose within range. Each creature in that area makes a Constitution saving throw, taking 8d8 Necrotic damage on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot: The damage increases by 2d8 for each spell slot level above 6."
      , mechanics =
          { family = "activation"
          , level = 6
          , school = "necromancy"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 150 }
          , components =
              { v = True
              , s = True
              , m = Some "the powder of a crushed black pearl worth 500+ GP"
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "area"
                    , shape = { kind = "sphere", radiusFeet = 60 }
                    , origin = { kind = "point_within_range" }
                    }
                , ability = "con"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "damage"
                    , damageType = "necrotic"
                    , amount =
                        { kind = "linear_per_level"
                        , axis = "slot"
                        , base = { dice = 8, dieSize = 8 }
                        , perLevel = { dice = 2 }
                        , startingAtLevel = 6
                        }
                    }
                , onSuccess =
                    { kind = "damage"
                    , damageType = "necrotic"
                    , amount =
                        { kind = "linear_per_level"
                        , axis = "slot"
                        , base = { dice = 4, dieSize = 8 }
                        , perLevel = { dice = 1 }
                        , startingAtLevel = 6
                        }
                    }
                }
              ]
          }
      }

in  circleOfDeath
