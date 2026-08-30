-- Vitriolic Sphere - SRD 5.2.1 Spell, level 4, Evocation.
--
-- RAW (Spells/Descriptions-S-Z#Vitriolic Sphere): a 20-foot-radius Sphere
-- within 150 feet uses a Dexterity save for initial and delayed Acid damage.
-- The save/damage timing owner remains deferred in this authored boundary.

let vitriolicSphere =
      { kind = "spell"
      , id = "vitriolic_sphere"
      , name = "Vitriolic Sphere"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Vitriolic Sphere"
          }
      , mechanics =
          { family = "activation"
          , level = 4
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 150 }
          , components = { v = True, s = True, m = "a drop of bile" }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "area"
                    , shape = { kind = "sphere", radiusFeet = 20 }
                    , origin = { kind = "point_within_range" }
                    }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  vitriolicSphere
