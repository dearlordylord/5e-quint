let ring =
      { kind = "magic_item"
      , id = "magic_item_ring_of_resistance"
      , name = "Ring of Resistance"
      , rarity = "rare"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Magic-Items/Items-Q-Z.md#Ring of Resistance"
          }

      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_resistance"
                , damageType =
                    { kind = "hole"
                    , holeId = "magic_item_ring_of_resistance_damage_type"
                    , label = "Damage Type (GM-determined at creation)"
                    , value =
                        { kind = "choice"
                        , label = "Damage Type (GM-determined at creation)"
                        , options =
                            [ "acid"
                            , "cold"
                            , "fire"
                            , "force"
                            , "lightning"
                            , "necrotic"
                            , "poison"
                            , "psychic"
                            , "radiant"
                            , "thunder"
                            ]
                        }
                    }
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  ring
