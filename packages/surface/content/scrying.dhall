-- Scrying - SRD 5.2.1 Spell, level 5, Divination.

let scrying =
      { kind = "spell"
      , id = "scrying"
      , name = "Scrying"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Scrying"
          }
      , description =
          "You can see and hear a chosen creature on the same plane. The target makes a Wisdom saving throw modified by how well you know it and what physical connection you have to it. The target knows only that it feels uneasy. On a successful save, it isn't affected and you can't use this spell on it again for 24 hours. On a failed save, an Invisible, intangible sensor appears within 10 feet of the target, and you can see and hear through it. The sensor moves with the target, remaining within 10 feet. If something can see it, it appears as a luminous orb about the size of your fist. Instead of a creature, you can target a location you have seen; the sensor appears there and doesn't move."
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
