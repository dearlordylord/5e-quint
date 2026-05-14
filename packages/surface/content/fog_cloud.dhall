-- Fog Cloud — SRD 5.2.1 Spell, level 1, Conjuration.
--
-- RAW (Spells/Descriptions-E-L#Fog Cloud):
--   "You create a 20-foot-radius Sphere of fog centered on a point
--    within range. The Sphere is Heavily Obscured."
--   "It lasts for the duration or until a strong wind (such as one
--    created by Gust of Wind) disperses it."
--   "Using a Higher-Level Spell Slot. The fog's radius increases by
--    20 feet for each spell slot level above 1."

let area =
      { kind = "hole"
      , holeId = "fog_cloud_point"
      , label = "fog origin point"
      , value =
          { kind = "area"
          , shape =
              { kind = "sphere"
              , radiusFeet =
                  { kind = "linear_per_level"
                  , axis = "slot"
                  , base = 20
                  , perLevel = 20
                  , startingAtLevel = 1
                  }
              }
          , origin = { kind = "point_within_range" }
          }
      }

let fogCloud =
      { kind = "spell"
      , id = "fog_cloud"
      , name = "Fog Cloud"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Fog Cloud"
          }
      , description =
          "You create a 20-foot-radius Sphere of fog centered on a point within range. The Sphere is Heavily Obscured. It lasts for the duration or until a strong wind disperses it. Using a Higher-Level Spell Slot. The fog's radius increases by 20 feet for each spell slot level above 1."
      , mechanics =
          { family = "ongoing_effect"
          , level = 1
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "hour", amount = 1 }
              , earlyEnd = [ { kind = "area_dispersed_by_strong_wind" } ]
              }
          , attachment = area
          , operations =
              [ { trigger = { kind = "passive" }
                , effect = { kind = "area_is_heavily_obscured" }
                }
              ]
          }
      }

in  fogCloud
