-- Mislead - SRD 5.2.1 Spell, level 5, Illusion.

let mislead =
      { kind = "spell"
      , id = "mislead"
      , name = "Mislead"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Mislead"
          }
      , description =
          "You gain the Invisible condition while an illusory double appears where you stand. The double lasts for the duration, but the invisibility ends immediately after you make an attack roll, deal damage, or cast a spell. As a Magic action, you can move the double up to twice your Speed and make it gesture, speak, and behave as you choose. It is intangible and invulnerable. You can see through its eyes and hear through its ears as if you were located where it is."
      , mechanics =
          { family = "activation"
          , level = 5
          , school = "illusion"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components = { v = False, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "hour", amount = 1 }
              , earlyEnd =
                  [ { kind = "target_makes_attack_roll" }
                  , { kind = "target_deals_damage" }
                  , { kind = "target_casts_spell" }
                  ]
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "apply_condition"
                      , condition = "invisible"
                      }
                    ]
                }
              ]
          }
      }

in  mislead
