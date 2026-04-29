-- Continual Flame — SRD 5.2.1 Spell, Level 2, Evocation.
-- Permanent light source placed on a touched object. No concentration,
-- permanent duration until dispelled. Effect: emit_light 20 ft bright +
-- 20 ft dim additional.

let continualFlame =
      { kind = "spell"
      , id = "continual_flame"
      , name = "Continual Flame"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Continual Flame"
          }
      , description =
          "A flame springs from an object that you touch. The effect casts Bright Light in a 20-foot radius and Dim Light for an additional 20 feet. It looks like a regular flame, but it creates no heat and consumes no fuel. The flame can be covered or hidden but not smothered or quenched."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = Some "ruby dust worth 50+ GP, which the spell consumes"
              , materialCostGp = Some 50
              , materialConsumed = Some True
              }
          , duration =
              { kind = "permanent"
              , endsOn = [ "dispel" ]
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "continual_flame_object"
                    , label = "target object"
                    , value =
                        { kind = "object"
                        , count = 1
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

in  continualFlame
