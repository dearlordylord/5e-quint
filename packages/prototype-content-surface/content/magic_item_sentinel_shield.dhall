-- Sentinel Shield — SRD 5.2.1 magic shield template.
let SkillFilter = { kind : Text, skills : List Text }

let Effect =
      { kind : Text
      , mode : Text
      , on : List Text
      , skillFilter : Optional SkillFilter
      }

let shield =
      { kind = "shield_template"
      , template = "shield_magic"
      , id = "magic_item_sentinel_shield"
      , name = "Sentinel Shield"
      , provenance =
        { kind = "srd-5.2.1", section = "MagicItems#SentinelShield" }
      , description =
          "While holding this Shield, you have Advantage on Initiative rolls and Wisdom (Perception) checks."
      , armorClassProjection =
        { kind = "trained_shield_bonus"
        , handUse = "shield"
        , trainingRequired = "shield"
        , bonus = 2
        }
      , weightPounds = 6
      , costGp = 10
      , donDoff.action = "utilize"
      , variants =
        [ { id = "magic_item_sentinel_shield"
          , name = "Sentinel Shield"
          , magic =
            { rarity = "uncommon"
            , attunement.requiresAttunement = False
            , mechanics =
              { family = "passive"
              , grants =
                [   { kind = "modify_roll_advantage"
                    , mode = "advantage"
                    , on = [ "initiative" ]
                    , skillFilter = None SkillFilter
                    }
                  : Effect
                ,   { kind = "modify_roll_advantage"
                    , mode = "advantage"
                    , on = [ "ability_check" ]
                    , skillFilter = Some
                      { kind = "fixed", skills = [ "perception" ] }
                    }
                  : Effect
                ]
              }
            , destruction.kind = "none"
            }
          }
        ]
      }

in  shield
