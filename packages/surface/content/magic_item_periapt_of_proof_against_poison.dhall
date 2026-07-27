let periapt =
      { kind = "magic_item"
      , id = "magic_item_periapt_of_proof_against_poison"
      , name = "Periapt of Proof against Poison"
      , rarity = "rare"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Magic-Items/Items-I-P.md#Periapt of Proof against Poison"
          }

      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_condition_immunity"
                , condition = Some "poisoned"
                , damageType = None Text
                }
              , { kind = "grant_damage_immunity"
                , condition = None Text
                , damageType = Some "poison"
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  periapt
