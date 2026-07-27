-- Legend Lore - SRD 5.2.1 Spell, level 5, Divination.

let legendLore =
      { kind = "spell"
      , id = "legend_lore"
      , name = "Legend Lore"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Legend Lore"
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
