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
          "Name or describe a famous person, place, or object. The spell brings to your mind a brief summary of the significant lore about that famous thing, as described by the GM. The lore might consist of important details, amusing revelations, or even secret lore that has never been widely known. The more information you already know about the thing, the more precise and detailed the information you receive is. That information is accurate but might be couched in figurative language or poetry, as determined by the GM. If the famous thing you chose isn't actually famous, you hear sad musical notes played on a trombone, and the spell fails."
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
