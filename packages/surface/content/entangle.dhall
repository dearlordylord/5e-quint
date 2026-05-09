-- Entangle — SRD 5.2.1 Spell, level 1, Conjuration.
--
-- RAW (Spells / Descriptions E-L / Entangle):
--   "Grasping plants sprout from the ground in a 20-foot square
--    within range. For the duration, these plants turn the ground in
--    the area into Difficult Terrain. They disappear when the spell
--    ends. Each creature (other than you) in the area when you cast
--    the spell must succeed on a Strength saving throw or have the
--    Restrained condition until the spell ends. A Restrained creature
--    can take an action to make a Strength (Athletics) check against
--    your spell save DC. On a success, it frees itself from the
--    grasping plants and is no longer Restrained by them."
--
-- Runtime scope: area + STR save + spell-owned Restrained +
-- Concentration cleanup + Strength (Athletics) escape action are promoted.
-- Difficult Terrain remains table/spatial agenda because movement-cost
-- derivation for persistent spell areas is not executable in this slice.

let entangle =
      { kind = "spell"
      , id = "entangle"
      , name = "Entangle"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Entangle"
          }
      , description =
          "Grasping plants sprout from the ground in a 20-foot square within range. For the duration, these plants turn the ground in the area into Difficult Terrain. They disappear when the spell ends. Each creature (other than you) in the area when you cast the spell must succeed on a Strength saving throw or have the Restrained condition until the spell ends. A Restrained creature can take an action to make a Strength (Athletics) check against your spell save DC. On a success, it frees itself from the grasping plants and is no longer Restrained by them."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 90 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "entangle_point"
                    , label = "spell origin point"
                    , value =
                        { kind = "area"
                        , shape = { kind = "cube", sideFeet = 20 }
                        , origin = { kind = "point_within_range" }
                        }
                    }
                , ability = "str"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "apply_condition"
                    , condition = "restrained"
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  entangle
