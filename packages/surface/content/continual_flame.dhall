-- Continual Flame — SRD 5.2.1 Spell, Level 2, Evocation.
-- Permanent light source placed on a touched object. No concentration,
-- permanent duration until dispelled. Effect: emit_bright_and_dim_illumination 20 ft bright +
-- 20 ft dim additional.

let continualFlame =
      { kind = "spell"
      , id = "continual_flame"
      , name = "Continual Flame"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Continual Flame"
          }

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
                    [ { kind = "emit_bright_and_dim_illumination"
                      , brightRadiusFeet = 20
                      , dimAdditionalFeet = 20
                      }
                    ]
                }
              ]
          }
      }

in  continualFlame
