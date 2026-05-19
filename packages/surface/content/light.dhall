-- Light — SRD 5.2.1 Cantrip, Evocation.
--
-- RAW (Spells / Descriptions E-L / Light):
--   "You touch one Large or smaller object that isn't being worn or
--    carried by someone else. Until the spell ends, the object sheds
--    Bright Light in a 20-foot radius and Dim Light for an additional
--    20 feet. The light can be colored as you like."
--   "Covering the object with something opaque blocks the light. The
--    spell ends if you cast it again."
--
-- Family: activation (direct phase), timed 1-hour duration with caster-recast
-- early end. The touched object target carries the RAW Large-or-smaller and
-- not-worn-or-carried-by-someone-else gates as object filter facts.
--
-- OMITTED (DM narrative):
--   "The light can be colored as you like" — pure narrative flavor,
--   no mechanical consequence.
--   Opaque-cover state is supplied as a table projection fact at runtime; the
--   Surface record owns the object emitter source facts, not map geometry.

let light =
      { kind = "spell"
      , id = "light"
      , name = "Light"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Light"
          }
      , description =
          "You touch one Large or smaller object that isn't being worn or carried by someone else. Until the spell ends, the object sheds Bright Light in a 20-foot radius and Dim Light for an additional 20 feet. The light can be colored as you like. Covering the object with something opaque blocks the light. The spell ends if you cast it again."
      , mechanics =
          { family = "activation"
          , level = 0
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = False
              , m = Some "a firefly or phosphorescent moss"
              }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              , earlyEnd = [ { kind = "caster_recasts_spell" } ]
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "light_object"
                    , label = "target object"
                    , value =
                        { kind = "object"
                        , count = 1
                        , filter =
                            { targetRelation = "not_worn_or_carried"
                            , maxSize = "large"
                            }
                        }
                    }
                , effects =
                    [ { kind = "emit_light"
                      , brightRadiusFeet = 20
                      , dimAdditionalFeet = 20
                      }
                    ]
                }
              ]
          }
      }

in  light
