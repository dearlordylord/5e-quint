-- Spike Growth — SRD 5.2.1 Spell, Level 2, Transmutation.
-- Family: ongoing_effect. Two passive-duration facts about the area:
--   * The area IS difficult terrain (area_is_difficult_terrain atom,
--     passive trigger).
--   * Moving through costs 2d4 piercing per 5 ft (on_creature_moves).
--
-- The operations list is heterogeneous (different effect shapes), so
-- effects are constructed via `_types.dhall`'s superset Effect record
-- with unused fields set to None. `dhall-to-json --omit-empty` drops
-- the Nones, so the JSON shape is unchanged.
--
-- The Search action plus Wisdom (Perception or Survival) recognition check
-- remains table/perception agenda. The authored text records the rule; the
-- runtime consumes caller-provided movement-area facts instead of storing
-- parallel observer terrain-knowledge state.

let T = ./_types.dhall

let spikeGrowth =
      { kind = "spell"
      , id = "spike_growth"
      , name = "Spike Growth"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Spike Growth"
          }
      , description =
          "The ground in a 20-foot-radius Sphere centered on a point within range sprouts hard spikes and thorns. The area becomes Difficult Terrain for the duration. When a creature moves into or within the area, it takes 2d4 Piercing damage for every 5 feet it travels. The transformation of the ground is camouflaged to look natural. Any creature that can't see the area when the spell is cast must take a Search action and succeed on a Wisdom (Perception or Survival) check against your spell save DC to recognize the terrain as hazardous before entering it."
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
              { kind = "hole"
              , holeId = "spike_growth_point"
              , label = "spell origin point"
              , value =
                  { kind = "area"
                  , shape = { kind = "sphere", radiusFeet = 20 }
                  , origin = { kind = "point_within_range" }
                  }
              }
          , operations =
              [ { trigger =
                    T.defaultTrigger // { kind = "passive" }
                , effect =
                    T.defaultEffect // { kind = "area_is_difficult_terrain" }
                }
              , { trigger =
                      T.defaultTrigger
                  //  { kind = "on_creature_moves"
                      , perFeet = Some 5
                      }
                , effect =
                        T.defaultEffect
                    //  { kind = "damage"
                        , damageType = Some "piercing"
                        , amount = Some
                            (    T.defaultDiceAmount
                              // { kind = "fixed"
                                 , expr = Some { dice = 2, dieSize = 4 }
                                 }
                            )
                        }
                }
              ]
          }
      }

in  spikeGrowth
