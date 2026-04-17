-- Spike Growth — SRD 5.2.1 Spell, Level 2, Transmutation.
-- Family: ongoing_effect. §A15 validation ref for the
-- `on_creature_moves { perFeet: 5 }` trigger: 2d4 piercing damage per
-- 5 feet of movement through the spiked area.
--
-- Difficult Terrain and the "Wisdom (Perception or Survival) to
-- recognize the terrain" check are DM agenda (spatial movement
-- geometry and perception rulings are caller-provided per
-- ARCHITECTURE.md §1).

let spikeGrowth =
      { kind = "spell"
      , id = "spike_growth"
      , name = "Spike Growth"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Spike Growth"
          }
      , description =
          "The ground in a 20-foot-radius Sphere centered on a point within range sprouts hard spikes and thorns. The area becomes Difficult Terrain for the duration. When a creature moves into or within the area, it takes 2d4 Piercing damage for every 5 feet it travels."
      , mechanics =
          { family = "ongoing_effect"
          , level = 2
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 150 }
          , components = { v = True, s = True, m = Some "seven thorns" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , attachment =
              { kind = "area"
              , shape = { kind = "sphere", radiusFeet = 20 }
              , origin = { kind = "point_within_range" }
              }
          , operations =
              [ { trigger =
                    { kind = "on_creature_moves"
                    , perFeet = 5
                    }
                , effect =
                    { kind = "damage"
                    , damageType = "piercing"
                    , amount =
                        { kind = "fixed"
                        , expr = { dice = 2, dieSize = 4 }
                        }
                    }
                }
              ]
          }
      }

in  spikeGrowth
