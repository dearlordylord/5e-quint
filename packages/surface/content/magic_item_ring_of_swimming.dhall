{ kind = "magic_item"
, id = "ring_of_swimming"
, name = "Ring of Swimming"
, rarity = "uncommon"
, requiresAttunement = False
, provenance =
    { kind = "srd-5.2.1"
    , section = "Magic-Items/Items-Q-Z.md#Ring of Swimming"
    }

, mechanics =
    { family = "passive"
    , grants =
        [ { kind = "grant_speed"
          , speedKind = "swim"
          , feet = 40
          }
        ]
    }
, destruction = { kind = "none" }
}
