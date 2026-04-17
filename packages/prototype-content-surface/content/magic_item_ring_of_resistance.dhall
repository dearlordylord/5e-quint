let ring =
      { kind = "magic_item"
      , id = "magic_item_ring_of_resistance"
      , name = "Ring of Resistance"
      , rarity = "rare"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#Ring of Resistance"
          }
      , description =
          "You have Resistance to one damage type while wearing this ring. The gemstone in the ring indicates the type, which the GM chooses or determines randomly by rolling on a table."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_resistance"
                , damageType =
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
              ]
          }
      , destruction = { kind = "none" }
      }

in  ring
