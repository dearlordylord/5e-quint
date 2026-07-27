-- Scrying - SRD 5.2.1 Spell, level 5, Divination.

let scrying =
      { kind = "spell"
      , id = "scrying"
      , name = "Scrying"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Scrying"
          }

      , mechanics =
          { family = "activation"
          , level = 5
          , school = "divination"
          , castingTime = { kind = "minutes", amount = 10, ritual = False }
          , range = { kind = "self" }
          , components =
              { v = True
              , s = True
              , m = "a focus worth 1,000+ GP, such as a crystal ball, mirror, or water-filled font"
              , materialCostGp = 1000
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "scrying_target"
                    , label = "creature on same plane"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one", targetKinds = [ "creature" ] }
                        }
                    }
                , ability = "wis"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "create_sensor"
                    , visibility = "invisible"
                    , durability = "invulnerable"
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  scrying
