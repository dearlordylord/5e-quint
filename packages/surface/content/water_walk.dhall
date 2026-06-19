-- Water Walk - SRD 5.2.1 Spell, level 3, Transmutation.
--
-- RAW (Spells/Descriptions-S-Z#Water Walk):
--   "This spell grants the ability to move across any liquid surface--such
--    as water, acid, mud, snow, quicksand, or lava--as if it were harmless
--    solid ground (creatures crossing molten lava can still take damage from
--    the heat)."
--   "Up to ten willing creatures of your choice within range gain this ability
--    for the duration."
--   "An affected target must take a Bonus Action to pass from the liquid's
--    surface into the liquid itself and vice versa, but if the target falls
--    into the liquid, the target passes through the surface into the liquid
--    below."
--
-- The authored Surface fact records willing creature targeting, "any liquid
-- surface" traversal as harmless solid ground, the lava heat exception, and
-- the Bonus Action surface/liquid transition protocol. Table environment state
-- still owns what counts as a liquid surface in the scene and any heat damage
-- caused by the environment; this Spell Definition does not promote a
-- battle-runtime map, liquid-volume, buoyancy, lava-damage, or pathfinding
-- owner.

let waterWalk =
      { kind = "spell"
      , id = "water_walk"
      , name = "Water Walk"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Water Walk"
          }
      , description =
          "This spell grants the ability to move across any liquid surface--such as water, acid, mud, snow, quicksand, or lava--as if it were harmless solid ground (creatures crossing molten lava can still take damage from the heat). Up to ten willing creatures of your choice within range gain this ability for the duration. An affected target must take a Bonus Action to pass from the liquid's surface into the liquid itself and vice versa, but if the target falls into the liquid, the target passes through the surface into the liquid below."
      , mechanics =
          { family = "activation"
          , level = 3
          , school = "transmutation"
          , castingTime = { kind = "action", ritual = True }
          , range = { kind = "point", feet = 30 }
          , components =
              { v = True
              , s = True
              , m = Some "a piece of cork"
              }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "water_walk_targets"
                    , label = "up to ten willing creatures"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "choose_up_to"
                            , count = 10
                            , targetKinds = [ "creature" ]
                            , disposition = "willing"
                            }
                        }
                    }
                , effects =
                    [ { kind = "grant_liquid_surface_traversal"
                      , surfaceScope =
                          { kind = "any_liquid_surface"
                          , examples =
                              [ "water"
                              , "acid"
                              , "mud"
                              , "snow"
                              , "quicksand"
                              , "lava"
                              ]
                          }
                      , traversal =
                          { path = "across_surface"
                          , treatedAs = "harmless_solid_ground"
                          }
                      , surfaceHazardException =
                          { surface = "lava"
                          , hazard = "heat"
                          , outcome = "still_applies"
                          }
                      , surfaceLiquidTransition =
                          { deliberateCost = "bonus_action"
                          , directions =
                              [ "surface_to_liquid", "liquid_to_surface" ]
                          , fallingIntoLiquid =
                              "passes_through_surface_into_liquid_below"
                          }
                      }
                    ]
                }
              ]
          }
      }

in  waterWalk
