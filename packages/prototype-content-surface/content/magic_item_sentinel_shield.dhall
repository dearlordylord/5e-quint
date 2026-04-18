-- Sentinel Shield — SRD 5.2.1 magic item.
--
-- RAW: "While holding this Shield, you have Advantage on Initiative
-- rolls and Wisdom (Perception) checks."

let SkillFilter =
      { kind : Text
      , skills : List Text
      }

let sentinelShield =
      { kind = "magic_item"
      , id = "magic_item_sentinel_shield"
      , name = "Sentinel Shield"
      , rarity = "uncommon"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#Sentinel Shield"
          }
      , description =
          "While holding this Shield, you have Advantage on Initiative rolls and Wisdom (Perception) checks. The Shield is emblazoned with a symbol of an eye."
      , mechanics =
          { family = "passive"
          , condition = { kind = "holding_item" }
          , grants =
              [ { kind = "modify_roll_advantage"
                , mode = "advantage"
                , on = [ "initiative" ]
                , skillFilter = None SkillFilter
                }
              , { kind = "modify_roll_advantage"
                , mode = "advantage"
                , on = [ "ability_check" ]
                , skillFilter =
                    Some
                      { kind = "fixed"
                      , skills = [ "perception" ]
                      }
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  sentinelShield
