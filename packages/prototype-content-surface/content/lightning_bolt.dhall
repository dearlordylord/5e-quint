-- Lightning Bolt — SRD 5.2.1 Spell, level 3, Evocation.
--
-- RAW (Spells / Descriptions E-L / Lightning Bolt):
--   "A stroke of lightning forming a 100-foot-long, 5-foot-wide Line
--    blasts from you in a direction you choose. Each creature in the
--    Line makes a Dexterity saving throw, taking 8d6 Lightning damage
--    on a failed save or half as much damage on a successful one."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d6 for
--    each spell slot level above 3."
--
-- ZERO-WIDENING VALIDATION REFERENCE. First line-shape AoE in the
-- authored corpus (Burning Hands / Cone of Cold use cone; Fireball /
-- Circle of Death use sphere). Line shape was already in
-- AreaShapeDescriptor — exercising it here validates that encoding.

let lightningBolt =
      { kind = "spell"
      , id = "lightning_bolt"
      , name = "Lightning Bolt"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Lightning Bolt"
          }
      , description =
          "A stroke of lightning forming a 100-foot-long, 5-foot-wide Line blasts from you in a direction you choose. Each creature in the Line makes a Dexterity saving throw, taking 8d6 Lightning damage on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 3."
      , mechanics =
          { family = "activation"
          , level = 3
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components =
              { v = True
              , s = True
              , m = Some "a bit of fur and a crystal rod"
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "area"
                    , shape =
                        { kind = "line"
                        , lengthFeet = 100
                        , widthFeet = 5
                        }
                    , origin = { kind = "self" }
                    }
                , ability = "dex"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "damage"
                    , damageType = "lightning"
                    , amount =
                        { kind = "linear_per_level"
                        , axis = "slot"
                        , base = { dice = 8, dieSize = 6 }
                        , perLevel = { dice = 1 }
                        , startingAtLevel = 3
                        }
                    }
                , onSuccess = { kind = "half_damage" }
                }
              ]
          }
      }

in  lightningBolt
