-- Legend Lore - SRD 5.2.1 Spell, level 5, Divination.

let legendLore =
      { kind = "spell"
      , id = "legend_lore"
      , name = "Legend Lore"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Legend Lore"
          }
      , description =
          "Name or describe a famous person, place, or object. The spell brings to your mind a brief GM-described summary of significant lore about that famous thing. The information is accurate but might be figurative or poetic, and the more you already know, the more precise and detailed the information is. If the chosen thing isn't actually famous, the spell fails."
      , mechanics =
          { family = "activation"
          , level = 5
          , school = "divination"
          , castingTime = { kind = "minutes", amount = 10, ritual = False }
          , range = { kind = "self" }
          , components =
              { v = True
              , s = True
              , m = "incense worth 250+ GP, which the spell consumes, and four ivory strips worth 50+ GP each"
              , materialCostGp = 450
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  legendLore
